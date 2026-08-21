import { gql } from '@apollo/client';

/**
 * Mutation to send an async connection request to a target user.
 */
export const SEND_CONNECT_REQUEST = gql`
  mutation SendConnectRequest($toUserId: Int!) {
    sendConnectRequest(toUserId: $toUserId) {
      success
      message
      match {
        id
        status
        createdAt
        initiator {
          id
          username
        }
        user1 {
          id
          username
          photoUrl
          neighbourhood
        }
        user2 {
          id
          username
          photoUrl
          neighbourhood
        }
      }
    }
  }
`;

/**
 * Backward-compatible alias for creating a match connection.
 */
export const CREATE_MATCH = SEND_CONNECT_REQUEST;

/**
 * Mutation to accept or reject an incoming connection request.
 */
export const RESPOND_CONNECT_REQUEST = gql`
  mutation RespondConnectRequest($matchId: Int, $fromUserId: Int, $action: String!) {
    respondConnectRequest(matchId: $matchId, fromUserId: $fromUserId, action: $action) {
      success
      message
      match {
        id
        status
        updatedAt
      }
    }
  }
`;

/**
 * Query to fetch pending incoming connection requests.
 */
export const PENDING_CONNECTION_REQUESTS = gql`
  query PendingConnectionRequests {
    pendingConnectionRequests {
      id
      status
      createdAt
      initiator {
        id
        username
        photoUrl
        neighbourhood
      }
      user1 {
        id
        username
        photoUrl
        neighbourhood
        hobbies {
          id
          name
        }
      }
      user2 {
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
  }
`;

/**
 * Query to fetch user matches (optionally filtered by status, e.g., 'accepted').
 */
export const MY_MATCHES = gql`
  query MyMatches($status: String) {
    myMatches(status: $status) {
      id
      status
      createdAt
      initiator {
        id
        username
      }
      user1 {
        id
        username
        photoUrl
        neighbourhood
        hobbies {
          id
          name
        }
      }
      user2 {
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
  }
`;

/**
 * Query to fetch chat messages for a specific match thread.
 */
export const MESSAGES_BY_MATCH = gql`
  query MessagesByMatch($matchId: Int!) {
    messagesByMatch(matchId: $matchId) {
      id
      content
      createdAt
      isRead
      sender {
        id
        username
      }
    }
  }
`;

/**
 * Mutation to send a message in a match chat.
 */
export const SEND_MESSAGE = gql`
  mutation SendMessage($matchId: Int!, $content: String!) {
    sendMessage(matchId: $matchId, content: $content) {
      success
      messageField
      message {
        id
        content
        createdAt
        sender {
          id
          username
        }
      }
    }
  }
`;
