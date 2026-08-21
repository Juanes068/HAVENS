"""Havens GraphQL Root Schema Aggregator.

This module acts as the central entry point for the GraphQL schema definitions
in the `core` application. It aggregates the query root (`Query`) and the
mutation root (`Mutation`) defined in their respective submodules (`core.queries`
and `core.mutations`).

Architecture:
    Havens employs Graphene-Django to expose a unified GraphQL API endpoint at `/graphql/`.
    The schema is structured into distinct layers:
        1. Object Types & Models (`core.types`, `core.models`):
           Define GraphQL types mapped from Django ORM models and custom scalar representations.
        2. Query Resolvers (`core.queries`):
           Encapsulate read-only queries with advanced filtering (Haversine geolocation,
           hobby affinity scoring, temporal filtering).
        3. Mutation Resolvers (`core.mutations`):
           Encapsulate write operations (Auth, Invitations, RSVPs, Friendships, Messaging,
           Media upload signatures, Account Security).
        4. Root Schema Aggregation (`core.schema` & `havens.schema`):
           Exposes `Query` and `Mutation` to graphene.Schema.

Exports:
    Query (core.queries.Query): The root query ObjectType.
    Mutation (core.mutations.Mutation): The root mutation ObjectType.
"""

from .queries import Query
from .mutations import Mutation

__all__ = ['Query', 'Mutation']
