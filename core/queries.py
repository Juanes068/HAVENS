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
from graphql import GraphQLError
from django.contrib.auth.models import User
from django.db import models as django_models
from django.db.models import F, Value, Q, Count
from django.db.models.functions import ACos, Cos, Sin, Radians
from django.utils import timezone
from .types import (
    UserType, UserProfileType, CommunityType, CommunityMembershipType,
    EventType, TicketType, ParticipationType, InvitationCodeType,
    EventRSVPType, FriendshipType, MatchType, MessageType, CircleMessageType,
    HobbyCategoryType, HobbyType,
)
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    CommunityMembership, InvitationCode, EventRSVP, Friendship,
    Match, Message, CircleMessage, HobbyCategory, Hobby,
)
from .utils import filter_events_by_radius, calculate_user_recommendations, calculate_circle_recommendations
from .decorators import login_required
from .permissions import (
    get_request_user,
    get_user_visible_events_q,
    require_authenticated_user,
    require_event_access,
    require_owner_or_staff,
    user_can_view_event_rsvps,
    user_is_community_member,
)


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
        limit=graphene.Int(required=False, description="Max number of profiles to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve users ranked by hobby affinity score and physical proximity with pagination."
    )
    get_recommended_users = graphene.List(
        UserType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        limit=graphene.Int(required=False, description="Max number of profiles to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Location-first recommended users filtered by Haversine radius, sorted by affinity score, and paginated."
    )
    recommended_users = graphene.List(
        UserType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        limit=graphene.Int(required=False, description="Max number of profiles to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Alias for recommended users matching query with pagination support."
    )
    user_by_id = graphene.Field(
        UserType,
        id=graphene.Int(required=True),
        description="Look up a specific user account by its primary key ID."
    )
    user_by_username = graphene.Field(
        UserType,
        username=graphene.String(required=True),
        description="Look up a specific user account by its username or handle."
    )
    search_users = graphene.List(
        UserType,
        query=graphene.String(required=True),
        limit=graphene.Int(required=False, default_value=50),
        offset=graphene.Int(required=False, default_value=0),
        description="Global search for user profiles across the entire database ignoring location, radius, and match affinity."
    )

    # ── Communities ─────────────────────────────────────────────────────────────
    all_communities = graphene.List(
        CommunityType,
        limit=graphene.Int(required=False, description="Max number of communities to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve all communities on the Havens platform."
    )
    search_communities = graphene.List(
        CommunityType,
        query=graphene.String(required=True),
        limit=graphene.Int(required=False, default_value=50),
        offset=graphene.Int(required=False, default_value=0),
        description="Global search for circles/communities across the entire database ignoring location, radius, and match affinity."
    )
    recommended_circles = graphene.List(
        CommunityType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        limit=graphene.Int(required=False, description="Max number of circles to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve recommended circles/communities scored by hobby affinity & distance."
    )
    get_recommended_circles = graphene.List(
        CommunityType,
        radius_km=graphene.Float(required=False, default_value=50.0),
        latitude=graphene.Float(required=False),
        longitude=graphene.Float(required=False),
        limit=graphene.Int(required=False, description="Max number of circles to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
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
        limit=graphene.Int(required=False, description="Max number of memberships to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve all community memberships belonging to the authenticated user."
    )
    community_members = graphene.List(
        CommunityMembershipType,
        community_id=graphene.Int(required=True, description="Primary key ID of the circle"),
        description="Retrieve all joined members for a specific circle / community."
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
        limit=graphene.Int(required=False, description="Max number of friends to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve the list of confirmed friends (accepted friendship in either direction)."
    )
    my_friend_requests = graphene.List(
        FriendshipType,
        limit=graphene.Int(required=False, description="Max number of requests to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve incoming pending friend requests addressed to the authenticated user."
    )
    pending_friend_requests = graphene.List(
        FriendshipType,
        limit=graphene.Int(required=False, description="Max number of requests to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
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
        limit=graphene.Int(required=False, description="Max number of matches to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve all matches involving the authenticated user with optional status filter ('pending', 'accepted', 'rejected')."
    )
    pending_connection_requests = graphene.List(
        MatchType,
        limit=graphene.Int(required=False, description="Max number of requests to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Retrieve incoming pending connection/match requests addressed to the authenticated user."
    )
    my_connection_requests = graphene.List(
        MatchType,
        limit=graphene.Int(required=False, description="Max number of requests to return"),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination"),
        description="Alias to retrieve incoming pending connection/match requests for the authenticated user."
    )
    messages_by_match = graphene.List(
        MessageType,
        match_id=graphene.Int(required=True),
        description="Retrieve the message history for a match (restricted to participants of the match)."
    )

    # ── Feature: Circle Group Chat ──────────────────────────────────────────────
    get_circle_messages = graphene.List(
        CircleMessageType,
        circle_id=graphene.ID(required=True, description="Primary key ID of the target Circle."),
        limit=graphene.Int(required=False, description="Max number of messages to return."),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination."),
        description="Retrieve group chat message history for a specific Circle (restricted to confirmed Circle members)."
    )
    circle_messages = graphene.List(
        CircleMessageType,
        circle_id=graphene.ID(required=True, description="Primary key ID of the target Circle."),
        limit=graphene.Int(required=False, description="Max number of messages to return."),
        offset=graphene.Int(required=False, default_value=0, description="Offset starting index for pagination."),
        description="Alias to retrieve group chat message history for a specific Circle."
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
        """Fetch the currently authenticated user entity."""
        return require_authenticated_user(info)

    @login_required
    def resolve_all_users(self, info, radius_km=50.0, latitude=None, longitude=None, limit=None, offset=0):
        """Fetch users ordered by shared hobby affinity and geographic distance with pagination."""
        user = require_authenticated_user(info)
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit,
            offset=offset
        )

    @login_required
    def resolve_get_recommended_users(self, info, radius_km=50.0, latitude=None, longitude=None, limit=None, offset=0):
        """Location-first recommendation resolver filtering by radius and ranking by affinity score with pagination."""
        user = require_authenticated_user(info)
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit,
            offset=offset
        )

    @login_required
    def resolve_recommended_users(self, info, radius_km=50.0, latitude=None, longitude=None, limit=None, offset=0):
        """Alias for location-first user recommendations with pagination."""
        user = require_authenticated_user(info)
        return calculate_user_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit,
            offset=offset
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

    @login_required
    def resolve_user_by_username(self, info, username):
        """Retrieve a specific user by username (case-insensitive match) with ID fallback.

        Requires authentication.

        Args:
            info (graphene.ResolveInfo): Execution context.
            username (str): Username or handle of the target user.

        Returns:
            User | None: The matching User instance if found; otherwise None.
        """
        clean_username = (username or '').strip().lstrip('@')
        if not clean_username:
            return None
        try:
            return User.objects.get(username__iexact=clean_username)
        except User.DoesNotExist:
            if clean_username.isdigit():
                try:
                    return User.objects.get(id=int(clean_username))
                except User.DoesNotExist:
                    pass
            return None

    @login_required
    def resolve_search_users(self, info, query, limit=50, offset=0):
        """Global search for user profiles across the entire database ignoring location, radius, and match affinity."""
        require_authenticated_user(info)
        q = (query or '').strip()
        if not q:
            return User.objects.none()

        user = get_request_user(info)
        qs = User.objects.filter(
            Q(username__icontains=q) |
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q) |
            Q(profile__bio__icontains=q) |
            Q(profile__neighbourhood__icontains=q) |
            Q(profile__city_name__icontains=q) |
            Q(profile__hobbies__name__icontains=q)
        ).distinct().select_related('profile').prefetch_related(
            'profile__hobbies__category'
        )

        if user and user.is_authenticated:
            qs = qs.exclude(id=user.id)

        qs = qs.order_by('username')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    def resolve_all_communities(self, info, limit=None, offset=0):
        """Retrieve all communities hosted on the platform with pagination support."""
        qs = Community.objects.prefetch_related('hobbies', 'memberships').select_related('creator').all().order_by('-created_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    def resolve_search_communities(self, info, query, limit=50, offset=0):
        """Global search for circles/communities across the entire database ignoring location, radius, and match affinity."""
        q = (query or '').strip()
        if not q:
            return Community.objects.none()

        qs = Community.objects.filter(
            Q(name__icontains=q) |
            Q(description__icontains=q) |
            Q(location__icontains=q) |
            Q(creator__username__icontains=q) |
            Q(hobbies__name__icontains=q)
        ).distinct().prefetch_related('hobbies', 'memberships').select_related('creator').order_by('-created_at')

        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_recommended_circles(self, info, radius_km=50.0, latitude=None, longitude=None, limit=None, offset=0):
        """Retrieve recommended circles/communities with limit/offset pagination."""
        user = require_authenticated_user(info)
        results = calculate_circle_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )
        if offset:
            results = results[offset:]
        if limit is not None:
            results = results[:limit]
        return results

    @login_required
    def resolve_get_recommended_circles(self, info, radius_km=50.0, latitude=None, longitude=None, limit=None, offset=0):
        """Location-first recommendation resolver with limit/offset pagination."""
        user = require_authenticated_user(info)
        results = calculate_circle_recommendations(
            user=user,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )
        if offset:
            results = results[offset:]
        if limit is not None:
            results = results[:limit]
        return results

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
    def resolve_my_communities(self, info, limit=None, offset=0):
        """Retrieve all community memberships for the authenticated user with pagination support."""
        user = info.context.user
        qs = CommunityMembership.objects.filter(user=user).select_related('community').order_by('-joined_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_community_members(self, info, community_id):
        """Retrieve all joined members of a specific circle with user and profile data."""
        user = require_authenticated_user(info)
        try:
            community = Community.objects.get(id=community_id)
        except Community.DoesNotExist:
            return []

        if not (user.is_staff or user_is_community_member(user, community)):
            raise GraphQLError(
                "Permission denied. You must be a member of this Circle to view its members."
            )

        return (
            CommunityMembership.objects
            .filter(community_id=community_id)
            .select_related('user', 'user__profile')
            .prefetch_related('user__profile__hobbies')
            .order_by('-joined_at')
        )

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
        user = require_authenticated_user(info)
        now = timezone.now()

        # ── 2. Base QuerySet: upcoming events only & visibility filtering ───
        queryset = (
            Event.objects
            .select_related('community', 'creator')
            .prefetch_related('hobbies')
            .filter(scheduled_date__gte=now)
            .filter(get_user_visible_events_q(user))
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

        # ── 7. Strict Geolocation Boundary Enforcement ───────────────────────
        ref_lat = latitude
        ref_lng = longitude

        if (ref_lat is None or ref_lng is None) and user and user.is_authenticated:
            try:
                profile = getattr(user, 'profile', None) or UserProfile.objects.get(user=user)
                if profile.latitude is not None and profile.longitude is not None:
                    ref_lat = profile.latitude
                    ref_lng = profile.longitude
                elif profile.city_name:
                    city_lower = profile.city_name.lower().strip()
                    if 'bogot' in city_lower or 'colombia' in city_lower:
                        ref_lat, ref_lng = 4.7110, -74.0721
                    elif any(c in city_lower for c in ['vancouver', 'richmond', 'burnaby', 'bc', 'canada']):
                        ref_lat, ref_lng = 49.2827, -123.1207
            except UserProfile.DoesNotExist:
                pass

        if ref_lat is not None and ref_lng is not None:
            effective_radius = radius_km if (radius_km is not None and radius_km > 0) else 60.0
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(ref_lat))) * Cos(Radians(F('latitude'))) *
                Cos(Radians(F('longitude')) - Radians(Value(ref_lng))) +
                Sin(Radians(Value(ref_lat))) * Sin(Radians(F('latitude')))
            )
            queryset = queryset.filter(
                latitude__isnull=False,
                longitude__isnull=False
            ).annotate(distance=distance_expr).filter(distance__lte=effective_radius)

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
        radius_km=None,
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
        user = get_request_user(info)
        queryset = Event.objects.select_related('community', 'creator').prefetch_related('hobbies').all()

        # Strict Visibility & Community Access Control
        queryset = queryset.filter(get_user_visible_events_q(user))

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

        # Strict Geolocation Boundary Enforcement
        ref_lat = latitude
        ref_lng = longitude

        if (ref_lat is None or ref_lng is None) and user and user.is_authenticated:
            try:
                profile = getattr(user, 'profile', None) or UserProfile.objects.get(user=user)
                if profile.latitude is not None and profile.longitude is not None:
                    ref_lat = profile.latitude
                    ref_lng = profile.longitude
                elif profile.city_name:
                    city_lower = profile.city_name.lower().strip()
                    if 'bogot' in city_lower or 'colombia' in city_lower:
                        ref_lat, ref_lng = 4.7110, -74.0721
                    elif any(c in city_lower for c in ['vancouver', 'richmond', 'burnaby', 'bc', 'canada']):
                        ref_lat, ref_lng = 49.2827, -123.1207
            except UserProfile.DoesNotExist:
                pass

        if ref_lat is not None and ref_lng is not None:
            effective_radius = radius_km if (radius_km is not None and radius_km > 0) else 60.0
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(ref_lat))) * Cos(Radians(F('latitude'))) *
                Cos(Radians(F('longitude')) - Radians(Value(ref_lng))) +
                Sin(Radians(Value(ref_lat))) * Sin(Radians(F('latitude')))
            )
            queryset = queryset.filter(
                latitude__isnull=False,
                longitude__isnull=False
            ).annotate(distance=distance_expr).filter(distance__lte=effective_radius)

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
        """Retrieve a single event by primary key ID with visibility enforcement."""
        try:
            event = Event.objects.select_related('community', 'creator').get(id=id)
        except Event.DoesNotExist:
            return None

        require_event_access(info, event)
        return event

    @login_required
    def resolve_events_by_community(self, info, community_id):
        """Retrieve all events hosted within a given community ID."""
        user = require_authenticated_user(info)
        try:
            community = Community.objects.get(id=community_id)
        except Community.DoesNotExist:
            return Event.objects.none()

        if not (user.is_staff or user_is_community_member(user, community)):
            raise GraphQLError(
                "Permission denied. You must be a member of this Circle to view its events."
            )

        return Event.objects.filter(community_id=community_id).select_related('community', 'creator')

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
        """Retrieve a single ticket by ID with ownership verification."""
        user = require_authenticated_user(info)
        try:
            ticket = Ticket.objects.get(id=id)
        except Ticket.DoesNotExist:
            return None

        if ticket.user == user or user.is_staff:
            return ticket

        raise GraphQLError("Permission denied. You can only access your own tickets.")

    @login_required
    def resolve_tickets_by_user(self, info, user_id):
        """Retrieve tickets for a target user ID with privacy enforcement."""
        user = require_authenticated_user(info)
        if user.id == user_id or user.is_staff:
            return Ticket.objects.filter(user_id=user_id).select_related('user', 'event')

        raise GraphQLError("Permission denied. You can only access your own tickets.")

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
        """Retrieve a single participation record by ID with ownership enforcement."""
        user = require_authenticated_user(info)
        try:
            part = Participation.objects.get(id=id)
        except Participation.DoesNotExist:
            return None

        if part.user == user or user.is_staff:
            return part

        raise GraphQLError("Permission denied. You can only access your own participation records.")

    @login_required
    def resolve_participations_by_user(self, info, user_id):
        """Retrieve participation records for a specific user ID."""
        user = require_authenticated_user(info)
        if user.id == user_id or user.is_staff:
            return Participation.objects.filter(user_id=user_id).select_related('user', 'event')

        raise GraphQLError("Permission denied. You can only access your own participation records.")

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
    def resolve_my_friends(self, info, limit=None, offset=0):
        """Retrieve confirmed friends for the authenticated user with pagination support."""
        user = info.context.user
        # Collect IDs of friends where the current user sent the accepted request
        sent = Friendship.objects.filter(from_user=user, status='accepted').values_list('to_user_id', flat=True)
        # Collect IDs of friends where the current user received and accepted the request
        received = Friendship.objects.filter(to_user=user, status='accepted').values_list('from_user_id', flat=True)
        friend_ids = set(sent) | set(received)
        qs = User.objects.filter(id__in=friend_ids).select_related('profile').prefetch_related('profile__hobbies__category').order_by('username')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_my_friend_requests(self, info, limit=None, offset=0):
        """Retrieve incoming pending friend requests addressed to the caller with pagination."""
        user = info.context.user
        qs = Friendship.objects.filter(
            to_user=user,
            status='pending'
        ).select_related(
            'from_user', 'from_user__profile'
        ).prefetch_related(
            'from_user__profile__hobbies__category'
        ).order_by('-created_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_pending_friend_requests(self, info, limit=None, offset=0):
        """Retrieve pending friend requests for the caller with pagination."""
        user = info.context.user
        qs = Friendship.objects.filter(
            to_user=user,
            status='pending'
        ).select_related(
            'from_user', 'from_user__profile'
        ).prefetch_related(
            'from_user__profile__hobbies__category'
        ).order_by('-created_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    # ── Feature 4: Event RSVPs ──────────────────────────────────────────────────
    @login_required
    def resolve_event_rsvps(self, info, event_id):
        """Retrieve RSVP records for an event (creator, attendee, or community member only)."""
        user = require_authenticated_user(info)
        try:
            event = Event.objects.select_related('community').get(id=event_id)
        except Event.DoesNotExist:
            return EventRSVP.objects.none()

        if not user_can_view_event_rsvps(user, event):
            raise GraphQLError(
                "Permission denied. You do not have access to this event's RSVP list."
            )

        return EventRSVP.objects.filter(event_id=event_id).select_related(
            'user', 'user__profile', 'event'
        ).order_by('-updated_at')

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
    def resolve_my_matches(self, info, status=None, limit=None, offset=0):
        """Retrieve matches involving the authenticated user with pagination."""
        user = info.context.user
        qs = Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user)
        ).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        ).order_by('-updated_at')
        if status:
            qs = qs.filter(status=status.lower())
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_pending_connection_requests(self, info, limit=None, offset=0):
        """Retrieve incoming pending connection requests for the authenticated user with pagination."""
        user = info.context.user
        qs = Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user),
            status='pending'
        ).exclude(initiator=user).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        ).order_by('-created_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_my_connection_requests(self, info, limit=None, offset=0):
        """Alias for incoming pending connection requests with pagination."""
        user = info.context.user
        qs = Match.objects.filter(
            django_models.Q(user1=user) | django_models.Q(user2=user),
            status='pending'
        ).exclude(initiator=user).select_related(
            'user1', 'user2', 'initiator', 'user1__profile', 'user2__profile', 'initiator__profile'
        ).prefetch_related(
            'user1__profile__hobbies__category',
            'user2__profile__hobbies__category',
            'initiator__profile__hobbies__category'
        ).order_by('-created_at')
        if offset:
            qs = qs[offset:]
        if limit is not None:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_messages_by_match(self, info, match_id):
        """Retrieve chat messages within a match thread (participants only)."""
        user = require_authenticated_user(info)
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            return []

        if user != match.user1 and user != match.user2:
            raise GraphQLError("Permission denied. You are not a participant in this match.")

        return Message.objects.filter(match_id=match_id).select_related('sender', 'match')

    # ── Feature 7: User Profile ─────────────────────────────────────────────────
    @login_required
    def resolve_user_profile_by_id(self, info, user_id):
        """Retrieve extended UserProfile data with object-level access control."""
        user = require_authenticated_user(info)
        if user.id != user_id and not user.is_staff:
            raise GraphQLError("Permission denied. You can only access your own extended profile data.")

        try:
            return UserProfile.objects.get(user_id=user_id)
        except UserProfile.DoesNotExist:
            return None

    # ── Feature: Circle Group Chat ──────────────────────────────────────────────
    @login_required
    def resolve_get_circle_messages(self, info, circle_id, limit=None, offset=0):
        """Retrieve chat messages within a Circle group chat thread (members only)."""
        user = require_authenticated_user(info)

        circle_pk = int(circle_id) if str(circle_id).isdigit() else 0
        if not circle_pk:
            raise GraphQLError("Invalid Circle ID.")

        try:
            community = Community.objects.get(id=circle_pk)
        except Community.DoesNotExist:
            return []

        is_member = (
            user_is_community_member(user, community)
            or user.is_staff
        )
        if not is_member:
            raise GraphQLError(
                "Permission denied. You must be a member of this Circle to view messages."
            )

        qs = CircleMessage.objects.filter(circle=community).select_related(
            'sender', 'sender__profile'
        ).order_by('created_at')
        if offset:
            qs = qs[offset:]
        if limit:
            qs = qs[:limit]
        return qs

    @login_required
    def resolve_circle_messages(self, info, circle_id, limit=None, offset=0):
        """Alias resolver for get_circle_messages."""
        return Query.resolve_get_circle_messages(self, info, circle_id, limit, offset)
