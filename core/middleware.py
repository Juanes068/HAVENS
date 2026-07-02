"""Custom JWT authentication middleware for Havens.

This middleware runs in the Django HTTP pipeline (not GraphQL's internal
middleware). It reads the 'Authorization: JWT <token>' header, validates the
token, and sets request.user so that GraphQL resolvers see the authenticated
user via info.context.user.

This is more reliable than graphql_jwt.middleware.JSONWebTokenMiddleware
which has compatibility issues with graphene-django 3.x and django-graphql-jwt 0.3.x.
"""
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('JWT '):
            token = auth_header[4:].strip()
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                username = payload.get('username')
                if username:
                    user = User.objects.get(username=username)
                    request.user = user
            except jwt.ExpiredSignatureError:
                pass  # token expired; keep AnonymousUser
            except jwt.InvalidTokenError:
                pass  # invalid token; keep AnonymousUser
            except User.DoesNotExist:
                pass  # user not found; keep AnonymousUser

        response = self.get_response(request)
        return response
