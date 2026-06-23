import graphene
from django.contrib.auth.models import User
from .types import UserType, CommunityType, EventType, TicketType, ParticipationType
from .models import Community, Event, Ticket, Participation
from .utils import filter_events_by_radius


class Query(graphene.ObjectType):
    hello = graphene.String(default_value="Havens API v1")

    # Users
    my_profile = graphene.Field(UserType)
    all_users = graphene.List(UserType)
    user_by_id = graphene.Field(UserType, id=graphene.Int(required=True))

    # Communities
    all_communities = graphene.List(CommunityType)
    community_by_id = graphene.Field(CommunityType, id=graphene.Int(required=True))
    community_by_subdomain = graphene.Field(CommunityType, subdomain=graphene.String(required=True))

    # Events (filterable by coordinates)
    all_events = graphene.List(
        EventType,
        latitude=graphene.Float(),
        longitude=graphene.Float(),
        radius_km=graphene.Float(default_value=10.0),
    )
    event_by_id = graphene.Field(EventType, id=graphene.Int(required=True))
    events_by_community = graphene.List(EventType, community_id=graphene.Int(required=True))

    # Tickets
    all_tickets = graphene.List(TicketType)
    ticket_by_id = graphene.Field(TicketType, id=graphene.Int(required=True))
    tickets_by_user = graphene.List(TicketType, user_id=graphene.Int(required=True))

    # Participations
    all_participations = graphene.List(ParticipationType)
    participation_by_id = graphene.Field(ParticipationType, id=graphene.Int(required=True))
    participations_by_user = graphene.List(ParticipationType, user_id=graphene.Int(required=True))

    def resolve_my_profile(self, info):
        """Returns the authenticated user via JWT; None if not authenticated."""
        user = info.context.user
        if user and user.is_authenticated:
            return user
        return None

    def resolve_all_users(self, info):
        return User.objects.all()

    def resolve_user_by_id(self, info, id):
        try:
            return User.objects.get(id=id)
        except User.DoesNotExist:
            return None

    def resolve_all_communities(self, info):
        return Community.objects.all()

    def resolve_community_by_id(self, info, id):
        try:
            return Community.objects.get(id=id)
        except Community.DoesNotExist:
            return None

    def resolve_community_by_subdomain(self, info, subdomain):
        try:
            return Community.objects.get(subdomain=subdomain)
        except Community.DoesNotExist:
            return None

    def resolve_all_events(self, info, latitude=None, longitude=None, radius_km=10.0):
        queryset = Event.objects.select_related('community', 'creator').all()
        if latitude is not None and longitude is not None:
            return filter_events_by_radius(queryset, latitude, longitude, radius_km)
        return queryset

    def resolve_event_by_id(self, info, id):
        try:
            return Event.objects.get(id=id)
        except Event.DoesNotExist:
            return None

    def resolve_events_by_community(self, info, community_id):
        return Event.objects.filter(community_id=community_id)

    def resolve_all_tickets(self, info):
        return Ticket.objects.select_related('user', 'event').all()

    def resolve_ticket_by_id(self, info, id):
        try:
            return Ticket.objects.get(id=id)
        except Ticket.DoesNotExist:
            return None

    def resolve_tickets_by_user(self, info, user_id):
        return Ticket.objects.filter(user_id=user_id)

    def resolve_all_participations(self, info):
        return Participation.objects.select_related('user', 'event').all()

    def resolve_participation_by_id(self, info, id):
        try:
            return Participation.objects.get(id=id)
        except Participation.DoesNotExist:
            return None

    def resolve_participations_by_user(self, info, user_id):
        return Participation.objects.filter(user_id=user_id)
