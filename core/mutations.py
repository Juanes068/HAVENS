import graphene
import graphql_jwt
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
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


from .tasks import send_welcome_email

# ───────────────────────────────────────────────
# Feature 7 + 1: Create User (requires invitation code)
# ───────────────────────────────────────────────
class CreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)
        invitation_code = graphene.String(required=True)
        bio = graphene.String(default_value='')
        neighbourhood = graphene.String(default_value='')
        city_name = graphene.String(default_value='')
        latitude = graphene.Float()
        longitude = graphene.Float()
        photo_url = graphene.String(default_value='')

    user = graphene.Field(UserType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, username, email, password, invitation_code,
               bio='', neighbourhood='', city_name='', latitude=None, longitude=None, photo_url=''):
        try:
            # Check invitation code
            try:
                invite = InvitationCode.objects.get(code=invitation_code, is_used=False)
            except InvitationCode.DoesNotExist:
                return cls(user=None, success=False, message="Invalid or already used invitation code")

            if User.objects.filter(username=username).exists():
                return cls(user=None, success=False, message="Username already exists")
            if User.objects.filter(email=email).exists():
                return cls(user=None, success=False, message="Email already exists")

            user = User.objects.create_user(username=username, email=email, password=password)

            # Mark invitation as used
            invite.is_used = True
            invite.used_by = user
            invite.used_at = timezone.now()
            invite.save()

            # Create extended profile (auto-generates short invite_code)
            UserProfile.objects.create(
                user=user,
                bio=bio,
                neighbourhood=neighbourhood,
                city_name=city_name,
                latitude=latitude,
                longitude=longitude,
                photo_url=photo_url,
            )

            # Trigger asynchronous Celery welcome email task (non-blocking)
            try:
                send_welcome_email.delay(user.email, user.username)
            except Exception as celery_err:
                # Log or fallback if Celery broker is temporarily unreachable
                pass

            return cls(user=user, success=True, message="User created successfully")
        except Exception as e:
            return cls(user=None, success=False, message=str(e))


# ───────────────────────────────────────────────
# Feature 1: Generate Invitation Code
# ───────────────────────────────────────────────
class GenerateInvite(graphene.Mutation):
    invitation = graphene.Field(InvitationCodeType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info):
        try:
            user = info.context.user
            invite = InvitationCode.objects.create(created_by=user)
            return cls(invitation=invite, success=True, message="Invitation code generated")
        except Exception as e:
            return cls(invitation=None, success=False, message=str(e))


# ───────────────────────────────────────────────
# Feature 2: Join Community
# ───────────────────────────────────────────────
class JoinCommunity(graphene.Mutation):
    class Arguments:
        community_id = graphene.Int(required=True)

    membership = graphene.Field(CommunityMembershipType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, community_id):
        try:
            user = info.context.user
            community = Community.objects.get(id=community_id)

            if CommunityMembership.objects.filter(user=user, community=community).exists():
                return cls(membership=None, success=False, message="Already a member of this community")

            membership = CommunityMembership.objects.create(user=user, community=community)
            return cls(membership=membership, success=True, message=f"Joined {community.name}")
        except Community.DoesNotExist:
            return cls(membership=None, success=False, message="Community not found")
        except Exception as e:
            return cls(membership=None, success=False, message=str(e))


# ───────────────────────────────────────────────
# Feature 3: Send Friend Request
# ───────────────────────────────────────────────
class SendFriendRequest(graphene.Mutation):
    class Arguments:
        to_user_id = graphene.Int(required=True)

    friendship = graphene.Field(FriendshipType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, to_user_id):
        try:
            from_user = info.context.user
            to_user = User.objects.get(id=to_user_id)

            if from_user.id == to_user.id:
                return cls(friendship=None, success=False, message="Cannot send friend request to yourself")

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


# ───────────────────────────────────────────────
# Feature 3: Respond to Friend Request
# ───────────────────────────────────────────────
class RespondFriendRequest(graphene.Mutation):
    class Arguments:
        friendship_id = graphene.Int(required=True)
        action = graphene.String(required=True)  # 'accept' or 'reject'

    friendship = graphene.Field(FriendshipType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, friendship_id, action):
        try:
            user = info.context.user
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


# ───────────────────────────────────────────────
# Feature 4: Swipe Event (RSVP)
# ───────────────────────────────────────────────
class SwipeEvent(graphene.Mutation):
    class Arguments:
        event_id = graphene.Int(required=True)
        response = graphene.String(required=True)  # 'going', 'maybe', 'pass'

    rsvp = graphene.Field(EventRSVPType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, event_id, response):
        try:
            user = info.context.user
            event = Event.objects.get(id=event_id)

            if response not in ('going', 'maybe', 'pass'):
                return cls(rsvp=None, success=False, message="Invalid response. Use 'going', 'maybe', or 'pass'")

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


