import { gql } from '@apollo/client';

/**
 * Query to fetch all micro-communities / circles.
 */
export const GET_ALL_COMMUNITIES = gql`
  query GetAllCommunities($limit: Int, $offset: Int) {
    allCommunities(limit: $limit, offset: $offset) {
      id
      name
      subdomain
      description
      locationName
      isVirtual
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
        category {
          id
          name
        }
      }
    }
  }
`;

/**
 * Query to fetch recommended circles scored by user hobby affinity and proximity with pagination.
 */
export const GET_RECOMMENDED_CIRCLES = gql`
  query GetRecommendedCircles($radiusKm: Float, $latitude: Float, $longitude: Float, $limit: Int, $offset: Int) {
    recommendedCircles(radiusKm: $radiusKm, latitude: $latitude, longitude: $longitude, limit: $limit, offset: $offset) {
      id
      name
      subdomain
      description
      locationName
      isVirtual
      imageUrl
      memberCount
      affinityScore
      distance
      matchPercentage
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
    $isVirtual: Boolean
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
      isVirtual: $isVirtual
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
        isVirtual
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

/**
 * Mutation to delete a circle created by the current user.
 */
export const DELETE_COMMUNITY = gql`
  mutation DeleteCommunity($id: Int, $communityId: Int) {
    deleteCommunity(id: $id, communityId: $communityId) {
      success
      message
      deletedCircleId
    }
  }
`;

/**
 * Query to fetch all community memberships belonging to the authenticated user.
 */
export const MY_COMMUNITIES = gql`
  query MyCommunities {
    myCommunities {
      id
      joinedAt
      community {
        id
        name
        subdomain
        description
        locationName
        isVirtual
        imageUrl
        memberCount
        creator {
          id
          username
        }
      }
    }
  }
`;

