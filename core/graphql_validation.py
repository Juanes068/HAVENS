"""GraphQL query validation for Havens.

Analyzes the AST of incoming queries before execution to enforce depth limits
and block introspection in production. Validation runs in the GraphQL view
pipeline prior to resolver execution.
"""

from django.conf import settings
from graphene.validation import depth_limit_validator
from graphql import ExecutionResult, parse, validate
from graphql.validation import NoSchemaIntrospectionCustomRule


def get_max_query_depth():
    return getattr(settings, 'GRAPHQL_MAX_QUERY_DEPTH', 5)


def build_security_validation_rules(*, block_introspection=False):
    """Return GraphQL validation rules for depth limiting and optional introspection blocking."""
    rules = [depth_limit_validator(max_depth=get_max_query_depth())]
    if block_introspection:
        rules.append(NoSchemaIntrospectionCustomRule)
    return rules


def validate_query_security(graphql_schema, query, *, block_introspection=False):
    """Parse and validate a query AST against security rules.

    Returns an ExecutionResult with errors when validation fails, otherwise None.
    """
    if not query:
        return None

    try:
        document = parse(query)
    except Exception as exc:
        return ExecutionResult(errors=[exc])

    errors = validate(
        graphql_schema,
        document,
        build_security_validation_rules(block_introspection=block_introspection),
    )
    if errors:
        return ExecutionResult(data=None, errors=errors)

    return None
