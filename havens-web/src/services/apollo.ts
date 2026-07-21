import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

/**
 * Storage key for persisting the havens session JWT token in browser localStorage.
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
 * Authentication Link that retrieves the JWT token from browser localStorage
 * and automatically injects it into every outgoing HTTP request header.
 * Header format: Authorization: JWT <token>
 */
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(HAVENS_JWT_TOKEN_KEY);
  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : '',
    },
  };
});

/**
 * Shared Apollo Client instance configured with Auth Link and InMemoryCache
 * for the havens web application.
 */
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
