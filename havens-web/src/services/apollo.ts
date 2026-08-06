import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { secureStorage } from './secureStore';

/**
 * Storage key for persisting the havens session JWT token.
 * Always formatted in lowercase as per havens brand guidelines.
 */
export const HAVENS_JWT_TOKEN_KEY = 'havens_jwt_token';

/**
 * HTTP Link pointing to the local Django GraphQL backend server.
 */
const httpLink = createHttpLink({
  uri: 'http://localhost:8000/graphql/',
});

/**
 * Authentication Link that dynamically retrieves the JWT token on EVERY outgoing HTTP request.
 * Header format: Authorization: JWT <token>
 */
const authLink = setContext((_, { headers }) => {
  // Dynamically read token on every request from secureStore and fallback localStorage keys
  let token = secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY);
  if (!token && typeof window !== 'undefined' && window.localStorage) {
    token =
      localStorage.getItem('token') ||
      localStorage.getItem('havens_jwt_token') ||
      localStorage.getItem(HAVENS_JWT_TOKEN_KEY);
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : '',
    },
  };
});

/**
 * Global Error Link to intercept expired JWT tokens, missing auth headers, or 200 HTTP payloads containing
 * GraphQL auth error messages like "Authentication required. Please include a valid JWT token."
 */
const errorLink = onError(({ graphQLErrors, networkError }) => {
  let isAuthError = false;

  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const message = err.message ? err.message.toLowerCase() : '';
      const code = err.extensions?.code ? String(err.extensions.code).toLowerCase() : '';

      // Check for Django GraphQL auth messages & status phrases
      if (
        message.includes('authentication required') ||
        message.includes('jwt token') ||
        message.includes('valid jwt') ||
        message.includes('signature has expired') ||
        message.includes('error decoding signature') ||
        message.includes('invalid token') ||
        message.includes('unauthenticated') ||
        message.includes('user is not authenticated') ||
        message.includes('you do not have permission') ||
        code === 'unauthenticated' ||
        code === 'forbidden'
      ) {
        isAuthError = true;
        console.warn('[Apollo ErrorLink] Intercepted GraphQL Auth Error:', err.message);
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

  if (isAuthError) {
    // 1. Purge session tokens from secureStorage & localStorage
    secureStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('havens_jwt_token');
      localStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    }

    // 2. Force hard redirect to login/auth screen if not already on /auth
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      console.warn('[Apollo ErrorLink] Purging credentials and executing hard redirect to /auth');
      window.location.href = '/auth';
    }
  }
});

/**
 * Shared Apollo Client instance configured with Error Link, Auth Link, HTTP Link, and InMemoryCache
 * for the havens application.
 */
export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
