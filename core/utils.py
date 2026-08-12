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
