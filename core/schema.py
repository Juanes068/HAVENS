import graphene
from django.contrib.auth.models import User
from .types import UserType


class Query(graphene.ObjectType):
    hello = graphene.String(default_value="TEST DB HAVENS")
    myProfile = graphene.Field(UserType)

    def resolve_myProfile(self, info):
        return User.objects.first()

# ==========================================
# MUTATIONS 
# ==========================================
class CreateUser(graphene.Mutation):
    
    user = graphene.Field(UserType)

   
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    
    def mutate(self, info, username, email, password):
      
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        return CreateUser(user=user)


class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()