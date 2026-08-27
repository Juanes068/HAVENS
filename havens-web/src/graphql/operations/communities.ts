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
      ageRange
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
      ageRange
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
 * Query to globally search circles/communities across the entire database ignoring location/affinity.
 */
export const SEARCH_COMMUNITIES = gql`
  query SearchCommunities($query: String!, $limit: Int, $offset: Int) {
    searchCommunities(query: $query, limit: $limit, offset: $offset) {
      id
      name
      subdomain
      description
      locationName
      isVirtual
      imageUrl
      ageRange
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
    $ageRange: String
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
      ageRange: $ageRange
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
        ageRange
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
        ageRange
        memberCount
        creator {
          id
          username
        }
      }
    }
  }
`;

/**
 * Query to fetch all joined members for a specific circle / community.
 */
export const GET_COMMUNITY_MEMBERS = gql`
  query GetCommunityMembers($communityId: Int!) {
    communityMembers(communityId: $communityId) {
      id
      joinedAt
      user {
        id
        username
        age
        bio
        photoUrl
        neighbourhood
        cityName
        hobbies {
          id
          name
        }
      }
    }
  }
`;

/**
 * Mutation to update an existing circle owned by the caller.
 */
export const UPDATE_COMMUNITY = gql`
  mutation UpdateCommunity(
    $id: Int
    $communityId: Int
    $name: String
    $description: String
    $locationName: String
    $latitude: Float
    $longitude: Float
    $isVirtual: Boolean
    $imageUrl: String
    $ageRange: String
    $minAge: Int
    $maxAge: Int
    $hobbyIds: [Int]
  ) {
    updateCommunity(
      id: $id
      communityId: $communityId
      name: $name
      description: $description
      locationName: $locationName
      latitude: $latitude
      longitude: $longitude
      isVirtual: $isVirtual
      imageUrl: $imageUrl
      ageRange: $ageRange
      minAge: $minAge
      maxAge: $maxAge
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
        ageRange
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
 * Query to fetch a single circle by its ID.
 */
export const GET_COMMUNITY_BY_ID = gql`
  query GetCommunityById($id: Int!) {
    communityById(id: $id) {
      id
      name
      subdomain
      description
      locationName
      latitude
      longitude
      isVirtual
      imageUrl
      ageRange
      minAge
      maxAge
      memberCount
      createdAt
      creator {
        id
        username
        photoUrl
        bio
        age
        neighbourhood
        cityName
      }
      hobbies {
        id
        name
      }
      events {
        id
        title
        description
        imageUrl
        locationName
        scheduledDate
        pointsReward
        visibility
        goingCount
        creator {
          id
          username
          photoUrl
        }
        rsvps {
          id
          response
          user {
            id
            username
            photoUrl
          }
        }
        hobbies {
          id
          name
        }
      }
      memberships {
        id
        joinedAt
        user {
          id
          username
          photoUrl
          bio
          age
          neighbourhood
          cityName
          hobbies {
            id
            name
          }
        }
      }
    }
  }
`;

/**
 * Mutation to remove a member from a Circle.
 */
export const REMOVE_COMMUNITY_MEMBER = gql`
  mutation RemoveCommunityMember($communityId: Int!, $userId: Int!) {
    removeCommunityMember(communityId: $communityId, userId: $userId) {
      success
      message
    }
  }
`;

/**
 * Mutation to leave a circle (removes current user from community).
 */
export const LEAVE_COMMUNITY = gql`
  mutation LeaveCommunity($communityId: Int!, $userId: Int!) {
    removeCommunityMember(communityId: $communityId, userId: $userId) {
      success
      message
    }
  }
`;

/**
 * Query to fetch group chat message history for a specific Circle.
 */
export const GET_CIRCLE_MESSAGES = gql`
  query GetCircleMessages($circleId: ID!, $limit: Int, $offset: Int) {
    getCircleMessages(circleId: $circleId, limit: $limit, offset: $offset) {
      id
      content
      createdAt
      sender {
        id
        username
        photoUrl
        neighbourhood
        cityName
      }
    }
  }
`;

/**
 * Mutation to send a group chat message to a Circle.
 */
export const SEND_CIRCLE_MESSAGE = gql`
  mutation SendCircleMessage($circleId: ID!, $content: String!) {
    sendCircleMessage(circleId: $circleId, content: $content) {
      success
      messageField
      message {
        id
        content
        createdAt
        sender {
          id
          username
          photoUrl
          neighbourhood
          cityName
        }
      }
    }
  }
`;


