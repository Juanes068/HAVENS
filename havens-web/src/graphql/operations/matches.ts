import { gql } from '@apollo/client';

/**
 * Mutation to create a match connection with another user (user2Id).
 */
export const CREATE_MATCH = gql`
  mutation CreateMatch($user2Id: Int!) {
    createMatch(user2Id: $user2Id) {
      success
      message
      match {
        id
        user1 {
          id
          username
        }
        user2 {
          id
          username
        }
      }
    }
  }
`;

/**
 * Query to fetch active user matches.
 */
export const MY_MATCHES = gql`
  query MyMatches {
    myMatches {
      id
      createdAt
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
      message
      messageObject {
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
