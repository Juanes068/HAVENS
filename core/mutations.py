"""Havens GraphQL Mutation Definitions.

This module encapsulates all write operations (mutations) for the Havens platform,
including user registration with invite codes, community onboarding, event creation
and RSVP workflows, friend requests, match making, 1-on-1 messaging, direct cloud
media uploads (Cloudinary & S3), and account security management.

Design Conventions:
    - Each mutation inherits from `graphene.Mutation` with a nested `Arguments` class.
    - Resolvers are implemented via `@classmethod def mutate(...)`.
    - Protected mutations apply the `@login_required` decorator.
    - Operations modifying multiple interrelated models use `@transaction.atomic`.
    - Asynchronous workflows (such as welcome emails) are offloaded to Celery tasks.
"""

import graphene
import graphql_jwt
from django.contrib.auth.models import User
from django.db import transaction, models as django_models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from graphql import GraphQLError
from .types import (
    UserType, CommunityType, EventType, TicketType, ParticipationType,
    InvitationCodeType, CommunityMembershipType, EventRSVPType,
    FriendshipType, MatchType, MessageType,
)
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    InvitationCode, CommunityMembership, EventRSVP, Friendship,
    Match, Message, HobbyCategory, Hobby,
)
from .decorators import login_required
import logging

logger = logging.getLogger(__name__)

from .tasks import send_welcome_email_task, send_welcome_email


