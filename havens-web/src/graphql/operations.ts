/**
 * ============================================================================
 * GRAPHQL OPERATIONS (FACADE AGGREGATOR)
 * ============================================================================
 * This file serves as a backwards-compatible facade re-exporting all domain-
 * sliced GraphQL queries and mutations from `./operations/`.
 *
 * Domain Breakdown:
 *   - ./operations/auth.ts        -> TOKEN_AUTH, CREATE_USER, GENERATE_INVITE
 *   - ./operations/profile.ts     -> MY_PROFILE, GET_ALL_USERS, UPDATE_USER_PROFILE, UPDATE_ACCOUNT_SECURITY, DELETE_ACCOUNT
 *   - ./operations/taxonomy.ts    -> GET_ALL_HOBBY_CATEGORIES, UPDATE_USER_HOBBIES
 *   - ./operations/communities.ts -> GET_ALL_COMMUNITIES, JOIN_COMMUNITY
 *   - ./operations/events.ts      -> GET_ALL_EVENTS, GET_MY_CREATED_EVENTS, CREATE_EVENT, DELETE_EVENT, MY_RSVPS, SWIPE_EVENT
 *   - ./operations/social.ts      -> MY_FRIENDS, MY_FRIEND_REQUESTS, RESPOND_FRIEND_REQUEST
 *   - ./operations/matches.ts     -> CREATE_MATCH, MY_MATCHES, MESSAGES_BY_MATCH, SEND_MESSAGE
 *   - ./operations/media.ts       -> GENERATE_CLOUDINARY_SIGNATURE
 * ============================================================================
 */

export * from './operations/index';
