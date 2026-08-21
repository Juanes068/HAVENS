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
