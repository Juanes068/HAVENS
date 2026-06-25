"""GraphQL authorization decorators for Havens."""
from functools import wraps
from graphql import GraphQLError


def _find_info(*args, **kwargs):
    """Locate the GraphQL info object from positional or keyword args."""
    info = kwargs.get('info')
    if info is not None and hasattr(info, 'context') and hasattr(info.context, 'user'):
        return info
    for arg in args:
        if hasattr(arg, 'context') and hasattr(arg.context, 'user'):
            return arg
    return None


def login_required(func):
    """Decorator to protect GraphQL resolvers and mutations.

    Works with both ObjectType resolvers and Mutation.mutate classmethods.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        info = _find_info(*args, **kwargs)
        if info is None:
            raise GraphQLError("Authentication required. Please include a valid JWT token.")
        user = info.context.user
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required. Please include a valid JWT token.")
        return func(*args, **kwargs)
    return wrapper


def superuser_required(func):
    """Decorator to restrict resolvers and mutations to Django superusers only."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        info = _find_info(*args, **kwargs)
        if info is None:
            raise GraphQLError("Authentication required.")
        user = info.context.user
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required.")
        if not user.is_superuser:
            raise GraphQLError("Permission denied. Superuser access required.")
        return func(*args, **kwargs)
    return wrapper
