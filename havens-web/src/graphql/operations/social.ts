import { gql } from '@apollo/client';

/**
 * Query to fetch pending incoming friend requests.
 */
export const MY_FRIEND_REQUESTS = gql`
  query MyFriendRequests($limit: Int, $offset: Int) {
    myFriendRequests(limit: $limit, offset: $offset) {
      id
      status
      createdAt
      fromUser {
        id
        username
        photoUrl
        neighbourhood
      }
    }
  }
`;

/**
 * Query to fetch accepted friends (mutual connections) with pagination.
 */
export const MY_FRIENDS = gql`
  query MyFriends($limit: Int, $offset: Int) {
    myFriends(limit: $limit, offset: $offset) {
      id
      username
      photoUrl
      neighbourhood
      hobbies {
        id
        name
      }
    }
  }
`;

/**
 * Mutation to respond to a friend request ('accepted' or 'rejected').
 */
export const RESPOND_FRIEND_REQUEST = gql`
  mutation RespondFriendRequest($requestId: Int!, $action: String!) {
    respondFriendRequest(requestId: $requestId, action: $action) {
      success
      message
    }
  }
`;
