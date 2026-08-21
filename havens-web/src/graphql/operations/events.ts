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
 * Query to fetch events created strictly by the authenticated user.
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
 * Mutation to create a new event on the Django backend.
 * imageUrl: the Cloudinary secure_url returned after a successful upload.
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
