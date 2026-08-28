import signal
import threading
from django.conf import settings
from graphene_django.views import GraphQLView
from graphql import ExecutionResult, GraphQLError

from core.graphql_validation import validate_query_security


class QueryTimeoutException(Exception):
    pass


class SecureGraphQLView(GraphQLView):
    """GraphQL view with AST-based security validation and execution timeout control."""

    def execute_graphql_request(
        self, request, data, query, variables, operation_name, show_graphiql=False
    ):
        if query:
            validation_result = validate_query_security(
                self.schema.graphql_schema,
                query,
                block_introspection=not settings.DEBUG,
            )
            if validation_result is not None:
                return validation_result

        timeout = float(getattr(settings, 'GRAPHQL_EXECUTION_TIMEOUT', 5.0))
        if not timeout or timeout <= 0:
            return super().execute_graphql_request(
                request, data, query, variables, operation_name, show_graphiql
            )

        if (
            hasattr(signal, 'SIGALRM')
            and hasattr(signal, 'setitimer')
            and threading.current_thread() is threading.main_thread()
        ):
            def handle_timeout(signum, frame):
                raise QueryTimeoutException(f"Query execution timed out after {timeout} seconds.")

            old_handler = signal.signal(signal.SIGALRM, handle_timeout)
            signal.setitimer(signal.ITIMER_REAL, timeout)
            try:
                return super().execute_graphql_request(
                    request, data, query, variables, operation_name, show_graphiql
                )
            except QueryTimeoutException as err:
                return ExecutionResult(errors=[GraphQLError(str(err))])
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)
        else:
            return super().execute_graphql_request(
                request, data, query, variables, operation_name, show_graphiql
            )


