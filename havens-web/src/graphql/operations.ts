import { gql } from '@apollo/client';

/**
 * Mutation to authenticate a user and obtain a JWT token.
 */
export const TOKEN_AUTH = gql`
  mutation TokenAuth($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
      payload
      refreshExpiresIn
    }
  }
`;

/**
 * Mutation to register a new user using a valid invitation code.
 */
export const CREATE_USER = gql`
  mutation CreateUser(
    $username: String!
    $email: String!
    $password: String!
    $invitationCode: String!
    $bio: String
    $neighbourhood: String
    $photoUrl: String
  ) {
    createUser(
      username: $username
      email: $email
      password: $password
      invitationCode: $invitationCode
      bio: $bio
      neighbourhood: $neighbourhood
      photoUrl: $photoUrl
    ) {
      success
      message
      user {
        id
        username
        email
      }
    }
  }
`;

/**
 * Query to fetch the profile data of the currently authenticated user.
 */
export const MY_PROFILE = gql`
  query MyProfile {
    myProfile {
      id
      username
      email
      totalPoints
      bio
      neighbourhood
      photoUrl
    }
  }
`;

/**
 * Query to fetch all public and community events from the Django backend.
 */
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($latitude: Float, $longitude: Float, $radiusKm: Float) {
    allEvents(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm) {
      id
      title
      description
      latitude
      longitude
      pointsReward
      visibility
      trustScore
      creator {
        id
        username
      }
    }
  }
`;

/**
 * Mutation to create a new event on the Django backend.
 */
export const CREATE_EVENT = gql`
  mutation CreateEvent(
    $title: String!
    $description: String!
    $latitude: Float!
    $longitude: Float!
    $communityId: Int
    $pointsReward: Int
    $visibility: String
  ) {
    createEvent(
      title: $title
      description: $description
      latitude: $latitude
      longitude: $longitude
      communityId: $communityId
      pointsReward: $pointsReward
      visibility: $visibility
    ) {
      success
      message
      event {
        id
        title
        description
        latitude
        longitude
        pointsReward
        visibility
        trustScore
        creator {
          id
          username
        }
      }
    }
  }
`;

/**
 * Query to fetch current user's RSVPs ('going', 'maybe', 'pass').
 */
export const MY_RSVPS = gql`
  query MyRsvps {
    myRsvps {
      id
      response
      event {
        id
        title
        description
        latitude
        longitude
        visibility
        creator {
          id
          username
        }
      }
    }
  }
`;

/**
 * Mutation to RSVP to an event.
 */
export const SWIPE_EVENT = gql`
  mutation SwipeEvent($eventId: Int!, $response: String!) {
    swipeEvent(eventId: $eventId, response: $response) {
      success
      message
      rsvp {
        id
        response
      }
    }
  }
`;

/**
 * Mutation to generate Cloudinary upload signature from backend.
 */
export const GENERATE_CLOUDINARY_SIGNATURE = gql`
  mutation GenerateCloudinarySignature($paramsToSign: JSONString) {
    generateCloudinarySignature(paramsToSign: $paramsToSign) {
      signature
      timestamp
      apiKey
      success
      message
    }
  }
`;
