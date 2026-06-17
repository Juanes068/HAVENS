import graphene
from .types import UserType
from django.contrib.auth.models import User

class Query(graphene.ObjectType):
    hello = graphene.String(default_value="TEST DB HAVENS")
    myProfile = graphene.Field(UserType)

    def resolve_myProfile(self, info):
        return User.objects.first()