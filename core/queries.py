"""Havens GraphQL Query Root and Resolvers.

This module defines the primary GraphQL `Query` class for the Havens platform,
exposing endpoints for hobbies, users, communities, event discovery feeds,
tickets, participations, friend relationships, event RSVPs, and 1-on-1 chat matches.

Key Features & Business Logic:
    - Geolocation & Haversine Filtering:
      Computes great-circle distances directly in the database using trigonometric
      functions (ACos, Cos, Sin, Radians) on WGS-84 coordinates.
    - Affinity Scoring:
      Dynamically ranks users and events based on shared hobby IDs using conditional
      Django ORM Count aggregations.
    - Feed Personalization & Exclusion Logic:
      Automatically excludes the authenticated user's own events and events for which
      the user already holds an active ticket, participation, or 'going' RSVP.
"""

import graphene
from django.contrib.auth.models import User
from django.db import models as django_models
from django.db.models import F, Value, Q, Count
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
from .utils import filter_events_by_radius, calculate_user_recommendations, calculate_circle_recommendations
from .decorators import login_required


class Query(graphene.ObjectType):
    """Root GraphQL Query object exposing read operations across the Havens ecosystem."""

    hello = graphene.String(
        default_value="Havens API v1",
        description="Health-check and API version verification query."
    )

    # ── Hobbies Taxonomy ────────────────────────────────────────────────────────
    all_hobby_categories = graphene.List(
        HobbyCategoryType,
        description="Retrieve all hobby categories with their associated hobbies prefetched."
    )
    all_hobbies = graphene.List(
        HobbyType,
        description="Retrieve all available hobbies with their parent category preloaded."
    )

    # ── Users & Profiles ────────────────────────────────────────────────────────
    my_profile = graphene.Field(
        UserType,
        description="Retrieve the currently authenticated user's account details and profile."
    )
    all_users = graphene.List(
        UserType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        description="Retrieve users ranked by hobby affinity score and physical proximity."
    )
    get_recommended_users = graphene.List(
        UserType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        description="Location-first recommended users filtered by Haversine radius and sorted by affinity score."
    )
    recommended_users = graphene.List(
        UserType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        description="Alias for recommended users matching query."
    )
    user_by_id = graphene.Field(
        UserType,
        id=graphene.Int(required=True),
        description="Look up a specific user account by its primary key ID."
    )

    # ── Communities ─────────────────────────────────────────────────────────────
    all_communities = graphene.List(
        CommunityType,
        description="Retrieve all communities on the Havens platform."
    )
    recommended_circles = graphene.List(
        CommunityType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        description="Retrieve recommended circles/communities scored by hobby affinity & distance."
    )
    get_recommended_circles = graphene.List(
        CommunityType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        description="Location-first recommended circles with Haversine radius filtering for physical circles and bypass for virtual circles."
    )
    community_by_id = graphene.Field(
        CommunityType,
        id=graphene.Int(required=True),
        description="Retrieve a single community by its unique database ID."
    )
    community_by_subdomain = graphene.Field(
        CommunityType,
        subdomain=graphene.String(required=True),
        description="Look up a white-label community instance by its unique subdomain slug."
    )
    my_communities = graphene.List(
        CommunityMembershipType,
        description="Retrieve all community memberships belonging to the authenticated user."
    )

    # ── Events & Discovery Feed ──────────────────────────────────────────────────
    discovery_events = graphene.List(
        EventType,
        tags=graphene.List(graphene.String, required=False),
        start_date=graphene.DateTime(required=False),
        end_date=graphene.DateTime(required=False),
        has_spots=graphene.Boolean(required=False),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        radius_km=graphene.Float(default_value=10.0),
        description="Personalized discovery feed: filters upcoming events by location, spots, tags, and ranks by hobby affinity."
    )
    all_events = graphene.List(
        EventType,
        tags=graphene.List(graphene.String, required=False),
        start_date=graphene.DateTime(required=False),
        end_date=graphene.DateTime(required=False),
        has_spots=graphene.Boolean(required=False),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        radius_km=graphene.Float(default_value=10.0),
        upcoming_only=graphene.Boolean(default_value=True),
        creator_id=graphene.Int(required=False),
        description="Search and filter events across the platform with optional proximity and tag criteria."
    )
    my_created_events = graphene.List(
        EventType,
        upcoming_only=graphene.Boolean(default_value=False),
        description="Retrieve all events hosted/created by the authenticated user."
    )
    event_by_id = graphene.Field(
        EventType,
        id=graphene.Int(required=True),
        description="Look up a single event by its unique ID."
    )
    events_by_community = graphene.List(
        EventType,
        community_id=graphene.Int(required=True),
        description="Retrieve all events associated with a specific community ID."
    )

    # ── Tickets & Participations ────────────────────────────────────────────────
    all_tickets = graphene.List(
        TicketType,
        description="Retrieve ticket records (user's own tickets, or all tickets if caller is staff)."
    )
    ticket_by_id = graphene.Field(
        TicketType,
        id=graphene.Int(required=True),
        description="Retrieve a single ticket by ID (restricted to ticket holder or staff)."
    )
    tickets_by_user = graphene.List(
        TicketType,
        user_id=graphene.Int(required=True),
        description="Retrieve tickets for a target user ID (restricted to self or staff)."
    )

    all_participations = graphene.List(
        ParticipationType,
        description="Retrieve attendance/participation records (self or all if staff)."
    )
    participation_by_id = graphene.Field(
        ParticipationType,
        id=graphene.Int(required=True),
        description="Retrieve a single participation record by ID (restricted to participant or staff)."
    )
    participations_by_user = graphene.List(
        ParticipationType,
        user_id=graphene.Int(required=True),
        description="Retrieve participations for a target user ID (restricted to self or staff)."
    )

    # ── Feature 1: Invitations ──────────────────────────────────────────────────
    my_invitation_codes = graphene.List(
        InvitationCodeType,
        description="Retrieve all invitation codes created by the authenticated user."
    )

    # ── Feature 3: Friendships ──────────────────────────────────────────────────
    my_friends = graphene.List(
        UserType,
        description="Retrieve the list of confirmed friends (accepted friendship in either direction)."
    )
    my_friend_requests = graphene.List(
        FriendshipType,
        description="Retrieve incoming pending friend requests addressed to the authenticated user."
    )
    pending_friend_requests = graphene.List(
        FriendshipType,
        description="Alias to retrieve pending friend requests received by the authenticated user."
    )

    # ── Feature 4: Event RSVPs ──────────────────────────────────────────────────
    event_rsvps = graphene.List(
        EventRSVPType,
        event_id=graphene.Int(required=True),
        description="Retrieve all RSVP responses associated with a specific event ID."
    )
    my_rsvps = graphene.List(
        EventRSVPType,
        description="Retrieve all RSVP records submitted by the authenticated user."
    )

    # ── Feature 5: Matches & Messages ───────────────────────────────────────────
    my_matches = graphene.List(
        MatchType,
        status=graphene.String(required=False),
        description="Retrieve all matches involving the authenticated user with optional status filter ('pending', 'accepted', 'rejected')."
    )
    pending_connection_requests = graphene.List(
        MatchType,
        description="Retrieve incoming pending connection/match requests addressed to the authenticated user."
    )
    my_connection_requests = graphene.List(
        MatchType,
        description="Alias to retrieve incoming pending connection/match requests for the authenticated user."
    )
    messages_by_match = graphene.List(
        MessageType,
        match_id=graphene.Int(required=True),
        description="Retrieve the message history for a match (restricted to participants of the match)."
    )

    # ── Feature 7: Extended Profile ─────────────────────────────────────────────
    user_profile_by_id = graphene.Field(
        UserProfileType,
        user_id=graphene.Int(required=True),
        description="Retrieve extended profile data (bio, location, photo) for a user (restricted to self or staff)."
    )

    # ────────────────────────────────────────────────────────────────────────────
    # Query Resolvers
    # ────────────────────────────────────────────────────────────────────────────

    def resolve_all_hobby_categories(self, info):
        """Retrieve all hobby categories with their child hobbies prefetched.

        Args:
            info (graphene.ResolveInfo): Execution context and query metadata.

        Returns:
            django.db.models.QuerySet[HobbyCategory]: All hobby categories with prefetched hobbies.
        """
        # Prefetch child hobbies to prevent N+1 queries during GraphQL traversal
        return HobbyCategory.objects.prefetch_related('hobbies').all()

    def resolve_all_hobbies(self, info):
        """Retrieve all hobby taxonomy items with parent category joined.

        Args:
            info (graphene.ResolveInfo): Execution context and query metadata.

        Returns:
            django.db.models.QuerySet[Hobby]: All hobbies with their parent category preloaded.
        """
        # Select related parent category for efficient single-query join
        return Hobby.objects.select_related('category').all()

    def resolve_my_profile(self, info):
        """Fetch the currently authenticated user entity.

        Args:
            info (graphene.ResolveInfo): Execution context containing request and user auth state.

        Returns:
            User | None: The Django User instance if authenticated; otherwise None.
        """
        user = info.context.user
        if user and user.is_authenticated:
            return user
        return None

    def resolve_all_users(self, info, radius_km=50.0, latitude=None, longitude=None):
        """Fetch users ordered by shared hobby affinity and geographic distance."""
        user = info.context.user
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )

    def resolve_get_recommended_users(self, info, radius_km=50.0, latitude=None, longitude=None):
        """Location-first recommendation resolver filtering by radius and ranking by affinity score."""
        user = info.context.user
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )

    def resolve_recommended_users(self, info, radius_km=50.0, latitude=None, longitude=None):
        """Alias for location-first user recommendations."""
        user = info.context.user
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )

    @login_required
    def resolve_user_by_id(self, info, id):
        """Retrieve a specific user by primary key ID.

        Requires authentication.

        Args:
            info (graphene.ResolveInfo): Execution context.
            id (int): Primary key ID of the target user.

        Returns:
            User | None: The matching User instance if found; otherwise None.
        """
        try:
            return User.objects.get(id=id)
        except User.DoesNotExist:
            return None

    def resolve_all_communities(self, info):
        """Retrieve all communities hosted on the platform.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[Community]: All Community records.
        """
        return Community.objects.prefetch_related('hobbies', 'memberships').select_related('creator').all()

    def resolve_recommended_circles(self, info, radius_km=50.0, latitude=None, longitude=None):
        """Retrieve recommended circles/communities for the authenticated user,
        scored and ordered by shared hobby affinity and geographic distance.
        """
        user = info.context.user
        return calculate_circle_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )

    def resolve_get_recommended_circles(self, info, radius_km=50.0, latitude=None, longitude=None):
        """Location-first recommendation resolver filtering physical circles by radius and ranking by affinity score."""
        user = info.context.user
        return calculate_circle_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )

    def resolve_community_by_id(self, info, id):
        """Retrieve a single community by primary key.

        Args:
            info (graphene.ResolveInfo): Execution context.
            id (int): Database ID of the community.

        Returns:
            Community | None: The matching Community instance if found; otherwise None.
        """
        try:
            return Community.objects.get(id=id)
        except Community.DoesNotExist:
            return None

    def resolve_community_by_subdomain(self, info, subdomain):
        """Look up a white-label community by its unique subdomain slug.

        Args:
            info (graphene.ResolveInfo): Execution context.
            subdomain (str): Subdomain identifier (e.g. 'runners', 'tech-club').

        Returns:
            Community | None: The matching Community instance if found; otherwise None.
        """
        try:
            return Community.objects.get(subdomain=subdomain)
        except Community.DoesNotExist:
            return None

    @login_required
    def resolve_my_communities(self, info):
        """Retrieve all community memberships for the authenticated user.

        Args:
            info (graphene.ResolveInfo): Execution context with authenticated user.

        Returns:
            django.db.models.QuerySet[CommunityMembership]: Memberships linked to the caller.
        """
        user = info.context.user
        return CommunityMembership.objects.filter(user=user).select_related('community')

    @login_required
    def resolve_discovery_events(
        self,
        info,
        tags=None,
        start_date=None,
        end_date=None,
        has_spots=None,
        latitude=None,
        longitude=None,
        radius_km=10.0,
    ):
        """Personalized event discovery feed generator.

        Filters upcoming events by:
            1. Temporal relevance: `scheduled_date >= now()`.
            2. Conflict & Ownership exclusion: Excludes events created by the caller,
               as well as events where the caller already has a ticket, participation,
               or accepted ('going') RSVP.
            3. Tag / Hobby category matches.
            4. Start/End date window.
            5. Available capacity (`current_participants_count < max_participants`).
            6. Haversine geographic radius filtering (within `radius_km`).
            7. Personalization ranking: Orders by shared hobby affinity score, then date.

        Args:
            info (graphene.ResolveInfo): Execution context.
            tags (list[str], optional): Tag or hobby names to filter by.
            start_date (datetime, optional): Earliest scheduled event date.
            end_date (datetime, optional): Latest scheduled event date.
            has_spots (bool, optional): If True, filters only events with open capacity.
            latitude (float, optional): Center latitude for radius search.
            longitude (float, optional): Center longitude for radius search.
            radius_km (float, optional): Search radius in kilometers (default: 10.0).

        Returns:
            django.db.models.QuerySet[Event]: Filtered and ranked event feed.
        """
        # ── 1. User & Auth Resolution with Debug Logging ────────────────────
        # Handle cases where context wraps a standard Django request or Graphene context
        user = getattr(info.context, 'user', None)
        if (user is None or not getattr(user, 'is_authenticated', False)) and hasattr(info.context, 'request'):
            req_user = getattr(info.context.request, 'user', None)
            if req_user is not None:
                user = req_user

        if not user or not user.is_authenticated:
            print("🔴 BACKEND WARNING: Token received but user is still Anonymous. Check Middleware!")
            return Event.objects.none()
        else:
            print(f"🟢 BACKEND SUCCESS: User recognized as {user.username}")

        now = timezone.now()

        # ── 2. Base QuerySet: upcoming events only ───────────────────────────
        queryset = (
            Event.objects
            .select_related('community', 'creator')
            .prefetch_related('hobbies')
            .filter(scheduled_date__gte=now)
        )

        # ── 3. Exclude Own Events & Confirmed Attendance ─────────────────────
        # Excludes:
        #   - Events created by the user (creator == user)
        #   - Events where user is already registered in participations
        #   - Events where user purchased a ticket
        #   - Events where user responded 'going' in RSVP
        queryset = queryset.exclude(creator=user).exclude(
            Q(participations__user=user) | 
            Q(tickets__user=user) | 
            Q(rsvps__user=user, rsvps__response='going')
        )

        # ── 4. Advanced Filter: tags (List of Strings) ──────────────────────
        if tags:
            if hasattr(Event, 'tags'):
                queryset = queryset.filter(tags__name__in=tags).distinct()
            else:
                # Match against hobby name or parent hobby category name
                queryset = queryset.filter(
                    Q(hobbies__name__in=tags) | Q(hobbies__category__name__in=tags)
                ).distinct()

        # ── 5. Advanced Filter: start_date & end_date (DateTime range) ──────
        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)

        # ── 6. Advanced Filter: has_spots (Boolean) ──────────────────────────
        if has_spots:
            count_target = 'participants' if hasattr(Event, 'participants') else 'participations'
            queryset = queryset.annotate(
                current_participants_count=Count(count_target, distinct=True)
            )
            if hasattr(Event, 'max_participants'):
                # Keep events with unlimited spots (NULL) or spots remaining
                queryset = queryset.filter(
                    Q(max_participants__isnull=True) | Q(current_participants_count__lt=F('max_participants'))
                )

        # ── 7. Geolocation Haversine Filtering ───────────────────────────────
        if latitude is not None and longitude is not None:
            # Trigonometric Haversine formula calculation on DB level
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(latitude))) * Cos(Radians(F('latitude'))) *
                Cos(Radians(F('longitude')) - Radians(Value(longitude))) +
                Sin(Radians(Value(latitude))) * Sin(Radians(F('latitude')))
            )
            queryset = queryset.annotate(distance=distance_expr).filter(distance__lte=radius_km)

        # ── 8. Rank by User Hobby Affinity Score & Chronological Order ───────
        try:
            user_hobbies = list(user.profile.hobbies.values_list('id', flat=True))
            if user_hobbies:
                # Rank first by number of shared hobbies, then by event date
                queryset = queryset.annotate(
                    affinity_score=Count(
                        'hobbies',
                        filter=Q(hobbies__in=user_hobbies),
                        distinct=True
                    )
                ).order_by('-affinity_score', 'scheduled_date')
            else:
                queryset = queryset.order_by('scheduled_date')
        except UserProfile.DoesNotExist:
            queryset = queryset.order_by('scheduled_date')

        return queryset

    def resolve_all_events(
        self,
        info,
        tags=None,
        start_date=None,
        end_date=None,
        has_spots=None,
        latitude=None,
        longitude=None,
        radius_km=10.0,
        upcoming_only=True,
        creator_id=None,
    ):
        """Query all events with comprehensive filtering and proximity search.

        Unlike `discovery_events`, this endpoint can be queried anonymously and supports
        querying past events (`upcoming_only=False`) and specific creator IDs.

        Args:
            info (graphene.ResolveInfo): Execution context.
            tags (list[str], optional): Hobby or tag names.
            start_date (datetime, optional): Earliest date filter.
            end_date (datetime, optional): Latest date filter.
            has_spots (bool, optional): Restrict to events with open spots.
            latitude (float, optional): Center latitude coordinate.
            longitude (float, optional): Center longitude coordinate.
            radius_km (float, optional): Distance radius in kilometers.
            upcoming_only (bool, optional): If True, filters `scheduled_date >= now()`.
            creator_id (int, optional): Filter by event creator's user ID.

        Returns:
            django.db.models.QuerySet[Event]: Filtered Event QuerySet.
        """
        user = getattr(info.context, 'user', None)
        if (user is None or not getattr(user, 'is_authenticated', False)) and hasattr(info.context, 'request'):
            req_user = getattr(info.context.request, 'user', None)
            if req_user is not None:
                user = req_user

        if not user or not user.is_authenticated:
            print("🔴 BACKEND WARNING: Token received but user is still Anonymous. Check Middleware!")
        else:
            print(f"🟢 BACKEND SUCCESS: User recognized as {user.username}")

        queryset = Event.objects.select_related('community', 'creator').prefetch_related('hobbies').all()

        # Filter by specific organizer/creator
        if creator_id is not None:
            queryset = queryset.filter(creator_id=creator_id)

        # Filter by scheduled timeframe
        if upcoming_only:
            queryset = queryset.filter(scheduled_date__gte=timezone.now())

        # Exclude own events and confirmed events when user is authenticated
        if user and user.is_authenticated:
            queryset = queryset.exclude(creator=user).exclude(
                Q(participations__user=user) | 
                Q(tickets__user=user) | 
                Q(rsvps__user=user, rsvps__response='going')
            )

        # Tag and hobby category matching
        if tags:
            if hasattr(Event, 'tags'):
                queryset = queryset.filter(tags__name__in=tags).distinct()
            else:
                queryset = queryset.filter(
                    Q(hobbies__name__in=tags) | Q(hobbies__category__name__in=tags)
                ).distinct()

        # Date range constraints
        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)

        # Capacity filter
        if has_spots:
            if hasattr(Event, 'participants'):
                queryset = queryset.annotate(
                    current_participants_count=Count('participants', distinct=True)
                )
            else:
                queryset = queryset.annotate(
                    current_participants_count=Count('participations', distinct=True)
                )

            if hasattr(Event, 'max_participants'):
                queryset = queryset.filter(
                    Q(max_participants__isnull=True) | Q(current_participants_count__lt=F('max_participants'))
                )

        # Haversine distance constraint
        if latitude is not None and longitude is not None:
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(latitude))) * Cos(Radians(F('latitude'))) *
                Cos(Radians(F('longitude')) - Radians(Value(longitude))) +
                Sin(Radians(Value(latitude))) * Sin(Radians(F('latitude')))
            )
            queryset = queryset.annotate(distance=distance_expr).filter(distance__lte=radius_km)

        # Personalization ranking if authenticated
        if user and user.is_authenticated:
            try:
                user_hobbies = list(user.profile.hobbies.values_list('id', flat=True))
                if user_hobbies:
                    queryset = queryset.annotate(
                        affinity_score=Count(
                            'hobbies',
                            filter=Q(hobbies__in=user_hobbies),
                            distinct=True
                        )
                    ).order_by('-affinity_score', 'scheduled_date')
                else:
                    queryset = queryset.order_by('scheduled_date')
            except UserProfile.DoesNotExist:
                queryset = queryset.order_by('scheduled_date')
        else:
            queryset = queryset.order_by('scheduled_date')

        return queryset

    @login_required
    def resolve_my_created_events(self, info, upcoming_only=False):
        """Retrieve events created by the currently authenticated user.

        Args:
            info (graphene.ResolveInfo): Execution context.
            upcoming_only (bool, optional): If True, filters out past events.

        Returns:
            django.db.models.QuerySet[Event]: QuerySet of created events sorted newest first.
        """
        user = info.context.user
        queryset = Event.objects.filter(creator=user).select_related('community', 'creator').order_by('-scheduled_date')
        if upcoming_only:
            queryset = queryset.filter(scheduled_date__gte=timezone.now())
        return queryset

    def resolve_event_by_id(self, info, id):
        """Retrieve a single event by primary key ID.

        Args:
            info (graphene.ResolveInfo): Execution context.
            id (int): Primary key ID of the event.

        Returns:
            Event | None: Event model instance if found; otherwise None.
        """
        try:
            return Event.objects.get(id=id)
        except Event.DoesNotExist:
            return None

    def resolve_events_by_community(self, info, community_id):
        """Retrieve all events hosted within a given community ID.

        Args:
            info (graphene.ResolveInfo): Execution context.
            community_id (int): Primary key ID of the community.

        Returns:
            django.db.models.QuerySet[Event]: Events belonging to the community.
        """
        return Event.objects.filter(community_id=community_id)

    @login_required
    def resolve_all_tickets(self, info):
        """Retrieve ticket records with access control.

        Staff users can view all tickets across the platform; regular users
        are strictly restricted to their own tickets.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[Ticket]: Accessible ticket records.
        """
        user = info.context.user
        if user.is_staff:
            return Ticket.objects.select_related('user', 'event').all()
        return Ticket.objects.filter(user=user).select_related('user', 'event')

    @login_required
    def resolve_ticket_by_id(self, info, id):
        """Retrieve a single ticket by ID with ownership verification.

        Args:
            info (graphene.ResolveInfo): Execution context.
            id (int): Primary key of the ticket.

        Returns:
            Ticket | None: The Ticket object if the caller is the owner or staff; otherwise None.
        """
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
        """Retrieve tickets for a target user ID with privacy enforcement.

        Args:
            info (graphene.ResolveInfo): Execution context.
            user_id (int): Target user ID.

        Returns:
            django.db.models.QuerySet[Ticket]: Tickets if caller matches user_id or is staff; otherwise empty.
        """
        user = info.context.user
        if user.id == user_id or user.is_staff:
            return Ticket.objects.filter(user_id=user_id).select_related('user', 'event')
        return Ticket.objects.none()

    @login_required
    def resolve_all_participations(self, info):
        """Retrieve participation records with staff-aware scoping.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[Participation]: Participations for caller, or all if staff.
        """
        user = info.context.user
        if user.is_staff:
            return Participation.objects.select_related('user', 'event').all()
        return Participation.objects.filter(user=user).select_related('user', 'event')

    @login_required
    def resolve_participation_by_id(self, info, id):
        """Retrieve a single participation record by ID with ownership enforcement.

        Args:
            info (graphene.ResolveInfo): Execution context.
            id (int): Primary key ID of the participation.

        Returns:
            Participation | None: Participation instance if caller is owner or staff; else None.
        """
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
        """Retrieve participation records for a specific user ID.

        Args:
            info (graphene.ResolveInfo): Execution context.
            user_id (int): Primary key ID of the target user.

        Returns:
            django.db.models.QuerySet[Participation]: Participations if caller matches user_id or is staff.
        """
        user = info.context.user
        if user.id == user_id or user.is_staff:
            return Participation.objects.filter(user_id=user_id).select_related('user', 'event')
        return Participation.objects.none()

    # ── Feature 1: Invitations ──────────────────────────────────────────────────
    @login_required
    def resolve_my_invitation_codes(self, info):
        """Retrieve all invitation codes issued by the authenticated user.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[InvitationCode]: QuerySet ordered by creation date descending.
        """
        user = info.context.user
        return InvitationCode.objects.filter(created_by=user).order_by('-created_at')

    # ── Feature 3: Friendships ──────────────────────────────────────────────────
    @login_required
    def resolve_my_friends(self, info):
        """Retrieve all confirmed friends for the authenticated user.

        Computes the union of accepted friendships in both directions
        (from_user -> to_user and to_user -> from_user).

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[User]: QuerySet of confirmed friend User entities.
        """
        user = info.context.user
        # Collect IDs of friends where the current user sent the accepted request
        sent = Friendship.objects.filter(from_user=user, status='accepted').values_list('to_user_id', flat=True)
        # Collect IDs of friends where the current user received and accepted the request
        received = Friendship.objects.filter(to_user=user, status='accepted').values_list('from_user_id', flat=True)
        friend_ids = set(sent) | set(received)
        return User.objects.filter(id__in=friend_ids).select_related('profile').prefetch_related('profile__hobbies__category')

    @login_required
    def resolve_my_friend_requests(self, info):
        """Retrieve incoming pending friend requests addressed to the caller.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[Friendship]: Pending friendships awaiting action by the caller.
        """
        user = info.context.user
        return Friendship.objects.filter(
            to_user=user,
            status='pending'
        ).select_related(
            'from_user', 'from_user__profile'
        ).prefetch_related(
            'from_user__profile__hobbies__category'
        )

    @login_required
    def resolve_pending_friend_requests(self, info):
        """Retrieve pending friend requests for the caller (convenience alias).

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[Friendship]: Pending incoming friendships.
        """
        user = info.context.user
        return Friendship.objects.filter(
            to_user=user,
            status='pending'
        ).select_related(
            'from_user', 'from_user__profile'
        ).prefetch_related(
            'from_user__profile__hobbies__category'
        )

    # ── Feature 4: Event RSVPs ──────────────────────────────────────────────────
    @login_required
    def resolve_event_rsvps(self, info, event_id):
        """Retrieve all RSVP records for a specific event.

        Args:
            info (graphene.ResolveInfo): Execution context.
            event_id (int): Primary key ID of the target event.

        Returns:
            django.db.models.QuerySet[EventRSVP]: RSVPs with user and event joined.
        """
        return EventRSVP.objects.filter(event_id=event_id).select_related('user', 'event')

    @login_required
    def resolve_my_rsvps(self, info):
        """Retrieve all event RSVPs created by the authenticated user.

        Args:
            info (graphene.ResolveInfo): Execution context.

        Returns:
            django.db.models.QuerySet[EventRSVP]: User's RSVP records with event preloaded.
        """
        user = info.context.user
        return EventRSVP.objects.filter(user=user).select_related('event')

    # ── Feature 5: Matches & Messages ───────────────────────────────────────────
    @login_required
    def resolve_my_matches(self, info, status=None):
        """Retrieve matches involving the authenticated user.
        Optional status filter ('pending', 'accepted', 'rejected').
        """
        user = info.context.user
        qs = Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user)
        ).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        )
        if status:
            qs = qs.filter(status=status.lower())
        return qs

    @login_required
    def resolve_pending_connection_requests(self, info):
        """Retrieve incoming pending connection requests for the authenticated user."""
        user = info.context.user
        return Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user),
            status='pending'
        ).exclude(initiator=user).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        )

    @login_required
    def resolve_my_connection_requests(self, info):
        """Alias for incoming pending connection requests."""
        user = info.context.user
        return Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user),
            status='pending'
        ).exclude(initiator=user).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        )

    @login_required
    def resolve_messages_by_match(self, info, match_id):
        """Retrieve chat messages within a match thread.

        Enforces privacy by ensuring the requester is one of the two participants.

        Args:
            info (graphene.ResolveInfo): Execution context.
            match_id (int): Primary key ID of the Match thread.

        Returns:
            list[Message] | django.db.models.QuerySet[Message]: Messages in the thread, or empty list if unauthorized.
        """
        user = info.context.user
        try:
            match = Match.objects.get(id=match_id)
            # Authorize: ensure requester is a member of the matched pair
            if user != match.user1 and user != match.user2:
                return []
            return Message.objects.filter(match_id=match_id).select_related('sender', 'match')
        except Match.DoesNotExist:
            return []

    # ── Feature 7: User Profile ─────────────────────────────────────────────────
    @login_required
    def resolve_user_profile_by_id(self, info, user_id):
        """Retrieve extended UserProfile data for a target user ID.

        Enforces access control: callers can only access their own profile unless they have staff status.

        Args:
            info (graphene.ResolveInfo): Execution context.
            user_id (int): Primary key ID of the target user.

        Returns:
            UserProfile | None: The UserProfile instance if permitted; otherwise None.
        """
        user = info.context.user
        if user.id == user_id or user.is_staff:
            try:
                return UserProfile.objects.get(user_id=user_id)
            except UserProfile.DoesNotExist:
                return None
        return None
