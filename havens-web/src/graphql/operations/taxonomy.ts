import { gql } from '@apollo/client';

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
