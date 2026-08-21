import { gql } from '@apollo/client';

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
