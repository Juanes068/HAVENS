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
