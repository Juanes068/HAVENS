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
    $cityName: String
    $latitude: Float
    $longitude: Float
    $photoUrl: String
  ) {
    createUser(
      username: $username
      email: $email
      password: $password
      invitationCode: $invitationCode
      bio: $bio
      neighbourhood: $neighbourhood
      cityName: $cityName
      latitude: $latitude
      longitude: $longitude
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
 * Query to fetch all recommended users (sorted by implicit hobby affinity & location proximity).
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
 * Query to fetch pending incoming friend requests.
 */
export const MY_FRIEND_REQUESTS = gql`
  query MyFriendRequests {
    myFriendRequests {
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

/**
 * Query to fetch all micro-communities / circles.
 */
export const GET_ALL_COMMUNITIES = gql`
  query GetAllCommunities {
    allCommunities {
      id
      name
      subdomain
      createdAt
    }
  }
`;

/**
 * Mutation to join a micro-community circle.
 */
export const JOIN_COMMUNITY = gql`
  mutation JoinCommunity($communityId: Int!) {
    joinCommunity(communityId: $communityId) {
      success
      message
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
      imageUrl
      creator {
        id
        username
        photoUrl
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
 * imageUrl: the Cloudinary secure_url returned after a successful upload.
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
    $imageUrl: String
  ) {
    createEvent(
      title: $title
      description: $description
      latitude: $latitude
      longitude: $longitude
      communityId: $communityId
      pointsReward: $pointsReward
      visibility: $visibility
      imageUrl: $imageUrl
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
        imageUrl
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
  mutation GenerateCloudinarySignature($paramsToSign: JSONString!, $folder: String) {
    generateCloudinarySignature(paramsToSign: $paramsToSign, folder: $folder) {
      signature
      timestamp
      apiKey
      success
      message
    }
  }
`;

/**
 * Mutation to update user profile details (bio, neighbourhood, photoUrl).
 */
export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($bio: String, $neighbourhood: String, $photoUrl: String) {
    updateUserProfile(bio: $bio, neighbourhood: $neighbourhood, photoUrl: $photoUrl) {
      success
      message
      profile {
        id
        username
        bio
        neighbourhood
        photoUrl
      }
    }
  }
`;

/**
 * Mutation to update general account info and password security credentials.
 */
export const UPDATE_ACCOUNT_SECURITY = gql`
  mutation UpdateAccountSecurity(
    $email: String
    $newUsername: String
    $newPassword: String
    $currentPassword: String
    $bio: String
    $neighbourhood: String
  ) {
    updateAccountSecurity(
      email: $email
      newUsername: $newUsername
      newPassword: $newPassword
      currentPassword: $currentPassword
      bio: $bio
      neighbourhood: $neighbourhood
    ) {
      success
      message
      user {
        id
        username
        email
        bio
        neighbourhood
      }
    }
  }
`;

/**
 * Mutation to delete user account.
 */
export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount {
      success
      message
    }
  }
`;

/**
 * Mutation to generate a new invitation code.
 */
export const GENERATE_INVITE = gql`
  mutation GenerateInvite {
    generateInvite {
      success
      message
      invitation {
        id
        code
        isUsed
      }
    }
  }
`;

