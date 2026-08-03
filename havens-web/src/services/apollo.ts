import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
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
 * Shared Apollo Client instance configured with Auth Link and InMemoryCache
 * for the havens application.
 */
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