# ───────────────────────────────────────────────
# Feature 5: Create Match
# ───────────────────────────────────────────────
class CreateMatch(graphene.Mutation):
    class Arguments:
        user2_id = graphene.Int(required=True)

    match = graphene.Field(MatchType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, user2_id):
        try:
            user1 = info.context.user
            user2 = User.objects.get(id=user2_id)

            if user1.id == user2.id:
                return cls(match=None, success=False, message="Cannot match with yourself")

            # Ensure consistent ordering (lower id first)
            u1, u2 = (user1, user2) if user1.id < user2.id else (user2, user1)

            if Match.objects.filter(user1=u1, user2=u2).exists():
                return cls(match=None, success=False, message="Match already exists")

            match = Match.objects.create(user1=u1, user2=u2)
            return cls(match=match, success=True, message="Match created")
        except User.DoesNotExist:
            return cls(match=None, success=False, message="User not found")
        except Exception as e:
            return cls(match=None, success=False, message=str(e))


# ───────────────────────────────────────────────
# Feature 5: Send Message
# ───────────────────────────────────────────────
class SendMessage(graphene.Mutation):
    class Arguments:
        match_id = graphene.Int(required=True)
        content = graphene.String(required=True)

    message = graphene.Field(MessageType)
    success = graphene.Boolean()
    message_field = graphene.String()  # 'message' is reserved in GraphQL

    @classmethod
    @login_required
    def mutate(cls, root, info, match_id, content):
        sender = info.context.user
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            return cls(message=None, success=False, message_field="Match not found")

        if sender != match.user1 and sender != match.user2:
            raise GraphQLError("You are not part of this match")

        try:
            msg = Message.objects.create(match=match, sender=sender, content=content)
            return cls(message=msg, success=True, message_field="Message sent")
        except Exception as e:
            return cls(message=None, success=False, message_field=str(e))


