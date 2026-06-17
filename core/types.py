import graphene
from graphene_django import DjangoObjectType
from .models import User 
class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ("id", "username", "email", "bio") 