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
