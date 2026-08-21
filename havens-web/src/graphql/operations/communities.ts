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
      description
      locationName
      imageUrl
      memberCount
      latitude
      longitude
      createdAt
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
 * Query to fetch recommended circles scored by user hobby affinity and proximity.
 */
export const GET_RECOMMENDED_CIRCLES = gql`
  query GetRecommendedCircles {
    recommendedCircles {
      id
      name
      subdomain
      description
      locationName
      imageUrl
      memberCount
      affinityScore
      distance
      latitude
      longitude
      createdAt
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
 * Mutation to create a new circle with taxonomy and cover image.
 */
export const CREATE_COMMUNITY = gql`
  mutation CreateCommunity(
    $name: String!
    $subdomain: String
    $description: String
    $locationName: String
    $latitude: Float
    $longitude: Float
    $imageUrl: String
    $hobbyIds: [Int]
  ) {
    createCommunity(
      name: $name
      subdomain: $subdomain
      description: $description
      locationName: $locationName
      latitude: $latitude
      longitude: $longitude
      imageUrl: $imageUrl
      hobbyIds: $hobbyIds
    ) {
      success
      message
      community {
        id
        name
        subdomain
        description
        locationName
        imageUrl
        memberCount
        createdAt
        hobbies {
          id
          name
        }
      }
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
      membership {
        id
        joinedAt
        community {
          id
          name
        }
      }
    }
  }
`;
