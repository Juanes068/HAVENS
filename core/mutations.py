import graphene
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from .types import UserType, CommunityType, EventType, TicketType, ParticipationType
from .models import Community, Event, Ticket, Participation, UserProfile


class CreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, username, email, password):
        try:
            if User.objects.filter(username=username).exists():
                return cls(user=None, success=False, message="Username already exists")
            if User.objects.filter(email=email).exists():
                return cls(user=None, success=False, message="Email already exists")

            user = User.objects.create_user(username=username, email=email, password=password)
            UserProfile.objects.create(user=user)
            return cls(user=user, success=True, message="User created successfully")
        except Exception as e:
            return cls(user=None, success=False, message=str(e))


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
        community_id = graphene.Int()
        creator_id = graphene.Int()
        points_reward = graphene.Int(default_value=10)
        scheduled_date = graphene.DateTime()

    event = graphene.Field(EventType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, title, description, latitude, longitude,
               community_id=None, creator_id=None, points_reward=10, scheduled_date=None):
        try:
            community = Community.objects.get(id=community_id) if community_id else None
            creator = User.objects.get(id=creator_id) if creator_id else None
            event = Event.objects.create(
                title=title,
                description=description,
                latitude=latitude,
                longitude=longitude,
                community=community,
                creator=creator,
                points_reward=points_reward,
                scheduled_date=scheduled_date or timezone.now(),
            )
            return cls(event=event, success=True, message="Event created successfully")
        except Community.DoesNotExist:
            return cls(event=None, success=False, message="Community not found")
        except User.DoesNotExist:
            return cls(event=None, success=False, message="Creator not found")
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
    @transaction.atomic
    def mutate(cls, root, info, user_id, event_id):
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


class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()
    create_community = CreateCommunity.Field()
    create_event = CreateEvent.Field()
    confirm_attendance = ConfirmAttendance.Field()
