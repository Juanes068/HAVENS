import json
import time
from django.core.cache import cache
from django.http import JsonResponse


def get_client_ip(request):
    """Extract client IP address safely from HTTP headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def is_rate_limited(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """
    Checks if a given key has exceeded the request rate limit using Redis cache.
    Returns (is_limited: bool, remaining_seconds: int).
    """
    cache_key = f"ratelimit:{key}"
    try:
        current_count = cache.get(cache_key)
        if current_count is None:
            cache.set(cache_key, 1, timeout=window_seconds)
            return False, 0

        if current_count >= limit:
            # Estimate remaining ttl or default to window_seconds
            return True, window_seconds

        # Increment count atomically if supported, or write back
        try:
            cache.incr(cache_key)
        except Exception:
            cache.set(cache_key, current_count + 1, timeout=window_seconds)

        return False, 0
    except Exception as err:
        # Fallback gracefully if Redis is temporarily unreachable
        print(f"[RateLimit Warning] Cache backend error: {err}")
        return False, 0


class GraphQLRateLimitMiddleware:
    """
    Django middleware enforcing Redis rate limits on GraphQL endpoints.
    - General GraphQL queries: 60 requests / minute per IP.
    - Sensitive Auth/Account mutations: 10 requests / minute per IP.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/graphql') and request.method == 'POST':
            ip = get_client_ip(request)
            
            # Check for sensitive authentication mutations in POST payload
            is_auth_mutation = False
            try:
                if request.body:
                    body_text = request.body.decode('utf-8')
                    if any(term in body_text for term in ['createUser', 'tokenAuth', 'updateAccountSecurity', 'deleteAccount']):
                        is_auth_mutation = True
            except Exception:
                pass

            if is_auth_mutation:
                # Auth rate limit: 10 requests per 60 seconds
                limited, _ = is_rate_limited(f"auth:{ip}", limit=10, window_seconds=60)
                if limited:
                    return JsonResponse(
                        {
                            "errors": [
                                {
                                    "message": "Rate limit exceeded for authentication requests. Please try again in 1 minute.",
                                    "code": "RATE_LIMIT_EXCEEDED"
                                }
                            ]
                        },
                        status=429
                    )
            else:
                # General GraphQL rate limit: 60 requests per 60 seconds
                user_id = request.user.id if request.user and request.user.is_authenticated else ip
                limited, _ = is_rate_limited(f"gql:{user_id}", limit=60, window_seconds=60)
                if limited:
                    return JsonResponse(
                        {
                            "errors": [
                                {
                                    "message": "Rate limit exceeded. Too many GraphQL requests. Please slow down.",
                                    "code": "RATE_LIMIT_EXCEEDED"
                                }
                            ]
                        },
                        status=429
                    )

        return self.get_response(request)
