"""GraphQL authorization decorators for Havens."""
from functools import wraps
from graphql import GraphQLError


def login_required(func):
    """Decorator to protect GraphQL resolvers.

    Usage:
        @login_required
        def resolve_sensitive_data(self, info):
            ...
    """
    @wraps(func)
    def wrapper(self, info, *args, **kwargs):
        user = info.context.user
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required. Please include a valid JWT token.")
        return func(self, info, *args, **kwargs)
    return wrapper


def superuser_required(func):
    """Decorator to restrict resolvers to Django superusers only."""
    @wraps(func)
    def wrapper(self, info, *args, **kwargs):
        user = info.context.user
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required.")
        if not user.is_superuser:
            raise GraphQLError("Permission denied. Superuser access required.")
        return func(self, info, *args, **kwargs)
    return wrapper
