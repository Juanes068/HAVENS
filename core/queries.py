import graphene
from .types import CommunityType, EventType
from .models import Community, Event

class Query(graphene.ObjectType):
    all_communities = graphene.List(CommunityType)
    all_events = graphene.List(EventType)

    def resolve_all_communities(self, info):
        return Community.objects.all()

    def resolve_all_events(self, info):
        return Event.objects.all()