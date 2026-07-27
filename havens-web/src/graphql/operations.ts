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
      inviteCode
      hobbies {
        id
        name
        category {
          id
          name
        }
      }
    }
  }
`;

/**
 * Query to fetch all recommended users (sorted by implicit hobby affinity on backend).
 */
export const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers {
      id
      username
      email
      bio
      neighbourhood
      photoUrl
      hobbies {
        id
        name
      }
    }
  }
`;

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
 * Query to fetch all categorized hobbies for Spotify-style onboarding.
 */
export const GET_ALL_HOBBY_CATEGORIES = gql`
  query GetAllHobbyCategories {
    allHobbyCategories {
      id
      name
      hobbies {
        id
        name
      }
    }
  }
`;

/**
 * Mutation to update the user's selected digital footprint / hobbies.
 */
export const UPDATE_USER_HOBBIES = gql`
  mutation UpdateUserHobbies($hobbyIds: [Int]!) {
    updateUserHobbies(hobbyIds: $hobbyIds) {
      success
      message
      user {
        id
        hobbies {
          id
          name
        }
      }
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
      hobbies {
        id
        name
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
