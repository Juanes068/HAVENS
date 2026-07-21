import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export const JWT_TOKEN_KEY = 'havens_jwt_token';

/**
 * HTTP Link pointing to the local Django GraphQL backend.
 */
const httpLink = createHttpLink({
  uri: 'http://localhost:8000/graphql/',
});

/**
 * Authentication Link that reads the JWT token from browser localStorage
 * and automatically injects it into every outgoing HTTP request header.
 */
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(JWT_TOKEN_KEY);
  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : '',
    },
  };
});

/**
 * Apollo Client instance configured with Auth Link and In-Memory Cache.
 */
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
