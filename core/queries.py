import graphene
from django.contrib.auth.models import User
from django.db import models as django_models
from django.db.models import F, Value
from django.db.models.functions import ACos, Cos, Sin, Radians
from django.utils import timezone
from .types import (
    UserType, UserProfileType, CommunityType, CommunityMembershipType,
    EventType, TicketType, ParticipationType, InvitationCodeType,
    EventRSVPType, FriendshipType, MatchType, MessageType,
    HobbyCategoryType, HobbyType,
)
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    CommunityMembership, InvitationCode, EventRSVP, Friendship,
    Match, Message, HobbyCategory, Hobby,
)
from .utils import filter_events_by_radius
from .decorators import login_required


class Query(graphene.ObjectType):
    hello = graphene.String(default_value="Havens API v1")

    # Hobbies Taxonomy
    all_hobby_categories = graphene.List(HobbyCategoryType)
    all_hobbies = graphene.List(HobbyType)

    # Users
    my_profile = graphene.Field(UserType)
    all_users = graphene.List(UserType)
    user_by_id = graphene.Field(UserType, id=graphene.Int(required=True))

    # Communities
    all_communities = graphene.List(CommunityType)
    community_by_id = graphene.Field(CommunityType, id=graphene.Int(required=True))
    community_by_subdomain = graphene.Field(CommunityType, subdomain=graphene.String(required=True))
    my_communities = graphene.List(CommunityMembershipType)

    # Events (filterable by coordinates, upcoming status, and creator)
    all_events = graphene.List(
        EventType,
        latitude=graphene.Float(),
        longitude=graphene.Float(),
        radius_km=graphene.Float(default_value=10.0),
        upcoming_only=graphene.Boolean(default_value=True),
        creator_id=graphene.Int(),
    )
    my_created_events = graphene.List(EventType, upcoming_only=graphene.Boolean(default_value=False))
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

    def resolve_all_hobby_categories(self, info):
        return HobbyCategory.objects.prefetch_related('hobbies').all()

    def resolve_all_hobbies(self, info):
        return Hobby.objects.select_related('category').all()

    def resolve_my_profile(self, info):
        user = info.context.user
        if user and user.is_authenticated:
            return user
        return None

    def resolve_all_users(self, info):
        user = info.context.user
        queryset = User.objects.all()
        if user and user.is_authenticated:
            try:
                profile = user.profile
                user_hobbies = list(profile.hobbies.values_list('id', flat=True))
                queryset = queryset.exclude(id=user.id)

                if user_hobbies:
                    queryset = queryset.annotate(
                        affinity_score=django_models.Count(
                            'profile__hobbies',
                            filter=django_models.Q(profile__hobbies__in=user_hobbies)
                        )
                    )
                else:
                    queryset = queryset.annotate(affinity_score=Value(0))

                if profile.latitude is not None and profile.longitude is not None:
                    distance_expr = 6371 * ACos(
                        Cos(Radians(Value(profile.latitude))) * Cos(Radians(F('profile__latitude'))) *
                        Cos(Radians(F('profile__longitude')) - Radians(Value(profile.longitude))) +
                        Sin(Radians(Value(profile.latitude))) * Sin(Radians(F('profile__latitude')))
                    )
                    queryset = queryset.annotate(distance=distance_expr).order_by('distance', '-affinity_score', '-id')
                else:
                    queryset = queryset.order_by('-affinity_score', '-id')
            except UserProfile.DoesNotExist:
                pass
        return queryset

    @login_required
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

    def resolve_all_events(self, info, latitude=None, longitude=None, radius_km=10.0, upcoming_only=True, creator_id=None):
        user = info.context.user
        queryset = Event.objects.select_related('community', 'creator').all()

        if creator_id is not None:
            queryset = queryset.filter(creator_id=creator_id)

        if upcoming_only:
            queryset = queryset.filter(scheduled_date__gte=timezone.now())

        if latitude is not None and longitude is not None:
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(latitude))) * Cos(Radians(F('latitude'))) *
                Cos(Radians(F('longitude')) - Radians(Value(longitude))) +
                Sin(Radians(Value(latitude))) * Sin(Radians(F('latitude')))
            )
            queryset = queryset.annotate(distance=distance_expr).filter(distance__lte=radius_km)

        if user and user.is_authenticated:
            try:
                user_hobbies = list(user.profile.hobbies.values_list('id', flat=True))
                if user_hobbies:
                    queryset = queryset.annotate(
                        affinity_score=django_models.Count(
                            'hobbies',
                            filter=django_models.Q(hobbies__in=user_hobbies)
                        )
                    ).order_by('-affinity_score', 'scheduled_date')
            except UserProfile.DoesNotExist:
                pass

        return queryset

    @login_required
    def resolve_my_created_events(self, info, upcoming_only=False):
        user = info.context.user
        queryset = Event.objects.filter(creator=user).select_related('community', 'creator').order_by('-scheduled_date')
        if upcoming_only:
            queryset = queryset.filter(scheduled_date__gte=timezone.now())
        return queryset

    def resolve_event_by_id(self, info, id):
        try:
            return Event.objects.get(id=id)
        except Event.DoesNotExist:
            return None

    def resolve_events_by_community(self, info, community_id):
        return Event.objects.filter(community_id=community_id)

    @login_required
    def resolve_all_tickets(self, info):
        user = info.context.user
        if user.is_staff:
            return Ticket.objects.select_related('user', 'event').all()
        return Ticket.objects.filter(user=user).select_related('user', 'event')

    @login_required
    def resolve_ticket_by_id(self, info, id):
        user = info.context.user
        try:
            ticket = Ticket.objects.get(id=id)
            if ticket.user == user or user.is_staff:
                return ticket
            return None
        except Ticket.DoesNotExist:
            return None

    @login_required
    def resolve_tickets_by_user(self, info, user_id):
        user = info.context.user
        if user.id == user_id or user.is_staff:
            return Ticket.objects.filter(user_id=user_id).select_related('user', 'event')
        return Ticket.objects.none()

    @login_required
    def resolve_all_participations(self, info):
        user = info.context.user
        if user.is_staff:
            return Participation.objects.select_related('user', 'event').all()
        return Participation.objects.filter(user=user).select_related('user', 'event')

    @login_required
    def resolve_participation_by_id(self, info, id):
        user = info.context.user
        try:
            part = Participation.objects.get(id=id)
            if part.user == user or user.is_staff:
                return part
            return None
        except Participation.DoesNotExist:
            return None

    @login_required
    def resolve_participations_by_user(self, info, user_id):
        user = info.context.user
        if user.id == user_id or user.is_staff:
            return Participation.objects.filter(user_id=user_id).select_related('user', 'event')
        return Participation.objects.none()

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
    @login_required
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
        try:
            match = Match.objects.get(id=match_id)
            if user != match.user1 and user != match.user2:
                return []
            return Message.objects.filter(match_id=match_id).select_related('sender', 'match')
        except Match.DoesNotExist:
            return []

    # Feature 7: User Profile
    @login_required
    def resolve_user_profile_by_id(self, info, user_id):
        user = info.context.user
        if user.id == user_id or user.is_staff:
            try:
                return UserProfile.objects.get(user_id=user_id)
            except UserProfile.DoesNotExist:
                return None
        return None
