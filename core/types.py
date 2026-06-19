import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth.models import User
from .models import Community, Event, Ticket, Participation


class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ("id", "username", "email")

class CommunityType(DjangoObjectType):
    class Meta:
        model = Community
        fields = ("id", "name", "subdomain", "created_at")

class EventType(DjangoObjectType):
    class Meta:
        model = Event
        fields = ("id", "community", "title", "description", "latitude", "longitude", "points_reward", "scheduled_date")

class TicketType(DjangoObjectType):
    class Meta:
        model = Ticket
        fields = ("id", "user", "event", "status")

class ParticipationType(DjangoObjectType):
    class Meta:
        model = Participation
        fields = ("id", "user", "event", "points_awarded")