# ───────────────────────────────────────────────
# Feature 6: Presigned URL for AWS S3
# ───────────────────────────────────────────────
class PresignedURL(graphene.Mutation):
    class Arguments:
        filename = graphene.String(required=True)
        content_type = graphene.String(default_value='image/jpeg')

    url = graphene.String()
    fields = graphene.JSONString()
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, filename, content_type='image/jpeg'):
        """
        Returns a presigned POST URL for direct upload to AWS S3.
        The frontend uses this URL+fields to POST the file directly to S3,
        bypassing our Django server entirely. This is the most scalable
        approach for mobile image uploads (React Native).
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

            # Generate unique key in S3
            key = f"uploads/{uuid.uuid4()}/{filename}"

            presigned = s3_client.generate_presigned_post(
                Bucket=bucket_name,
                Key=key,
                Fields={'Content-Type': content_type},
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 0, 10485760],  # max 10MB
                ],
                ExpiresIn=300,  # 5 minutes
            )

            return cls(
                url=presigned['url'],
                fields=presigned['fields'],
                success=True,
                message=f"Upload to {key}. URL expires in 5 minutes.",
            )
        except Exception as e:
            return cls(url=None, fields=None, success=False, message=str(e))


# ───────────────────────────────────────────────
# Feature 7: Update User Profile
# ───────────────────────────────────────────────
class UpdateUserProfile(graphene.Mutation):
    class Arguments:
        bio = graphene.String()
        neighbourhood = graphene.String()
        photo_url = graphene.String()

    profile = graphene.Field(UserType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, bio=None, neighbourhood=None, photo_url=None):
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


# ───────────────────────────────────────────────
# Existing Mutations (preserved)
# ───────────────────────────────────────────────
class CreateCommunity(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        subdomain = graphene.String(required=True)

    community = graphene.Field(CommunityType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, name, subdomain):
        try:
            if Community.objects.filter(subdomain=subdomain).exists():
                return cls(community=None, success=False, message="Subdomain already exists")
            community = Community.objects.create(name=name, subdomain=subdomain)
            return cls(community=community, success=True, message="Community created successfully")
        except Exception as e:
            return cls(community=None, success=False, message=str(e))


class CreateEvent(graphene.Mutation):
    class Arguments:
        title = graphene.String(required=True)
        description = graphene.String(required=True)
        latitude = graphene.Float(required=True)
        longitude = graphene.Float(required=True)
        communityId = graphene.Int()
        pointsReward = graphene.Int(default_value=10)
        visibility = graphene.String(default_value='public')

    event = graphene.Field(EventType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, title, description, latitude, longitude,
               communityId=None, pointsReward=10, visibility='public'):
        try:
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
                scheduled_date=timezone.now(),
            )
            return cls(event=event, success=True, message="Event created successfully")
        except Community.DoesNotExist:
            return cls(event=None, success=False, message="Community not found")
        except Exception as e:
            return cls(event=None, success=False, message=str(e))


class ConfirmAttendance(graphene.Mutation):
    """Confirm event attendance: creates Ticket + Participation and awards points."""

    class Arguments:
        user_id = graphene.Int(required=True)
        event_id = graphene.Int(required=True)

    ticket = graphene.Field(TicketType)
    participation = graphene.Field(ParticipationType)
    total_points = graphene.Int()
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    @transaction.atomic
    def mutate(cls, root, info, user_id, event_id):
        if info.context.user.id != user_id:
            raise GraphQLError("You cannot confirm attendance for another user.")

        try:
            user = User.objects.get(id=user_id)
            event = Event.objects.get(id=event_id)

            if Ticket.objects.filter(user=user, event=event).exists():
                return cls(
                    ticket=None, participation=None, total_points=None,
                    success=False, message="User already confirmed attendance for this event",
                )

            ticket = Ticket.objects.create(user=user, event=event, status='confirmed')
            participation = Participation.objects.create(
                user=user, event=event, points_awarded=event.points_reward,
            )

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


# ───────────────────────────────────────────────
# Feature 6: Cloudinary Upload Signature (React Native)
# ───────────────────────────────────────────────
class GenerateCloudinarySignature(graphene.Mutation):
    """
    Generates a secure upload signature for Cloudinary.
    The frontend (React Native) sends the parameters to sign (e.g., folder, public_id),
    and this mutation returns the signature, timestamp, and API Key required to upload
    directly to Cloudinary from the mobile app.
    """
    class Arguments:
        params_to_sign = graphene.JSONString(required=True)

    signature = graphene.String()
    timestamp = graphene.Int()
    api_key = graphene.String()
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, params_to_sign):
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

            # Safely parse params_to_sign whether string or dictionary
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

            if 'timestamp' not in params:
                params['timestamp'] = int(time.time())

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


class UpdateUserHobbies(graphene.Mutation):
    class Arguments:
        hobby_ids = graphene.List(graphene.Int, required=True)

    success = graphene.Boolean()
    message = graphene.String()
    user = graphene.Field(UserType)

    @classmethod
    @login_required
    def mutate(cls, root, info, hobby_ids):
        user = info.context.user
        try:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            hobbies = Hobby.objects.filter(id__in=hobby_ids)
            profile.hobbies.set(hobbies)
            return cls(success=True, message="Hobbies updated successfully", user=user)
        except Exception as e:
            return cls(success=False, message=str(e), user=None)


# ───────────────────────────────────────────────
# Profile Settings: Update Account Security & Delete Account
# ───────────────────────────────────────────────
class UpdateAccountSecurity(graphene.Mutation):
    class Arguments:
        email = graphene.String()
        new_username = graphene.String()
        new_password = graphene.String()
        current_password = graphene.String()
        bio = graphene.String()
        neighbourhood = graphene.String()

    user = graphene.Field(UserType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, email=None, new_username=None, new_password=None, current_password=None, bio=None, neighbourhood=None):
        try:
            user = info.context.user
            profile, _ = UserProfile.objects.get_or_create(user=user)

            # Security Check: Require current_password if changing username or password
            if new_username or new_password:
                if not current_password or not user.check_password(current_password):
                    return cls(user=None, success=False, message="Current password is required and must be correct to authorize username or password changes.")

            if new_username and new_username != user.username:
                if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                    return cls(user=None, success=False, message="Username is already taken.")
                user.username = new_username

            if email and email != user.email:
                if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                    return cls(user=None, success=False, message="Email is already taken.")
                user.email = email

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
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info):
        try:
            user = info.context.user
            user.delete()
            return cls(success=True, message="Account deleted successfully.")
        except Exception as e:
            return cls(success=False, message=str(e))


class Mutation(graphene.ObjectType):
    # Auth
    create_user = CreateUser.Field()
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    update_user_profile = UpdateUserProfile.Field()
    update_user_hobbies = UpdateUserHobbies.Field()
    update_account_security = UpdateAccountSecurity.Field()
    delete_account = DeleteAccount.Field()

    # Communities
    create_community = CreateCommunity.Field()
    join_community = JoinCommunity.Field()

    # Events
    create_event = CreateEvent.Field()
    confirm_attendance = ConfirmAttendance.Field()
    swipe_event = SwipeEvent.Field()

    # Invitations (Feature 1)
    generate_invite = GenerateInvite.Field()

    # Friends (Feature 3)
    send_friend_request = SendFriendRequest.Field()
    respond_friend_request = RespondFriendRequest.Field()

    # Matches & Chat (Feature 5)
    create_match = CreateMatch.Field()
    send_message = SendMessage.Field()

    # Images (Feature 6)
    presigned_url = PresignedURL.Field()
    generate_cloudinary_signature = GenerateCloudinarySignature.Field()