# ─────────────────────────────────────────────────────────────────────────────
# Feature 7 + 1: Create User (requires invitation code)
# ─────────────────────────────────────────────────────────────────────────────
class CreateUser(graphene.Mutation):
    """Register a new user account with an active invitation code and initialize profile."""

    class Arguments:
        username = graphene.String(required=True, description="Unique username for the new account.")
        email = graphene.String(required=True, description="Valid unique email address.")
        password = graphene.String(required=True, description="Raw password to be hashed by Django.")
        invitation_code = graphene.String(required=True, description="Unused 12-character invitation code.")
        terms_accepted = graphene.Boolean(required=True, description="Explicit acceptance of Terms and Conditions (mandatory).")
        bio = graphene.String(default_value='', description="Short introductory bio.")
        neighbourhood = graphene.String(default_value='', description="Local neighborhood or district.")
        city_name = graphene.String(default_value='', description="City name for geolocation tagging.")
        latitude = graphene.Float(description="User latitude coordinate.")
        longitude = graphene.Float(description="User longitude coordinate.")
        photo_url = graphene.String(default_value='', description="Profile image URL (Cloudinary/S3).")
        date_of_birth = graphene.Date(required=False, description="User date of birth.")

    user = graphene.Field(UserType, description="The newly created User entity.")
    success = graphene.Boolean(description="Indicates if account creation succeeded.")
    message = graphene.String(description="Status or error message.")

    @classmethod
    def mutate(cls, root, info, username, email, password, invitation_code, terms_accepted,
               bio='', neighbourhood='', city_name='', latitude=None, longitude=None, photo_url='', date_of_birth=None):
        """Execute user creation, link profile, mark invite as used, and queue welcome email."""
        # 0. Backend Validation: Enforce Terms and Conditions acceptance at the API level
        if not terms_accepted:
            raise GraphQLError("You must accept the Terms and Conditions to create an account.")

        if date_of_birth:
            today = timezone.now().date()
            calculated_age = today.year - date_of_birth.year - (
                (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
            )
            if calculated_age < 14:
                return cls(user=None, success=False, message="You must be at least 14 years old to join Havens.")

        try:
            # 1. Validate invitation code existence and ensure it has not been redeemed yet
            try:
                invite = InvitationCode.objects.get(code=invitation_code, is_used=False)
            except InvitationCode.DoesNotExist:
                return cls(user=None, success=False, message="Invalid or already used invitation code")

            # 2. Check for unique credential collisions
            if User.objects.filter(username=username).exists():
                return cls(user=None, success=False, message="Username already exists")
            if User.objects.filter(email=email).exists():
                return cls(user=None, success=False, message="Email already exists")

            # 3. Create core Django auth User with securely hashed password
            user = User.objects.create_user(username=username, email=email, password=password)

            # 4. Mark invitation code as redeemed and bind to the new user
            invite.is_used = True
            invite.used_by = user
            invite.used_at = timezone.now()
            invite.save()

            # 5. Create extended profile with location, DOB, and avatar metadata
            UserProfile.objects.create(
                user=user,
                bio=bio,
                date_of_birth=date_of_birth,
                neighbourhood=neighbourhood,
                city_name=city_name,
                latitude=latitude,
                longitude=longitude,
                photo_url=photo_url,
            )

            # 6. Dispatch non-blocking welcome email via Celery worker
            try:
                send_welcome_email_task.delay(user.email, user.username)
                logger.info(f"[CreateUser] Queued welcome email task for {user.email}")
            except Exception as celery_err:
                logger.warning(f"[CreateUser] Could not queue Celery welcome email for {user.email}: {celery_err}")

            return cls(user=user, success=True, message="User created successfully")
        except Exception as e:
            return cls(user=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1: Generate Invitation Code
# ─────────────────────────────────────────────────────────────────────────────
class GenerateInvite(graphene.Mutation):
    """Generate a unique 12-character invitation code for onboarding other users."""

    invitation = graphene.Field(InvitationCodeType, description="The generated InvitationCode record.")
    success = graphene.Boolean(description="Indicates if generation succeeded.")
    message = graphene.String(description="Status description.")

    @classmethod
    @login_required
    def mutate(cls, root, info):
        """Create a new unredeemed InvitationCode linked to the authenticated user.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context with authenticated user.

        Returns:
            GenerateInvite: Mutation payload with `invitation`, `success`, and `message`.
        """
        try:
            user = info.context.user
            invite = InvitationCode.objects.create(created_by=user)
            return cls(invitation=invite, success=True, message="Invitation code generated")
        except Exception as e:
            return cls(invitation=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2: Join Community
# ─────────────────────────────────────────────────────────────────────────────
class JoinCommunity(graphene.Mutation):
    """Add the authenticated user as an active member of a specified community."""

    class Arguments:
        community_id = graphene.Int(required=True, description="Primary key ID of the target community.")

    membership = graphene.Field(CommunityMembershipType, description="Created CommunityMembership record.")
    success = graphene.Boolean(description="Indicates if join operation succeeded.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, community_id):
        """Create membership link between the user and target community.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            community_id (int): ID of community to join.

        Returns:
            JoinCommunity: Mutation payload.
        """
        try:
            user = info.context.user
            community = Community.objects.get(id=community_id)

            # Prevent duplicate memberships
            if CommunityMembership.objects.filter(user=user, community=community).exists():
                return cls(membership=None, success=False, message="Already a member of this community")

            membership = CommunityMembership.objects.create(user=user, community=community)
            return cls(membership=membership, success=True, message=f"Joined {community.name}")
        except Community.DoesNotExist:
            return cls(membership=None, success=False, message="Community not found")
        except Exception as e:
            return cls(membership=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3: Send Friend Request
# ─────────────────────────────────────────────────────────────────────────────
class SendFriendRequest(graphene.Mutation):
    """Send an initial pending friend request to another user."""

    class Arguments:
        to_user_id = graphene.Int(required=True, description="Target user ID to invite as a friend.")

    friendship = graphene.Field(FriendshipType, description="The created Friendship record in pending state.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status or error message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, to_user_id):
        """Create a pending Friendship record after verifying relationship constraints.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            to_user_id (int): Primary key of the recipient user.

        Returns:
            SendFriendRequest: Mutation payload.
        """
        try:
            from_user = info.context.user
            to_user = User.objects.get(id=to_user_id)

            # Prevent self-friending
            if from_user.id == to_user.id:
                return cls(friendship=None, success=False, message="Cannot send friend request to yourself")

            # Check for existing friendship in either direction (from -> to OR to -> from)
            existing = Friendship.objects.filter(
                from_user=from_user, to_user=to_user
            ).first() or Friendship.objects.filter(
                from_user=to_user, to_user=from_user
            ).first()

            if existing:
                return cls(friendship=None, success=False, message="Friend request already exists or you are already friends")

            friendship = Friendship.objects.create(from_user=from_user, to_user=to_user, status='pending')
            return cls(friendship=friendship, success=True, message="Friend request sent")
        except User.DoesNotExist:
            return cls(friendship=None, success=False, message="User not found")
        except Exception as e:
            return cls(friendship=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3: Respond to Friend Request
# ─────────────────────────────────────────────────────────────────────────────
class RespondFriendRequest(graphene.Mutation):
    """Accept or reject an incoming pending friend request."""

    class Arguments:
        friendship_id = graphene.Int(required=True, description="Primary key of the Friendship record.")
        action = graphene.String(required=True, description="'accept' or 'reject'")

    friendship = graphene.Field(FriendshipType, description="Updated Friendship entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, friendship_id, action):
        """Transition friendship status to accepted or rejected.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            friendship_id (int): ID of pending friendship.
            action (str): Action verb ('accept' or 'reject').

        Returns:
            RespondFriendRequest: Mutation payload.
        """
        try:
            user = info.context.user
            # Ensure the caller is the recipient (to_user) of the pending request
            friendship = Friendship.objects.get(id=friendship_id, to_user=user, status='pending')

            if action.lower() == 'accept':
                friendship.status = 'accepted'
                friendship.save()
                return cls(friendship=friendship, success=True, message="Friend request accepted")
            elif action.lower() == 'reject':
                friendship.status = 'rejected'
                friendship.save()
                return cls(friendship=friendship, success=True, message="Friend request rejected")
            else:
                return cls(friendship=None, success=False, message="Invalid action. Use 'accept' or 'reject'")
        except Friendship.DoesNotExist:
            return cls(friendship=None, success=False, message="Friend request not found")
        except Exception as e:
            return cls(friendship=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4: Swipe Event (RSVP)
# ─────────────────────────────────────────────────────────────────────────────
class SwipeEvent(graphene.Mutation):
    """Record or update a user's swipe RSVP response for an event ('going', 'maybe', 'pass')."""

    class Arguments:
        event_id = graphene.Int(required=True, description="Primary key of the event.")
        response = graphene.String(required=True, description="Response choice: 'going', 'maybe', or 'pass'.")

    rsvp = graphene.Field(EventRSVPType, description="Created or updated EventRSVP record.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, event_id, response):
        """Create or update RSVP response for the target event.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            event_id (int): ID of target event.
            response (str): One of 'going', 'maybe', 'pass'.

        Returns:
            SwipeEvent: Mutation payload.
        """
        try:
            user = info.context.user
            event = Event.objects.get(id=event_id)

            if response not in ('going', 'maybe', 'pass'):
                return cls(rsvp=None, success=False, message="Invalid response. Use 'going', 'maybe', or 'pass'")

            # Upsert RSVP status
            rsvp, created = EventRSVP.objects.update_or_create(
                user=user, event=event,
                defaults={'response': response},
            )

            msg = "RSVP recorded" if created else "RSVP updated"
            return cls(rsvp=rsvp, success=True, message=msg)
        except Event.DoesNotExist:
            return cls(rsvp=None, success=False, message="Event not found")
        except Exception as e:
            return cls(rsvp=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 5: Connect Requests & Matches (Async Matching Engine)
# ─────────────────────────────────────────────────────────────────────────────
class SendConnectRequest(graphene.Mutation):
    """Initiate an async connection request with another user (creates pending match)."""

    class Arguments:
        to_user_id = graphene.Int(required=False, description="Target user ID to connect with.")
        user2_id = graphene.Int(required=False, description="Alias for to_user_id.")

    match = graphene.Field(MatchType, description="Match entity (status: pending, accepted, or rejected).")
    success = graphene.Boolean(description="Indicates whether the request was processed successfully.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, to_user_id=None, user2_id=None):
        """Send connection request or mutually accept if reciprocal request already exists."""
        target_id = to_user_id if to_user_id is not None else user2_id
        if not target_id:
            return cls(match=None, success=False, message="Target user ID is required.")

        try:
            current_user = info.context.user
            target_user = User.objects.get(id=target_id)

            if current_user.id == target_user.id:
                return cls(match=None, success=False, message="Cannot connect with yourself.")

            # Canonical order for user1 and user2
            u1, u2 = (current_user, target_user) if current_user.id < target_user.id else (target_user, current_user)

            match = Match.objects.filter(user1=u1, user2=u2).first()

            if match:
                if match.status == 'accepted':
                    return cls(match=match, success=True, message="You are already connected with this user.")
                elif match.status == 'pending':
                    if match.initiator == current_user:
                        return cls(match=match, success=True, message="Connection request already sent.")
                    else:
                        # Mutual match! The other user had sent a request; automatically accept it
                        match.status = 'accepted'
                        match.save()
                        return cls(match=match, success=True, message="Mutual match! Connection accepted.")
                elif match.status == 'rejected':
                    match.status = 'pending'
                    match.initiator = current_user
                    match.save()
                    return cls(match=match, success=True, message="Connection request sent.")
            else:
                match = Match.objects.create(
                    user1=u1,
                    user2=u2,
                    initiator=current_user,
                    status='pending',
                )
                return cls(match=match, success=True, message="Connection request sent.")
        except User.DoesNotExist:
            return cls(match=None, success=False, message="Target user not found.")
        except Exception as e:
            return cls(match=None, success=False, message=str(e))


class RespondConnectRequest(graphene.Mutation):
    """Accept or decline an incoming connection request."""

    class Arguments:
        match_id = graphene.Int(required=False, description="Primary key ID of the Match record.")
        from_user_id = graphene.Int(required=False, description="User ID who sent the connection request.")
        action = graphene.String(required=True, description="Action: 'accept' or 'reject' / 'decline'.")

    match = graphene.Field(MatchType, description="The updated Match entity.")
    success = graphene.Boolean(description="Indicates whether the response succeeded.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, action, match_id=None, from_user_id=None):
        """Update match status to accepted or rejected."""
        try:
            current_user = info.context.user
            action_clean = action.strip().lower()

            if action_clean in ('accept', 'accepted'):
                new_status = 'accepted'
            elif action_clean in ('reject', 'rejected', 'decline', 'declined'):
                new_status = 'rejected'
            else:
                return cls(match=None, success=False, message="Invalid action. Use 'accept' or 'reject'.")

            # Retrieve the match by ID or sender ID
            match = None
            if match_id is not None:
                match = Match.objects.filter(
                    id=match_id
                ).filter(
                    django_models.Q(user1=current_user) | django_models.Q(user2=current_user)
                ).first()
            elif from_user_id is not None:
                other_user = User.objects.get(id=from_user_id)
                u1, u2 = (current_user, other_user) if current_user.id < other_user.id else (other_user, current_user)
                match = Match.objects.filter(user1=u1, user2=u2).first()

            if not match:
                return cls(match=None, success=False, message="Connection request not found.")

            # Validate that caller is the recipient when match is pending
            if match.initiator == current_user and match.status == 'pending':
                return cls(match=match, success=False, message="Cannot respond to your own outgoing connection request.")

            match.status = new_status
            match.save()

            msg = "Connection accepted! You are now connected." if new_status == 'accepted' else "Connection declined."
            return cls(match=match, success=True, message=msg)
        except User.DoesNotExist:
            return cls(match=None, success=False, message="User not found.")
        except Exception as e:
            return cls(match=None, success=False, message=str(e))


class CreateMatch(graphene.Mutation):
    """Establish or request a match pair between two users (delegates to SendConnectRequest)."""

    class Arguments:
        user2_id = graphene.Int(required=True, description="Target user ID to match with.")

    match = graphene.Field(MatchType, description="Created or updated Match entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, user2_id):
        res = SendConnectRequest.mutate(root, info, to_user_id=user2_id)
        return cls(match=res.match, success=res.success, message=res.message)


# ─────────────────────────────────────────────────────────────────────────────
# Feature 5: Send Message
# ─────────────────────────────────────────────────────────────────────────────
class SendMessage(graphene.Mutation):
    """Send a chat message within an established 1-on-1 match thread."""

    class Arguments:
        match_id = graphene.Int(required=True, description="Primary key ID of the active Match.")
        content = graphene.String(required=True, description="Message text content.")

    message = graphene.Field(MessageType, description="Created Message object.")
    success = graphene.Boolean(description="Indicates success.")
    message_field = graphene.String(description="Status message description (aliased to avoid GraphQL conflict).")

    @classmethod
    @login_required
    def mutate(cls, root, info, match_id, content):
        """Validate match membership and append message to thread.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            match_id (int): ID of target match.
            content (str): Message text.

        Returns:
            SendMessage: Mutation payload.
        """
        sender = info.context.user
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            return cls(message=None, success=False, message_field="Match not found")

        # Security check: ensure caller is one of the match participants
        if sender != match.user1 and sender != match.user2:
            raise GraphQLError("You are not part of this match")

        try:
            msg = Message.objects.create(match=match, sender=sender, content=content)
            return cls(message=msg, success=True, message_field="Message sent")
        except Exception as e:
            return cls(message=None, success=False, message_field=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6: Presigned URL for AWS S3
# ─────────────────────────────────────────────────────────────────────────────
class PresignedURL(graphene.Mutation):
    """Generate a presigned POST upload URL for direct AWS S3 client uploads."""

    class Arguments:
        filename = graphene.String(required=True, description="Target file name with extension.")
        content_type = graphene.String(default_value='image/jpeg', description="MIME type.")

    url = graphene.String(description="S3 Presigned POST URL.")
    fields = graphene.JSONString(description="Form fields and authentication payload for S3 POST.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, filename, content_type='image/jpeg'):
        """Construct AWS S3 presigned credentials for direct multipart uploads.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            filename (str): Name of file to upload.
            content_type (str, optional): MIME content type.

        Returns:
            PresignedURL: Mutation payload with S3 endpoint and fields.
        """
        import uuid
        import os

        # Check if boto3 is available (optional dependency)
        try:
            import boto3
        except ImportError:
            return cls(
                url=None, fields=None, success=False,
                message="boto3 is not installed. Install with: pip install boto3"
            )

        try:
            bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
            region = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
            access_key = os.getenv('AWS_ACCESS_KEY_ID')
            secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')

            if not bucket_name:
                return cls(
                    url=None, fields=None, success=False,
                    message="AWS_STORAGE_BUCKET_NAME not configured in environment"
                )

            s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
            )

            # Generate unique key in S3 with UUID prefix
            key = f"uploads/{uuid.uuid4()}/{filename}"

            presigned = s3_client.generate_presigned_post(
                Bucket=bucket_name,
                Key=key,
                Fields={'Content-Type': content_type},
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 0, 10485760],  # max 10MB limit
                ],
                ExpiresIn=300,  # 5 minutes expiration TTL
            )

            return cls(
                url=presigned['url'],
                fields=presigned['fields'],
                success=True,
                message=f"Upload to {key}. URL expires in 5 minutes.",
            )
        except Exception as e:
            return cls(url=None, fields=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 7: Update User Profile
# ─────────────────────────────────────────────────────────────────────────────
class UpdateUserProfile(graphene.Mutation):
    """Update profile bio, date of birth, neighbourhood, and avatar URL for the authenticated user."""

    class Arguments:
        bio = graphene.String(description="User bio text.")
        neighbourhood = graphene.String(description="Neighborhood name.")
        city_name = graphene.String(description="City name.")
        cityName = graphene.String(description="City name camelCase alias.")
        photo_url = graphene.String(description="Profile avatar image URL.")
        photoUrl = graphene.String(description="Profile avatar image URL camelCase alias.")
        date_of_birth = graphene.Date(description="Date of birth.")
        dateOfBirth = graphene.Date(description="Date of birth camelCase alias.")

    profile = graphene.Field(UserType, description="Updated User entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, bio=None, neighbourhood=None, city_name=None, cityName=None,
               photo_url=None, photoUrl=None, date_of_birth=None, dateOfBirth=None):
        """Update UserProfile fields with 14+ age validation."""
        try:
            user = info.context.user
            profile, _ = UserProfile.objects.get_or_create(user=user)

            dob = date_of_birth if date_of_birth is not None else dateOfBirth
            if dob is not None:
                today = timezone.now().date()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                if age < 14:
                    return cls(
                        profile=None,
                        success=False,
                        message="Age validation failed: You must be at least 14 years old to join Havens."
                    )
                profile.date_of_birth = dob

            if bio is not None:
                profile.bio = bio.strip()
            if neighbourhood is not None:
                profile.neighbourhood = neighbourhood.strip()
            city = city_name if city_name is not None else cityName
            if city is not None:
                profile.city_name = city.strip()
            avatar = photo_url if photo_url is not None else photoUrl
            if avatar is not None:
                profile.photo_url = avatar.strip()

            profile.save()
            return cls(profile=user, success=True, message="Profile updated successfully")
        except Exception as e:
            return cls(profile=None, success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Community & Event Management Mutations
# ─────────────────────────────────────────────────────────────────────────────
class CreateCommunity(graphene.Mutation):
    """Create a new Circle / Community entity with taxonomy and cover image."""

    class Arguments:
        name = graphene.String(required=True, description="Community display title.")
        subdomain = graphene.String(required=False, description="Unique subdomain slug. Auto-generated if omitted.")
        description = graphene.String(required=False, default_value="", description="Detailed circle description.")
        locationName = graphene.String(required=False, default_value="", description="Location or neighbourhood name.")
        latitude = graphene.Float(required=False, description="Location latitude coordinate.")
        longitude = graphene.Float(required=False, description="Location longitude coordinate.")
        isVirtual = graphene.Boolean(required=False, default_value=False, description="True if circle is a virtual group with no physical coordinates.")
        imageUrl = graphene.String(required=False, default_value="", description="Cloudinary cover image URL.")
        ageRange = graphene.String(required=False, default_value="All Ages", description="Target age bracket.")
        minAge = graphene.Int(required=False, description="Minimum recommended age limit.")
        maxAge = graphene.Int(required=False, description="Maximum recommended age limit.")
        hobbyIds = graphene.List(graphene.Int, required=False, description="List of associated Hobby IDs.")

    community = graphene.Field(CommunityType, description="The created Community record.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, name, subdomain=None, description="", locationName="",
               latitude=None, longitude=None, isVirtual=False, imageUrl="", ageRange="All Ages",
               minAge=None, maxAge=None, hobbyIds=None):
        """Create a new circle, set creator, associate hobbies, and auto-join creator."""
        try:
            user = info.context.user

            # Strict 3-circle creation limit validation
            if user and user.is_authenticated:
                created_count = Community.objects.filter(creator=user).count()
                if created_count >= Community.MAX_CIRCLES_PER_USER:
                    return cls(
                        community=None,
                        success=False,
                        message=f"Circle creation limit reached. You can create a maximum of {Community.MAX_CIRCLES_PER_USER} Circles."
                    )

            # Generate or clean subdomain slug
            if subdomain and subdomain.strip():
                slug = slugify(subdomain.strip())
            else:
                base_slug = slugify(name.strip()) or 'circle'
                slug = base_slug
                counter = 1
                while Community.objects.filter(subdomain=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1

            if Community.objects.filter(subdomain=slug).exists():
                return cls(community=None, success=False, message="A circle with this subdomain or slug already exists.")

            final_lat = None if isVirtual else latitude
            final_lng = None if isVirtual else longitude
            final_loc_name = "Virtual Group" if (isVirtual and not locationName.strip()) else locationName.strip()

            community = Community.objects.create(
                name=name.strip(),
                subdomain=slug,
                description=description.strip() if description else "",
                location_name=final_loc_name,
                latitude=final_lat,
                longitude=final_lng,
                is_virtual=isVirtual,
                image_url=imageUrl.strip() if imageUrl else "",
                age_range=ageRange.strip() if ageRange else "All Ages",
                min_age=minAge,
                max_age=maxAge,
                creator=user if user and user.is_authenticated else None,
            )

            # Associate hobby tags
            if hobbyIds:
                hobbies = Hobby.objects.filter(id__in=hobbyIds)
                community.hobbies.set(hobbies)

            # Automatically add creator as a member of the new circle
            if user and user.is_authenticated:
                CommunityMembership.objects.get_or_create(user=user, community=community)

            return cls(community=community, success=True, message=f"Circle '{community.name}' created successfully!")
        except Exception as e:
            return cls(community=None, success=False, message=str(e))


class DeleteCommunity(graphene.Mutation):
    """Permanently delete a circle/community. Allowed only for the creator or staff."""

    class Arguments:
        id = graphene.Int(required=False, description="Primary key ID of the circle to delete.")
        communityId = graphene.Int(required=False, description="Alias for id.")

    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")
    deletedCircleId = graphene.Int(description="Primary key ID of the deleted circle.")

    @classmethod
    @login_required
    def mutate(cls, root, info, id=None, communityId=None):
        target_id = id if id is not None else communityId
        if not target_id:
            return cls(success=False, message="Circle ID is required.", deletedCircleId=None)

        try:
            user = info.context.user
            community = Community.objects.get(id=target_id)

            # Security check: Caller must be the circle's creator or staff
            if community.creator != user and not user.is_staff:
                return cls(
                    success=False,
                    message="Permission denied. You can only delete circles that you created.",
                    deletedCircleId=None
                )

            circle_name = community.name
            circle_id = community.id
            community.delete()

            return cls(
                success=True,
                message=f"Circle '{circle_name}' was deleted successfully. Your circle quota has been updated.",
                deletedCircleId=circle_id
            )
        except Community.DoesNotExist:
            return cls(success=False, message="Circle not found.", deletedCircleId=None)
        except Exception as e:
            return cls(success=False, message=str(e), deletedCircleId=None)


class UpdateCommunity(graphene.Mutation):
    """Update circle details (name, description, location, virtual status, image, age range, hobbies).
    Allowed only for the creator of the circle or staff."""

    class Arguments:
        id = graphene.Int(required=False, description="Circle database ID.")
        communityId = graphene.Int(required=False, description="Alias for id.")
        name = graphene.String(required=False, description="Updated circle title.")
        description = graphene.String(required=False, description="Updated circle description.")
        locationName = graphene.String(required=False, description="Updated location name.")
        latitude = graphene.Float(required=False, description="Updated latitude.")
        longitude = graphene.Float(required=False, description="Updated longitude.")
        isVirtual = graphene.Boolean(required=False, description="Updated virtual flag.")
        imageUrl = graphene.String(required=False, description="Updated cover photo URL.")
        ageRange = graphene.String(required=False, description="Updated age range.")
        minAge = graphene.Int(required=False, description="Updated min age.")
        maxAge = graphene.Int(required=False, description="Updated max age.")
        hobbyIds = graphene.List(graphene.Int, required=False, description="Updated hobby IDs.")

    community = graphene.Field(CommunityType, description="The updated Community record.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, id=None, communityId=None, name=None, description=None,
               locationName=None, latitude=None, longitude=None, isVirtual=None, imageUrl=None,
               ageRange=None, minAge=None, maxAge=None, hobbyIds=None):
        target_id = id if id is not None else communityId
        if not target_id:
            return cls(community=None, success=False, message="Circle ID is required.")

        try:
            user = info.context.user
            community = Community.objects.get(id=target_id)

            # Security check: Caller must be the circle's creator or staff
            if community.creator != user and not user.is_staff:
                return cls(
                    community=None,
                    success=False,
                    message="Permission denied. You can only edit circles that you created."
                )

            if name is not None and name.strip():
                community.name = name.strip()

            if description is not None:
                community.description = description.strip()

            if isVirtual is not None:
                community.is_virtual = isVirtual
                if isVirtual:
                    community.latitude = None
                    community.longitude = None
                    community.location_name = "Virtual Group"
                else:
                    if latitude is not None:
                        community.latitude = latitude
                    if longitude is not None:
                        community.longitude = longitude
                    if locationName is not None and locationName.strip():
                        community.location_name = locationName.strip()
            else:
                if latitude is not None:
                    community.latitude = latitude
                if longitude is not None:
                    community.longitude = longitude
                if locationName is not None and locationName.strip():
                    community.location_name = locationName.strip()

            if imageUrl is not None:
                community.image_url = imageUrl.strip()

            if ageRange is not None:
                community.age_range = ageRange.strip() if ageRange.strip() else "All Ages"

            if minAge is not None:
                community.min_age = minAge
            if maxAge is not None:
                community.max_age = maxAge

            community.save()

            if hobbyIds is not None:
                hobbies = Hobby.objects.filter(id__in=hobbyIds)
                community.hobbies.set(hobbies)

            return cls(
                community=community,
                success=True,
                message=f"Circle '{community.name}' updated successfully!"
            )
        except Community.DoesNotExist:
            return cls(community=None, success=False, message="Circle not found.")
        except Exception as e:
            return cls(community=None, success=False, message=str(e))


class RemoveCommunityMember(graphene.Mutation):
    """Remove a member from a Circle. Can be performed by the Circle creator, staff, or the member themselves."""

    class Arguments:
        community_id = graphene.Int(required=True, description="Primary key ID of the target Circle/Community.")
        user_id = graphene.Int(required=True, description="Primary key ID of the user to remove.")

    success = graphene.Boolean(description="Indicates if removal was successful.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, community_id, user_id):
        try:
            current_user = info.context.user
            community = Community.objects.get(id=community_id)
            target_user = User.objects.get(id=user_id)

            # Verification: Circle creator, staff, or the user themselves
            is_creator = community.creator == current_user
            is_self = current_user == target_user
            if not (is_creator or is_self or current_user.is_staff):
                return cls(success=False, message="Permission denied. Only the Circle creator can remove members.")

            if community.creator == target_user and not is_self:
                return cls(success=False, message="Cannot remove the Circle creator from their own Circle.")

            membership = CommunityMembership.objects.filter(user=target_user, community=community).first()
            if not membership:
                return cls(success=False, message="User is not a member of this Circle.")

            membership.delete()
            return cls(success=True, message=f"@{target_user.username} was removed from {community.name}.")
        except Community.DoesNotExist:
            return cls(success=False, message="Circle not found.")
        except User.DoesNotExist:
            return cls(success=False, message="User not found.")
        except Exception as e:
            return cls(success=False, message=str(e))


class CreateEvent(graphene.Mutation):
    """Create a new event/meetup on the Havens platform."""

    class Arguments:
        title = graphene.String(required=True, description="Event title.")
        description = graphene.String(required=True, description="Event description and details.")
        latitude = graphene.Float(required=True, description="Location latitude coordinate.")
        longitude = graphene.Float(required=True, description="Location longitude coordinate.")
        communityId = graphene.Int(description="Optional community primary key ID.")
        pointsReward = graphene.Int(default_value=10, description="Gamification points awarded upon attendance.")
        visibility = graphene.String(default_value='public', description="Visibility ('public', 'private', 'community').")
        imageUrl = graphene.String(description="Cover image URL.")
        locationName = graphene.String(description="Human-readable venue name or address.")
        scheduledDate = graphene.DateTime(description="ISO-8601 scheduled start timestamp.")
        ageRange = graphene.String(required=False, default_value='All Ages', description="Allowed age range (e.g. '18-25', '21+', 'All Ages').")
        minAge = graphene.Int(required=False, description="Minimum age allowed.")
        maxAge = graphene.Int(required=False, description="Maximum age allowed.")
        hobbyIds = graphene.List(graphene.Int, required=False, description="Array of associated Hobby IDs.")

    event = graphene.Field(EventType, description="The created Event entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status or validation error message.")

    # Allowed visibility choices from Event model definitions
    VALID_VISIBILITY = {'public', 'friends_only', 'community_only', 'community', 'private'}

    @classmethod
    @login_required
    def mutate(cls, root, info, title, description, latitude, longitude,
               communityId=None, pointsReward=10, visibility='public',
               imageUrl=None, locationName=None, scheduledDate=None,
               ageRange='All Ages', minAge=None, maxAge=None, hobbyIds=None):
        """Validate input parameters and create Event record."""
        try:
            vis_normalized = 'community_only' if visibility in ['community', 'community_only', 'circle'] else visibility
            # Validate visibility choice against model constraints
            if vis_normalized not in {'public', 'friends_only', 'community_only', 'private'}:
                vis_normalized = 'public'

            # Validate that scheduled date is not set in the past
            event_date = scheduledDate or timezone.now()
            if scheduledDate and scheduledDate < timezone.now():
                return cls(event=None, success=False,
                           message="Cannot create an event with a date in the past.")

            user = info.context.user
            community = Community.objects.get(id=communityId) if communityId else None
            if community and vis_normalized != 'public':
                vis_normalized = 'community_only'

            event = Event.objects.create(
                title=title.strip(),
                description=description.strip() if description else '',
                latitude=latitude,
                longitude=longitude,
                community=community,
                creator=user,
                points_reward=pointsReward,
                visibility=vis_normalized,
                image_url=imageUrl.strip() if imageUrl else None,
                location_name=locationName or '',
                scheduled_date=event_date,
                age_range=ageRange.strip() if ageRange else 'All Ages',
                min_age=minAge,
                max_age=maxAge,
            )

            if hobbyIds:
                hobbies = Hobby.objects.filter(id__in=hobbyIds)
                event.hobbies.set(hobbies)

            return cls(event=event, success=True, message="Event created successfully")
        except Community.DoesNotExist:
            return cls(event=None, success=False, message="Community not found")
        except Exception as e:
            return cls(event=None, success=False, message=str(e))


class UpdateEvent(graphene.Mutation):
    """Modify details of an event created by the authenticated user."""

    class Arguments:
        id = graphene.Int(required=True, description="Primary key ID of the event to edit.")
        title = graphene.String(required=False, description="Event title.")
        description = graphene.String(required=False, description="Event description.")
        latitude = graphene.Float(required=False, description="Location latitude.")
        longitude = graphene.Float(required=False, description="Location longitude.")
        locationName = graphene.String(required=False, description="Venue or location name.")
        scheduledDate = graphene.DateTime(required=False, description="Scheduled start time.")
        visibility = graphene.String(required=False, description="Event visibility.")
        imageUrl = graphene.String(required=False, description="Event cover image URL.")
        ageRange = graphene.String(required=False, description="Allowed age range (e.g. '18-25', '21+', 'All Ages').")
        minAge = graphene.Int(required=False, description="Minimum age.")
        maxAge = graphene.Int(required=False, description="Maximum age.")
        pointsReward = graphene.Int(required=False, description="Reward points.")
        communityId = graphene.Int(required=False, description="Community ID.")
        hobbyIds = graphene.List(graphene.Int, required=False, description="Hobby tag IDs.")

    event = graphene.Field(EventType, description="The updated Event entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status or error message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, id, title=None, description=None, latitude=None, longitude=None,
               locationName=None, scheduledDate=None, visibility=None, imageUrl=None,
               ageRange=None, minAge=None, maxAge=None, pointsReward=None, communityId=None, hobbyIds=None):
        """Update existing event details after verifying ownership."""
        try:
            user = info.context.user
            event = Event.objects.get(id=id)

            # Security check: creator or staff only
            if event.creator != user and not user.is_staff:
                return cls(event=None, success=False, message="Permission denied. You can only modify events you created.")

            if title is not None and title.strip():
                event.title = title.strip()
            if description is not None:
                event.description = description.strip()
            if latitude is not None:
                event.latitude = latitude
            if longitude is not None:
                event.longitude = longitude
            if locationName is not None:
                event.location_name = locationName.strip()
            if scheduledDate is not None:
                event.scheduled_date = scheduledDate
            if visibility is not None and visibility in {v[0] for v in Event.VISIBILITY_CHOICES}:
                event.visibility = visibility
            if imageUrl is not None:
                event.image_url = imageUrl.strip() if imageUrl else None
            if ageRange is not None:
                event.age_range = ageRange.strip() or 'All Ages'
            if minAge is not None:
                event.min_age = minAge
            if maxAge is not None:
                event.max_age = maxAge
            if pointsReward is not None:
                event.points_reward = pointsReward
            if communityId is not None:
                event.community = Community.objects.filter(id=communityId).first()

            event.save()

            if hobbyIds is not None:
                hobbies = Hobby.objects.filter(id__in=hobbyIds)
                event.hobbies.set(hobbies)

            return cls(event=event, success=True, message="Event updated successfully.")
        except Event.DoesNotExist:
            return cls(event=None, success=False, message="Event not found.")
        except Exception as e:
            return cls(event=None, success=False, message=str(e))


class DeleteEvent(graphene.Mutation):
    """Delete an event created by the authenticated user."""

    class Arguments:
        id = graphene.Int(required=True, description="Primary key ID of the event to delete.")

    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, id):
        """Verify event ownership and delete record."""
        try:
            user = info.context.user
            # Ensure only the event creator can delete the event
            event = Event.objects.get(id=id, creator=user)
            event.delete()
            return cls(success=True, message="Event deleted successfully")
        except Event.DoesNotExist:
            return cls(success=False, message="Event not found or permission denied")
        except Exception as e:
            return cls(success=False, message=str(e))


class ConfirmAttendance(graphene.Mutation):
    """Confirm event attendance: atomically creates Ticket and Participation records, and credits reward points."""

    class Arguments:
        user_id = graphene.Int(required=True, description="User ID confirming attendance.")
        event_id = graphene.Int(required=True, description="Target event primary key ID.")

    ticket = graphene.Field(TicketType, description="The confirmed Ticket record.")
    participation = graphene.Field(ParticipationType, description="The Participation record.")
    total_points = graphene.Int(description="Updated cumulative points for user.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    @transaction.atomic
    def mutate(cls, root, info, user_id, event_id):
        """Execute atomic attendance confirmation and points allocation.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            user_id (int): User ID confirming.
            event_id (int): Event ID.

        Returns:
            ConfirmAttendance: Mutation payload with ticket, participation, and total points.
        """
        # Security: prevent confirming attendance on behalf of another user
        if info.context.user.id != user_id:
            raise GraphQLError("You cannot confirm attendance for another user.")

        try:
            user = User.objects.get(id=user_id)
            event = Event.objects.get(id=event_id)

            # Prevent double-booking
            if Ticket.objects.filter(user=user, event=event).exists():
                return cls(
                    ticket=None, participation=None, total_points=None,
                    success=False, message="User already confirmed attendance for this event",
                )

            # Create ticket and participation entries
            ticket = Ticket.objects.create(user=user, event=event, status='confirmed')
            participation = Participation.objects.create(
                user=user, event=event, points_awarded=event.points_reward,
            )

            # Award gamification reward points to user profile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.total_points += event.points_reward
            profile.save()

            return cls(
                ticket=ticket,
                participation=participation,
                total_points=profile.total_points,
                success=True,
                message=f"Attendance confirmed. +{event.points_reward} points awarded.",
            )
        except User.DoesNotExist:
            return cls(ticket=None, participation=None, total_points=None,
                       success=False, message="User not found")
        except Event.DoesNotExist:
            return cls(ticket=None, participation=None, total_points=None,
                       success=False, message="Event not found")
        except Exception as e:
            return cls(ticket=None, participation=None, total_points=None,
                       success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6: Cloudinary Upload Signature (React Native / Web Client)
# ─────────────────────────────────────────────────────────────────────────────
class GenerateCloudinarySignature(graphene.Mutation):
    """Generate a cryptographic SHA-1 upload signature for direct Cloudinary client-side uploads."""

    class Arguments:
        params_to_sign = graphene.JSONString(required=True, description="JSON dictionary of parameters to sign (e.g. folder, timestamp).")
        folder = graphene.String(description="Target Cloudinary asset folder.")

    signature = graphene.String(description="Generated SHA-1 signature.")
    timestamp = graphene.Int(description="UNIX epoch timestamp applied to the signature.")
    api_key = graphene.String(description="Cloudinary public API Key.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, params_to_sign, folder=None):
        """Compute HMAC SHA-1 signature using Cloudinary API Secret.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            params_to_sign (str | dict): Parameters payload to sign.
            folder (str, optional): Target folder path.

        Returns:
            GenerateCloudinarySignature: Mutation payload.
        """
        import os
        import time
        import cloudinary.utils

        try:
            api_secret = os.getenv('CLOUDINARY_API_SECRET')
            api_key = os.getenv('CLOUDINARY_API_KEY')

            if not api_secret or not api_key:
                return cls(
                    signature=None, timestamp=None, api_key=None,
                    success=False, message="Cloudinary credentials not configured in environment"
                )

            # Safely parse JSON string if passed as string
            if isinstance(params_to_sign, str):
                import json
                try:
                    params = json.loads(params_to_sign)
                except Exception:
                    params = {}
            elif isinstance(params_to_sign, dict):
                params = dict(params_to_sign)
            else:
                params = {}

            if folder:
                params['folder'] = folder

            if 'timestamp' not in params:
                params['timestamp'] = int(time.time())

            # Generate SHA-1 cryptographic signature using Cloudinary SDK utility
            signature = cloudinary.utils.api_sign_request(params, api_secret)

            return cls(
                signature=signature,
                timestamp=int(params['timestamp']),
                api_key=api_key,
                success=True,
                message="Signature generated successfully"
            )
        except Exception as e:
            return cls(
                signature=None, timestamp=None, api_key=None,
                success=False, message=str(e)
            )


# ─────────────────────────────────────────────────────────────────────────────
# User Profile & Account Settings Mutations
# ─────────────────────────────────────────────────────────────────────────────
class UpdateUserHobbies(graphene.Mutation):
    """Synchronize the authenticated user's selected hobby tags."""

    class Arguments:
        hobby_ids = graphene.List(graphene.Int, required=True, description="Array of Hobby primary key IDs.")

    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")
    user = graphene.Field(UserType, description="Updated User entity.")

    @classmethod
    @login_required
    def mutate(cls, root, info, hobby_ids):
        """Update ManyToMany hobby associations on the user profile.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            hobby_ids (list[int]): List of hobby IDs.

        Returns:
            UpdateUserHobbies: Mutation payload.
        """
        user = info.context.user
        try:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            hobbies = Hobby.objects.filter(id__in=hobby_ids)
            profile.hobbies.set(hobbies)
            return cls(success=True, message="Hobbies updated successfully", user=user)
        except Exception as e:
            return cls(success=False, message=str(e), user=None)


class UpdateAccountSecurity(graphene.Mutation):
    """Update sensitive account credentials (username, email, password) with verification."""

    class Arguments:
        email = graphene.String(description="New email address.")
        new_username = graphene.String(description="New username.")
        new_password = graphene.String(description="New password to set.")
        current_password = graphene.String(description="Current password required for authorization.")
        bio = graphene.String(description="Updated bio text.")
        neighbourhood = graphene.String(description="Updated neighborhood.")

    user = graphene.Field(UserType, description="Updated User entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status or validation error message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, email=None, new_username=None, new_password=None, current_password=None, bio=None, neighbourhood=None):
        """Verify current password and apply updates to User and UserProfile.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            email (str, optional): New email.
            new_username (str, optional): New username.
            new_password (str, optional): New password.
            current_password (str, optional): Current password for authentication challenge.
            bio (str, optional): Bio text.
            neighbourhood (str, optional): Neighborhood text.

        Returns:
            UpdateAccountSecurity: Mutation payload.
        """
        try:
            user = info.context.user
            profile, _ = UserProfile.objects.get_or_create(user=user)

            # Security Challenge: Require valid current_password before allowing username or password changes
            if new_username or new_password:
                if not current_password or not user.check_password(current_password):
                    return cls(user=None, success=False, message="Current password is required and must be correct to authorize username or password changes.")

            # Validate unique username if modified
            if new_username and new_username != user.username:
                if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                    return cls(user=None, success=False, message="Username is already taken.")
                user.username = new_username

            # Validate unique email if modified
            if email and email != user.email:
                if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                    return cls(user=None, success=False, message="Email is already taken.")
                user.email = email

            # Update password with Django password hasher
            if new_password:
                user.set_password(new_password)

            user.save()

            if bio is not None:
                profile.bio = bio
            if neighbourhood is not None:
                profile.neighbourhood = neighbourhood
            profile.save()

            return cls(user=user, success=True, message="Profile and security settings updated successfully.")
        except Exception as e:
            return cls(user=None, success=False, message=str(e))


class DeleteAccount(graphene.Mutation):
    """Permanently delete the authenticated user's account and related data."""

    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info):
        """Execute user account deletion.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.

        Returns:
            DeleteAccount: Mutation payload.
        """
        try:
            user = info.context.user
            user.delete()
            return cls(success=True, message="Account deleted successfully.")
        except Exception as e:
            return cls(success=False, message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Root Mutation ObjectType
# ─────────────────────────────────────────────────────────────────────────────
class Mutation(graphene.ObjectType):
    """Root GraphQL Mutation object aggregating all platform write operations."""

    # ── Authentication & Account Management ──────────────────────────────────
    create_user = CreateUser.Field(description="Register a new member with an invitation code.")
    token_auth = graphql_jwt.ObtainJSONWebToken.Field(description="Authenticate credentials and obtain JWT token pair.")
    verify_token = graphql_jwt.Verify.Field(description="Verify validity of an existing JWT token.")
    refresh_token = graphql_jwt.Refresh.Field(description="Refresh an expired JWT token using refresh token.")
    update_user_profile = UpdateUserProfile.Field(description="Update user profile metadata.")
    update_user_hobbies = UpdateUserHobbies.Field(description="Update user selected hobbies.")
    update_account_security = UpdateAccountSecurity.Field(description="Update email, username, and password.")
    delete_account = DeleteAccount.Field(description="Delete the authenticated user account.")

    # ── Communities ─────────────────────────────────────────────────────────
    create_community = CreateCommunity.Field(description="Create a new white-label community.")
    update_community = UpdateCommunity.Field(description="Update circle details owned by the caller.")
    delete_community = DeleteCommunity.Field(description="Delete a circle created by the caller.")
    join_community = JoinCommunity.Field(description="Join an existing community as a member.")
    remove_community_member = RemoveCommunityMember.Field(description="Remove a member from a Circle.")

    # ── Events & RSVP ───────────────────────────────────────────────────────
    create_event = CreateEvent.Field(description="Create a new event.")
    update_event = UpdateEvent.Field(description="Modify an existing event owned by the caller.")
    delete_event = DeleteEvent.Field(description="Delete an existing event owned by the caller.")
    confirm_attendance = ConfirmAttendance.Field(description="Confirm attendance, issue ticket, and claim reward points.")
    swipe_event = SwipeEvent.Field(description="Submit RSVP swipe choice ('going', 'maybe', 'pass').")

    # ── Invitations ─────────────────────────────────────────────────────────
    generate_invite = GenerateInvite.Field(description="Generate a new invitation code.")

    # ── Friendships ─────────────────────────────────────────────────────────
    send_friend_request = SendFriendRequest.Field(description="Send a friend request to another user.")
    respond_friend_request = RespondFriendRequest.Field(description="Accept or reject an incoming friend request.")

    # ── Matches & Chat ───────────────────────────────────────────────────────
    create_match = CreateMatch.Field(description="Establish or request a match between two users.")
    send_connect_request = SendConnectRequest.Field(description="Initiate an async connection request with another user.")
    respond_connect_request = RespondConnectRequest.Field(description="Accept or decline an incoming connection request.")
    send_message = SendMessage.Field(description="Send a message in an active match thread.")

    # ── Cloud Media Direct Uploads ──────────────────────────────────────────
    presigned_url = PresignedURL.Field(description="Obtain an AWS S3 presigned POST URL.")
    generate_cloudinary_signature = GenerateCloudinarySignature.Field(description="Generate a Cloudinary SHA-1 upload signature.")
