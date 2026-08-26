import { gql } from '@apollo/client';

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
      dateOfBirth
      age
      neighbourhood
      cityName
      photoUrl
      inviteCode
      createdCirclesCount
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
 * Query to fetch complete profile details of a target user by ID.
 */
export const GET_USER_BY_ID = gql`
  query GetUserById($id: Int!) {
    userById(id: $id) {
      id
      username
      email
      totalPoints
      bio
      dateOfBirth
      age
      neighbourhood
      cityName
      photoUrl
      inviteCode
      createdCirclesCount
      hobbies {
        id
        name
        category {
          id
          name
        }
      }
      sharedHobbies {
        id
        name
        category {
          id
          name
        }
      }
      relatedHobbies {
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
 * Query to fetch complete profile details of a target user by username or handle.
 */
export const GET_USER_BY_USERNAME = gql`
  query GetUserByUsername($username: String!) {
    userByUsername(username: $username) {
      id
      username
      email
      totalPoints
      bio
      dateOfBirth
      age
      neighbourhood
      cityName
      photoUrl
      inviteCode
      createdCirclesCount
      hobbies {
        id
        name
        category {
          id
          name
        }
      }
      sharedHobbies {
        id
        name
        category {
          id
          name
        }
      }
      relatedHobbies {
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
 * Query to fetch recommended users (strictly location-filtered by Haversine radius & ranked by affinity).
 */
export const GET_ALL_USERS = gql`
  query GetAllUsers($radiusKm: Float, $latitude: Float, $longitude: Float, $limit: Int, $offset: Int) {
    allUsers(radiusKm: $radiusKm, latitude: $latitude, longitude: $longitude, limit: $limit, offset: $offset) {
      id
      username
      email
      bio
      dateOfBirth
      age
      neighbourhood
      cityName
      photoUrl
      distance
      affinityScore
      matchPercentage
      sharedHobbies {
        id
        name
        category {
          id
          name
        }
      }
      relatedHobbies {
        id
        name
        category {
          id
          name
        }
      }
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

export const GET_RECOMMENDED_USERS = GET_ALL_USERS;

/**
 * Query to globally search user profiles across the entire database ignoring location/affinity.
 */
export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int, $offset: Int) {
    searchUsers(query: $query, limit: $limit, offset: $offset) {
      id
      username
      email
      bio
      dateOfBirth
      age
      neighbourhood
      cityName
      photoUrl
      distance
      affinityScore
      matchPercentage
      sharedHobbies {
        id
        name
        category {
          id
          name
        }
      }
      relatedHobbies {
        id
        name
        category {
          id
          name
        }
      }
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
 * Mutation to update user profile details (bio, dateOfBirth, neighbourhood, photoUrl).
 */
export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile(
    $bio: String
    $neighbourhood: String
    $cityName: String
    $photoUrl: String
    $dateOfBirth: Date
  ) {
    updateUserProfile(
      bio: $bio
      neighbourhood: $neighbourhood
      cityName: $cityName
      photoUrl: $photoUrl
      dateOfBirth: $dateOfBirth
    ) {
      success
      message
      profile {
        id
        username
        bio
        dateOfBirth
        age
        neighbourhood
        cityName
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
