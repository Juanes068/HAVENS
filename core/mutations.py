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
        bio = graphene.String(default_value='', description="Short introductory bio.")
        neighbourhood = graphene.String(default_value='', description="Local neighborhood or district.")
        city_name = graphene.String(default_value='', description="City name for geolocation tagging.")
        latitude = graphene.Float(description="User latitude coordinate.")
        longitude = graphene.Float(description="User longitude coordinate.")
        photo_url = graphene.String(default_value='', description="Profile image URL (Cloudinary/S3).")

    user = graphene.Field(UserType, description="The newly created User entity.")
    success = graphene.Boolean(description="Indicates if account creation succeeded.")
    message = graphene.String(description="Status or error message.")

    @classmethod
    def mutate(cls, root, info, username, email, password, invitation_code,
               bio='', neighbourhood='', city_name='', latitude=None, longitude=None, photo_url=''):
        """Execute user creation, link profile, mark invite as used, and queue welcome email.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            username (str): Target username.
            email (str): Target email.
            password (str): Account password.
            invitation_code (str): Invitation code to validate and consume.
            bio (str, optional): User biography.
            neighbourhood (str, optional): Neighborhood description.
            city_name (str, optional): City name.
            latitude (float, optional): Latitude coordinate.
            longitude (float, optional): Longitude coordinate.
            photo_url (str, optional): Avatar image URL.

        Returns:
            CreateUser: Mutation payload containing `user`, `success`, and `message`.
        """
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

            # 5. Create extended profile with location and avatar metadata
            UserProfile.objects.create(
                user=user,
                bio=bio,
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
    """Update profile bio, neighbourhood, and avatar URL for the authenticated user."""

    class Arguments:
        bio = graphene.String(description="User bio text.")
        neighbourhood = graphene.String(description="Neighborhood name.")
        photo_url = graphene.String(description="Profile avatar image URL.")

    profile = graphene.Field(UserType, description="Updated User entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, bio=None, neighbourhood=None, photo_url=None):
        """Update UserProfile fields.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            bio (str, optional): Biography text.
            neighbourhood (str, optional): Neighborhood description.
            photo_url (str, optional): Avatar image URL.

        Returns:
            UpdateUserProfile: Mutation payload.
        """
        try:
            user = info.context.user
            profile, _ = UserProfile.objects.get_or_create(user=user)

            if bio is not None:
                profile.bio = bio
            if neighbourhood is not None:
                profile.neighbourhood = neighbourhood
            if photo_url is not None:
                profile.photo_url = photo_url

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
        imageUrl = graphene.String(required=False, default_value="", description="Cloudinary cover image URL.")
        hobbyIds = graphene.List(graphene.Int, required=False, description="List of associated Hobby IDs.")

    community = graphene.Field(CommunityType, description="The created Community record.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status message.")

    @classmethod
    @login_required
    def mutate(cls, root, info, name, subdomain=None, description="", locationName="",
               latitude=None, longitude=None, imageUrl="", hobbyIds=None):
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

            community = Community.objects.create(
                name=name.strip(),
                subdomain=slug,
                description=description.strip() if description else "",
                location_name=locationName.strip() if locationName else "",
                latitude=latitude,
                longitude=longitude,
                image_url=imageUrl.strip() if imageUrl else "",
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

    event = graphene.Field(EventType, description="The created Event entity.")
    success = graphene.Boolean(description="Indicates success.")
    message = graphene.String(description="Status or validation error message.")

    # Allowed visibility choices from Event model definitions
    VALID_VISIBILITY = {v[0] for v in Event.VISIBILITY_CHOICES}

    @classmethod
    @login_required
    def mutate(cls, root, info, title, description, latitude, longitude,
               communityId=None, pointsReward=10, visibility='public',
               imageUrl=None, locationName=None, scheduledDate=None):
        """Validate input parameters and create Event record.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            title (str): Event title.
            description (str): Description text.
            latitude (float): Latitude coordinate.
            longitude (float): Longitude coordinate.
            communityId (int, optional): Associated community ID.
            pointsReward (int, optional): Points reward value.
            visibility (str, optional): Visibility level.
            imageUrl (str, optional): Cover image URL.
            locationName (str, optional): Venue name.
            scheduledDate (datetime, optional): Scheduled timestamp.

        Returns:
            CreateEvent: Mutation payload.
        """
        try:
            # Validate visibility choice against model constraints
            if visibility not in cls.VALID_VISIBILITY:
                return cls(event=None, success=False,
                           message=f"Invalid visibility '{visibility}'. Must be one of: {', '.join(sorted(cls.VALID_VISIBILITY))}")

            # Validate that scheduled date is not set in the past
            event_date = scheduledDate or timezone.now()
            if scheduledDate and scheduledDate < timezone.now():
                return cls(event=None, success=False,
                           message="Cannot create an event with a date in the past.")

            user = info.context.user
            community = Community.objects.get(id=communityId) if communityId else None
            event = Event.objects.create(
                title=title,
                description=description,
                latitude=latitude,
                longitude=longitude,
                community=community,
                creator=user,
                points_reward=pointsReward,
                visibility=visibility,
                image_url=imageUrl,
                location_name=locationName or '',
                scheduled_date=event_date,
            )
            return cls(event=event, success=True, message="Event created successfully")
        except Community.DoesNotExist:
            return cls(event=None, success=False, message="Community not found")
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
        """Verify event ownership and delete record.

        Args:
            root: Root GraphQL object.
            info (graphene.ResolveInfo): Execution context.
            id (int): Primary key of event.

        Returns:
            DeleteEvent: Mutation payload.
        """
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
    join_community = JoinCommunity.Field(description="Join an existing community as a member.")

    # ── Events & RSVP ───────────────────────────────────────────────────────
    create_event = CreateEvent.Field(description="Create a new event.")
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
