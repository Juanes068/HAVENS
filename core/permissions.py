"""Resolver-level authorization helpers for Havens GraphQL."""

from django.db.models import Q
from graphql import GraphQLError

from .models import CommunityMembership, EventRSVP, Friendship


def get_request_user(info):
    """Return the authenticated user from the GraphQL context, or None."""
    user = getattr(info.context, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return user

    request = getattr(info.context, 'request', None)
    if request is not None:
        req_user = getattr(request, 'user', None)
        if req_user is not None and req_user.is_authenticated:
            return req_user

    return None


def require_authenticated_user(info):
    """Require a JWT-authenticated user at the resolver level."""
    user = get_request_user(info)
    if user is None:
        raise GraphQLError("Authentication required. Please include a valid JWT token.")
    return user


def require_owner_or_staff(info, owner, message="Permission denied."):
    """Ensure the caller owns the resource or has staff privileges."""
    user = require_authenticated_user(info)
    if owner != user and not user.is_staff:
        raise GraphQLError(message)
    return user


def user_is_community_member(user, community):
    if community is None:
        return False
    if community.creator_id == user.id:
        return True
    return CommunityMembership.objects.filter(user=user, community=community).exists()


def user_can_view_event(user, event):
    visibility = event.visibility or 'public'
    if visibility == 'public':
        return True
    if user is None or not user.is_authenticated:
        return False
    if user.is_staff or event.creator_id == user.id:
        return True
    if visibility in ('community_only', 'community'):
        return bool(event.community_id and user_is_community_member(user, event.community))
    if visibility == 'friends_only':
        return Friendship.objects.filter(
            status='accepted',
        ).filter(
            Q(from_user=user, to_user_id=event.creator_id)
            | Q(from_user_id=event.creator_id, to_user=user)
        ).exists()
    return False


def require_event_access(info, event, message="Permission denied. You do not have access to this event."):
    user = get_request_user(info)
    if not user_can_view_event(user, event):
        raise GraphQLError(message)
    return user


def user_can_view_event_rsvps(user, event):
    if user is None or not user.is_authenticated:
        return False
    if user.is_staff or event.creator_id == user.id:
        return True
    if EventRSVP.objects.filter(user=user, event=event).exists():
        return True
    if event.community_id and user_is_community_member(user, event.community):
        return True
    return False


def get_user_friend_ids(user):
    """Return a set of user IDs of confirmed friends for the given user."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return set()
    sent = Friendship.objects.filter(from_user=user, status='accepted').values_list('to_user_id', flat=True)
    received = Friendship.objects.filter(to_user=user, status='accepted').values_list('from_user_id', flat=True)
    return set(sent) | set(received)


def get_user_visible_events_q(user):
    """Return Django Q filter for events visible to the given user context."""
    if user and getattr(user, 'is_authenticated', False):
        if getattr(user, 'is_staff', False):
            return Q()
        user_community_ids = CommunityMembership.objects.filter(user=user).values_list('community_id', flat=True)
        user_friend_ids = get_user_friend_ids(user)
        return (
            Q(visibility='public') |
            Q(creator=user) |
            Q(visibility__in=['community_only', 'community', 'circle'], community_id__in=user_community_ids) |
            Q(visibility='friends_only', creator_id__in=user_friend_ids)
        )
    return Q(visibility='public')

