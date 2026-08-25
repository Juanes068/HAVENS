import { gql } from '@apollo/client';

/**
 * Query to fetch all public and community events from the Django backend.
 */
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($latitude: Float, $longitude: Float, $radiusKm: Float, $upcomingOnly: Boolean, $creatorId: Int) {
    allEvents(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm, upcomingOnly: $upcomingOnly, creatorId: $creatorId) {
      id
      title
      description
      latitude
      longitude
      pointsReward
      visibility
      trustScore
      imageUrl
      locationName
      scheduledDate
      ageRange
      minAge
      maxAge
      createdAt
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
 * Query to fetch events created strictly by the authenticated user with full RSVP tracking.
 */
export const GET_MY_CREATED_EVENTS = gql`
  query GetMyCreatedEvents($upcomingOnly: Boolean) {
    myCreatedEvents(upcomingOnly: $upcomingOnly) {
      id
      title
      description
      latitude
      longitude
      pointsReward
      visibility
      trustScore
      imageUrl
      locationName
      scheduledDate
      ageRange
      minAge
      maxAge
      createdAt
      creator {
        id
        username
        photoUrl
      }
      rsvps {
        id
        response
        createdAt
        updatedAt
        user {
          id
          username
          photoUrl
          age
          neighbourhood
          cityName
        }
      }
      hobbies {
        id
        name
      }
    }
  }
`;

/**
 * Query to fetch RSVP attendance directory for a specific event.
 */
export const GET_EVENT_RSVPS = gql`
  query GetEventRsvps($eventId: Int!) {
    eventRsvps(eventId: $eventId) {
      id
      response
      createdAt
      updatedAt
      user {
        id
        username
        photoUrl
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
`;

/**
 * Mutation to create a new event on the Django backend with Age Range and taxonomy.
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
    $locationName: String
    $scheduledDate: DateTime
    $ageRange: String
    $minAge: Int
    $maxAge: Int
    $hobbyIds: [Int]
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
      locationName: $locationName
      scheduledDate: $scheduledDate
      ageRange: $ageRange
      minAge: $minAge
      maxAge: $maxAge
      hobbyIds: $hobbyIds
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
        locationName
        scheduledDate
        ageRange
        minAge
        maxAge
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
 * Mutation to modify details of an event created by the authenticated user.
 */
export const UPDATE_EVENT = gql`
  mutation UpdateEvent(
    $id: Int!
    $title: String
    $description: String
    $latitude: Float
    $longitude: Float
    $locationName: String
    $scheduledDate: DateTime
    $visibility: String
    $imageUrl: String
    $ageRange: String
    $minAge: Int
    $maxAge: Int
    $pointsReward: Int
    $communityId: Int
    $hobbyIds: [Int]
  ) {
    updateEvent(
      id: $id
      title: $title
      description: $description
      latitude: $latitude
      longitude: $longitude
      locationName: $locationName
      scheduledDate: $scheduledDate
      visibility: $visibility
      imageUrl: $imageUrl
      ageRange: $ageRange
      minAge: $minAge
      maxAge: $maxAge
      pointsReward: $pointsReward
      communityId: $communityId
      hobbyIds: $hobbyIds
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
        locationName
        scheduledDate
        ageRange
        minAge
        maxAge
        trustScore
        creator {
          id
          username
          photoUrl
        }
        rsvps {
          id
          response
          createdAt
          updatedAt
          user {
            id
            username
            photoUrl
            age
            neighbourhood
            cityName
          }
        }
        hobbies {
          id
          name
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
      createdAt
      event {
        id
        title
        description
        latitude
        longitude
        pointsReward
        visibility
        trustScore
        imageUrl
        locationName
        scheduledDate
        ageRange
        minAge
        maxAge
        createdAt
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
 * Mutation to delete an event created by the user.
 */
export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: Int!) {
    deleteEvent(id: $id) {
      success
      message
    }
  }
`;

