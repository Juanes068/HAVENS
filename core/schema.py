import graphene
from django.contrib.auth.models import User
from .types import UserType, CommunityType, EventType, TicketType, ParticipationType
from .models import Community, Event, Ticket, Participation


class Query(graphene.ObjectType):
    hello = graphene.String(default_value="TEST DB HAVENS")
    
    # User queries
    my_profile = graphene.Field(UserType)
    all_users = graphene.List(UserType)
    user_by_id = graphene.Field(UserType, id=graphene.Int(required=True))
    
    # Community queries
    all_communities = graphene.List(CommunityType)
    community_by_id = graphene.Field(CommunityType, id=graphene.Int(required=True))
    community_by_subdomain = graphene.Field(CommunityType, subdomain=graphene.String(required=True))
    
    # Event queries
    all_events = graphene.List(EventType)
    event_by_id = graphene.Field(EventType, id=graphene.Int(required=True))
    events_by_community = graphene.List(EventType, community_id=graphene.Int(required=True))
    
    # Ticket queries
    all_tickets = graphene.List(TicketType)
    ticket_by_id = graphene.Field(TicketType, id=graphene.Int(required=True))
    tickets_by_user = graphene.List(TicketType, user_id=graphene.Int(required=True))
    
    # Participation queries
    all_participations = graphene.List(ParticipationType)
    participation_by_id = graphene.Field(ParticipationType, id=graphene.Int(required=True))

    # Resolvers
    def resolve_my_profile(self, info):
        return User.objects.first()
    
    def resolve_all_users(self, info):
        return User.objects.all()
    
    def resolve_user_by_id(self, info, id):
        try:
            return User.objects.get(id=id)
        except User.DoesNotExist:
            return None
    
    def resolve_all_communities(self, info):
        return Community.objects.all()
    
    def resolve_community_by_id(self, info, id):
        try:
            return Community.objects.get(id=id)
        except Community.DoesNotExist:
            return None
    
    def resolve_community_by_subdomain(self, info, subdomain):
        try:
            return Community.objects.get(subdomain=subdomain)
        except Community.DoesNotExist:
            return None
    
    def resolve_all_events(self, info):
        return Event.objects.all()
    
    def resolve_event_by_id(self, info, id):
        try:
            return Event.objects.get(id=id)
        except Event.DoesNotExist:
            return None
    
    def resolve_events_by_community(self, info, community_id):
        return Event.objects.filter(community_id=community_id)
    
    def resolve_all_tickets(self, info):
        return Ticket.objects.all()
    
    def resolve_ticket_by_id(self, info, id):
        try:
            return Ticket.objects.get(id=id)
        except Ticket.DoesNotExist:
            return None
    
    def resolve_tickets_by_user(self, info, user_id):
        return Ticket.objects.filter(user_id=user_id)
    
    def resolve_all_participations(self, info):
        return Participation.objects.all()
    
    def resolve_participation_by_id(self, info, id):
        try:
            return Participation.objects.get(id=id)
        except Participation.DoesNotExist:
            return None


class CreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, username, email, password):
        try:
            if User.objects.filter(username=username).exists():
                return CreateUser(user=None, success=False, message="Username already exists")
            
            if User.objects.filter(email=email).exists():
                return CreateUser(user=None, success=False, message="Email already exists")
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            return CreateUser(user=user, success=True, message="User created successfully")
        except Exception as e:
            return CreateUser(user=None, success=False, message=str(e))


class CreateCommunity(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        subdomain = graphene.String(required=True)

    community = graphene.Field(CommunityType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, name, subdomain):
        try:
            if Community.objects.filter(subdomain=subdomain).exists():
                return CreateCommunity(community=None, success=False, message="Subdomain already exists")
            
            community = Community.objects.create(name=name, subdomain=subdomain)
            return CreateCommunity(community=community, success=True, message="Community created successfully")
        except Exception as e:
            return CreateCommunity(community=None, success=False, message=str(e))


class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()
    create_community = CreateCommunity.Field()
