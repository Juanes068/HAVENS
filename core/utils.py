from math import radians, cos, sin, asin, sqrt


def haversine_km(lat1, lon1, lat2, lon2):
    """Distance in km between two coordinate pairs."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


def filter_events_by_radius(queryset, latitude, longitude, radius_km):
    return [
        event for event in queryset
        if haversine_km(latitude, longitude, event.latitude, event.longitude) <= radius_km
    ]


def calculate_user_recommendations(user, queryset=None, latitude=None, longitude=None, radius_km=50.0):
    """
    Advanced Matching & Recommendation Engine with Strict Geographic Boundary.

    1. Strict Geographic Boundary (Database Level & Strict Filter):
       - If requester has coordinates (or coords are passed as args), apply the Haversine
         formula directly in SQL / DB and strictly filter candidates within radius_km.
       - Any profile outside radius_km is COMPLETELY EXCLUDED from the candidate set,
         regardless of hobby affinity.

    2. Affinity Scoring & Sorting:
       - ONLY profiles that pass the hard geographic boundary are scored.
       - Exact hobby match: +3 points
       - Related hobby (shared category): +1 point
       - Profiles are strictly sorted by highest affinity score first, then closest distance.
    """
    from django.contrib.auth.models import User
    from django.db.models import F, Value, Q
    from django.db.models.functions import ACos, Cos, Sin, Radians
    from .models import UserProfile, Hobby

    if queryset is None:
        queryset = User.objects.all()

    # Exclude current user
    if user and user.is_authenticated:
        queryset = queryset.exclude(id=user.id)

    # Determine reference coordinates
    ref_lat = latitude
    ref_lon = longitude

    user_profile = None
    user_hobbies = []
    user_hobby_ids = set()
    user_category_ids = set()

    if user and user.is_authenticated:
        try:
            user_profile = getattr(user, 'profile', None) or UserProfile.objects.get(user=user)
            if ref_lat is None and user_profile.latitude is not None:
                ref_lat = user_profile.latitude
            if ref_lon is None and user_profile.longitude is not None:
                ref_lon = user_profile.longitude
            user_hobbies = list(user_profile.hobbies.select_related('category').all())
            user_hobby_ids = {h.id for h in user_hobbies}
            user_category_ids = {h.category_id for h in user_hobbies}
        except UserProfile.DoesNotExist:
            pass

    # ── 1. STRICT GEOGRAPHIC BOUNDARY FIRST ──────────────────────────────────
    if ref_lat is not None and ref_lon is not None:
        # Strictly require candidates to have non-null coordinates
        queryset = queryset.filter(
            profile__latitude__isnull=False,
            profile__longitude__isnull=False
        )

        if radius_km is not None and radius_km > 0:
            # Haversine distance expression directly at the database level:
            # d = 6371 * acos(cos(lat1)*cos(lat2)*cos(lon2 - lon1) + sin(lat1)*sin(lat2))
            distance_expr = 6371 * ACos(
                Cos(Radians(Value(ref_lat))) * Cos(Radians(F('profile__latitude'))) *
                Cos(Radians(F('profile__longitude')) - Radians(Value(ref_lon))) +
                Sin(Radians(Value(ref_lat))) * Sin(Radians(F('profile__latitude')))
            )
            queryset = queryset.annotate(db_distance=distance_expr).filter(db_distance__lte=radius_km)

    # Prefetch profiles and hobbies only for candidates within the strict boundary
    queryset = queryset.select_related('profile').prefetch_related('profile__hobbies__category')

    results = []

    # ── 2. AFFINITY SCORING (ONLY FOR IN-BOUND PROFILES) ──────────────────────
    for candidate in queryset:
        profile = getattr(candidate, 'profile', None)
        if not profile:
            continue

        cand_lat = profile.latitude
        cand_lon = profile.longitude

        # Extra Python-level Haversine distance verification to guarantee zero leakage
        distance = None
        if ref_lat is not None and ref_lon is not None:
            if cand_lat is None or cand_lon is None:
                continue
            distance = haversine_km(ref_lat, ref_lon, cand_lat, cand_lon)
            if radius_km is not None and distance > radius_km:
                continue

        # Affinity Scoring: Exact vs Related (shared category)
        cand_hobbies = list(profile.hobbies.select_related('category').all())
        shared_hobbies = [h for h in cand_hobbies if h.id in user_hobby_ids]
        related_hobbies = [h for h in cand_hobbies if h.id not in user_hobby_ids and h.category_id in user_category_ids]

        exact_count = len(shared_hobbies)
        related_count = len(related_hobbies)

        affinity_score = (exact_count * 3) + (related_count * 1)

        # Match percentage calculation
        if user_hobby_ids:
            score_ratio = (exact_count * 1.0 + related_count * 0.4) / max(1, len(user_hobby_ids))
            match_percentage = min(99, max(20 if (shared_hobbies or related_hobbies) else 0, int(score_ratio * 100)))
        else:
            match_percentage = 0

        # Attach computed properties
        candidate.distance = round(distance, 1) if distance is not None else None
        candidate.affinity_score = affinity_score
        candidate.match_percentage = match_percentage
        candidate.shared_hobbies = shared_hobbies
        candidate.related_hobbies = related_hobbies

        results.append(candidate)

    # ── 3. SORTING ───────────────────────────────────────────────────────────
    # Sort strictly by highest affinity score first, then closest distance, then ID
    results.sort(key=lambda u: (
        -u.affinity_score,
        u.distance if u.distance is not None else 999999.0,
        -u.id
    ))

    return results


def calculate_circle_recommendations(user, queryset=None, latitude=None, longitude=None, radius_km=50.0):
    """
    Advanced Circle Recommendation Engine with Strict Geographic Boundary & Virtual Bypass.

    1. Location Filtering:
       - If circle is physical (has coordinates and is not is_virtual):
         Apply the Haversine formula directly in SQL/DB and strictly filter candidates within radius_km.
         Profiles outside radius_km are COMPLETELY EXCLUDED from the candidate set.
       - If circle is marked as "Virtual" (is_virtual=True or null coordinates):
         Bypass the distance filter and include it in the candidate pool.

    2. Affinity Scoring & Sorting:
       - Exact hobby match: +3 points
       - Related hobby (shared parent category): +1 point
       - Circles are strictly sorted by highest affinity score first, then closest distance, then ID.
    """
    from .models import Community, UserProfile, Hobby
    from django.db.models import F, Value, Q
    from django.db.models.functions import ACos, Cos, Sin, Radians

    if queryset is None:
        queryset = Community.objects.all()

    # Determine reference coordinates
    ref_lat = latitude
    ref_lon = longitude

    user_profile = None
    user_hobbies = []
    user_hobby_ids = set()
    user_category_ids = set()

    if user and user.is_authenticated:
        try:
            user_profile = getattr(user, 'profile', None) or UserProfile.objects.get(user=user)
            if ref_lat is None and user_profile.latitude is not None:
                ref_lat = user_profile.latitude
            if ref_lon is None and user_profile.longitude is not None:
                ref_lon = user_profile.longitude
            user_hobbies = list(user_profile.hobbies.select_related('category').all())
            user_hobby_ids = {h.id for h in user_hobbies}
            user_category_ids = {h.category_id for h in user_hobbies}
        except UserProfile.DoesNotExist:
            pass

    # ── 1. GEOGRAPHIC BOUNDARY & VIRTUAL BYPASS ─────────────────────────────
    if ref_lat is not None and ref_lon is not None and radius_km is not None and radius_km > 0:
        # Distance expression for physical circles
        distance_expr = 6371 * ACos(
            Cos(Radians(Value(ref_lat))) * Cos(Radians(F('latitude'))) *
            Cos(Radians(F('longitude')) - Radians(Value(ref_lon))) +
            Sin(Radians(Value(ref_lat))) * Sin(Radians(F('latitude')))
        )
        # Condition: Either Virtual (is_virtual=True or null coords) OR Physical within radius_km
        queryset = queryset.annotate(db_distance=distance_expr).filter(
            Q(is_virtual=True) |
            Q(latitude__isnull=True) |
            Q(longitude__isnull=True) |
            Q(db_distance__lte=radius_km)
        )

    # Prefetch creator, hobbies and categories
    queryset = queryset.select_related('creator', 'creator__profile').prefetch_related('hobbies__category', 'memberships')

    results = []

    # ── 2. AFFINITY SCORING (ONLY FOR IN-BOUND / VIRTUAL CIRCLES) ────────────
    for circle in queryset:
        cand_lat = circle.latitude
        cand_lon = circle.longitude
        is_virt = getattr(circle, 'is_virtual', False) or (cand_lat is None or cand_lon is None)

        distance = None
        if not is_virt and ref_lat is not None and ref_lon is not None:
            if cand_lat is not None and cand_lon is not None:
                distance = haversine_km(ref_lat, ref_lon, cand_lat, cand_lon)
                if radius_km is not None and distance > radius_km:
                    # Exclude physical circle outside strict boundary
                    continue

        circle_hobbies = list(circle.hobbies.all())
        shared_hobbies = [h for h in circle_hobbies if h.id in user_hobby_ids]
        related_hobbies = [h for h in circle_hobbies if h.id not in user_hobby_ids and h.category_id in user_category_ids]

        exact_count = len(shared_hobbies)
        related_count = len(related_hobbies)

        affinity_score = (exact_count * 3) + (related_count * 1)

        # Match percentage calculation
        if user_hobby_ids:
            score_ratio = (exact_count * 1.0 + related_count * 0.4) / max(1, len(user_hobby_ids))
            match_percentage = min(99, max(20 if (shared_hobbies or related_hobbies) else 0, int(score_ratio * 100)))
        else:
            match_percentage = 0

        # Attach computed properties
        circle.distance = round(distance, 1) if distance is not None else None
        circle.affinity_score = affinity_score
        circle.match_percentage = match_percentage
        circle.shared_hobbies = shared_hobbies
        circle.related_hobbies = related_hobbies

        results.append(circle)

    # ── 3. SORTING ───────────────────────────────────────────────────────────
    # Sort strictly by highest affinity score first, then closest distance, then -id
    results.sort(key=lambda c: (
        -c.affinity_score,
        c.distance if c.distance is not None else 99999.0,
        -c.id
    ))

    return results


def format_graphql_error(error):
    """
    Format GraphQL errors safely to mask stack traces and internal DB structures
    from end users in production/non-debug mode.
    """
    from django.conf import settings
    formatted = error.formatted
    message = str(formatted.get('message', 'An unexpected error occurred.'))

    if not settings.DEBUG:
        if any(term in message for term in ['OperationalError', 'DatabaseError', 'ProgrammingError', 'IntegrityError', 'Traceback', 'SQL', 'mysql']):
            formatted['message'] = "An error occurred while processing your request. Please try again later."

    return formatted
