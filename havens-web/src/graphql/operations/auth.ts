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
    $termsAccepted: Boolean!
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
      termsAccepted: $termsAccepted
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
