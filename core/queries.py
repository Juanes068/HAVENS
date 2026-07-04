import graphene
from django.contrib.auth.models import User
from django.db import models as django_models
from .types import (
    UserType, UserProfileType, CommunityType, CommunityMembershipType,
    EventType, TicketType, ParticipationType, InvitationCodeType,
    EventRSVPType, FriendshipType, MatchType, MessageType,
)
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    CommunityMembership, InvitationCode, EventRSVP, Friendship,
    Match, Message,
)
from .utils import filter_events_by_radius
from .decorators import login_required


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
    my_communities = graphene.List(CommunityMembershipType)

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

    # Feature 1: Invitations
    my_invitation_codes = graphene.List(InvitationCodeType)

    # Feature 3: Friendships
    my_friends = graphene.List(UserType)
    my_friend_requests = graphene.List(FriendshipType)
    pending_friend_requests = graphene.List(FriendshipType)

    # Feature 4: Event RSVPs
    event_rsvps = graphene.List(EventRSVPType, event_id=graphene.Int(required=True))
    my_rsvps = graphene.List(EventRSVPType)

    # Feature 5: Matches & Messages
    my_matches = graphene.List(MatchType)
    messages_by_match = graphene.List(MessageType, match_id=graphene.Int(required=True))

    # Feature 7: User Profile
    user_profile_by_id = graphene.Field(UserProfileType, user_id=graphene.Int(required=True))

    # --- Resolvers ---

    def resolve_my_profile(self, info):
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

    @login_required
    def resolve_my_communities(self, info):
        user = info.context.user
        return CommunityMembership.objects.filter(user=user).select_related('community')

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

    # Feature 1: Invitations
    @login_required
    def resolve_my_invitation_codes(self, info):
        user = info.context.user
        return InvitationCode.objects.filter(created_by=user).order_by('-created_at')

    # Feature 3: Friendships
    @login_required
    def resolve_my_friends(self, info):
        user = info.context.user
        sent = Friendship.objects.filter(from_user=user, status='accepted').values_list('to_user_id', flat=True)
        received = Friendship.objects.filter(to_user=user, status='accepted').values_list('from_user_id', flat=True)
        friend_ids = set(sent) | set(received)
        return User.objects.filter(id__in=friend_ids)

    @login_required
    def resolve_my_friend_requests(self, info):
        user = info.context.user
        return Friendship.objects.filter(to_user=user, status='pending')

    @login_required
    def resolve_pending_friend_requests(self, info):
        user = info.context.user
        return Friendship.objects.filter(to_user=user, status='pending')

    # Feature 4: Event RSVPs
    def resolve_event_rsvps(self, info, event_id):
        return EventRSVP.objects.filter(event_id=event_id).select_related('user', 'event')

    @login_required
    def resolve_my_rsvps(self, info):
        user = info.context.user
        return EventRSVP.objects.filter(user=user).select_related('event')

    # Feature 5: Matches & Messages
    @login_required
    def resolve_my_matches(self, info):
        user = info.context.user
        return Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user)
        ).select_related('user1', 'user2')

    @login_required
    def resolve_messages_by_match(self, info, match_id):
        user = info.context.user
        match = Match.objects.get(id=match_id)
        if user != match.user1 and user != match.user2:
            return []
        return Message.objects.filter(match_id=match_id).select_related('sender', 'match')

    # Feature 7: User Profile
    def resolve_user_profile_by_id(self, info, user_id):
        try:
            return UserProfile.objects.get(user_id=user_id)
        except UserProfile.DoesNotExist:
            return None
