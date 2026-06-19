import graphene
from core.schema import Query, Mutation

schema = graphene.Schema(query=Query, mutation=Mutation)
