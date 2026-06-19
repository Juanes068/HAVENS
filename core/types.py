import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth.models import User
from .models import Community, Event, Ticket, Participation, UserProfile


class UserType(DjangoObjectType):
    total_points = graphene.Int()

    class Meta:
        model = User
        fields = ("id", "username", "email")

    def resolve_total_points(self, info):
        profile = getattr(self, 'profile', None)
        return profile.total_points if profile else 0


class CommunityType(DjangoObjectType):
    class Meta:
        model = Community
        fields = ("id", "name", "subdomain", "created_at")


class EventType(DjangoObjectType):
    class Meta:
        model = Event
        fields = (
            "id", "community", "creator", "title", "description",
            "latitude", "longitude", "points_reward", "scheduled_date", "created_at",
        )


class TicketType(DjangoObjectType):
    class Meta:
        model = Ticket
        fields = ("id", "user", "event", "status", "created_at")


class ParticipationType(DjangoObjectType):
    class Meta:
        model = Participation
        fields = ("id", "user", "event", "points_awarded", "attended_at")
