import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { secureStorage } from './secureStore';

/**
 * Storage key for persisting the havens session JWT token.
 */
export const HAVENS_JWT_TOKEN_KEY = 'havens_jwt_token';

/**
 * Helper to safely retrieve the token from secureStore or sessionStorage.
 */
export const getAuthToken = (): string | null => {
  try {
    const direct = secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY);
    if (direct) return direct;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return (
        sessionStorage.getItem(HAVENS_JWT_TOKEN_KEY) ||
        sessionStorage.getItem('havens_jwt_token') ||
        sessionStorage.getItem('token')
      );
    }
  } catch (err) {
    console.warn('[Apollo getAuthToken] Error reading storage:', err);
  }
  return null;
};

/**
 * HTTP Link pointing to the Django GraphQL backend.
 * Uses VITE_API_URL in production (https://api.havensapp.com/graphql/)
 * with automatic fallback based on current hostname.
 */
const GRAPHQL_ENDPOINT =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('havensapp.com')
    ? 'https://api.havensapp.com/graphql/'
    : 'http://localhost:8000/graphql/');

const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

/**
 * Authentication Link that dynamically retrieves the JWT token on EVERY outgoing GraphQL request.
 * Header format: Authorization: JWT <token> (or Bearer <token>)
 */
const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();

  return {
    headers: {
      ...headers,
      authorization: token
        ? token.startsWith('JWT ') || token.startsWith('Bearer ')
          ? token
          : `JWT ${token}`
        : '',
    },
  };
});

/**
 * Global Error Link to intercept expired JWT tokens or missing auth headers.
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  let isAuthError = false;

  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const message = err.message ? err.message.toLowerCase() : '';
      const code = err.extensions?.code ? String(err.extensions.code).toLowerCase() : '';

      // Check for Django GraphQL JWT auth messages & status phrases
      if (
        message.includes('authentication required') ||
        message.includes('valid jwt token') ||
        message.includes('signature has expired') ||
        message.includes('error decoding signature') ||
        message.includes('invalid token') ||
        message.includes('user is not authenticated') ||
        message.includes('you do not have permission') ||
        code === 'unauthenticated' ||
        code === 'forbidden'
      ) {
        isAuthError = true;
        console.warn(`[Apollo ErrorLink] Intercepted GraphQL Auth Error in "${operation.operationName || 'query'}":`, err.message);
        break;
      }
    }
  }

  if (networkError) {
    const statusCode = (networkError as any).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      isAuthError = true;
      console.warn(`[Apollo ErrorLink] Intercepted Network Auth Error (Status ${statusCode})`);
    }
  }

  // Do not purge/redirect if executing login/register mutations
  const isAuthMutation = ['TokenAuth', 'CreateUser'].includes(operation.operationName || '');

  if (isAuthError && !isAuthMutation) {
    // Purge session tokens from secureStorage & sessionStorage
    secureStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        sessionStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
        sessionStorage.removeItem('havens_jwt_token');
        sessionStorage.removeItem('token');
      }
      if (window.localStorage) {
        localStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
        localStorage.removeItem('havens_jwt_token');
        localStorage.removeItem('token');
      }
    }

    // Redirect to /auth if not already on the auth page
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      console.warn('[Apollo ErrorLink] Purging credentials and redirecting to /auth');
      window.location.href = '/auth';
    }
  }
});

/**
 * Shared Apollo Client instance configured with Error Link, Auth Link, HTTP Link, and InMemoryCache.
 */
export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          allEvents: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          allUsers: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          allCommunities: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});

