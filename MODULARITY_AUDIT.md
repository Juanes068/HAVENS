# Havens Architecture & Modularity Audit

**Audience:** Full-Stack Developers, Tech Leads, and AI Agents working on Havens.  
**Purpose:** Actionable blueprint for identifying, decomposing, and refactoring monolithic components and backend God Objects, complete with troubleshooting guides and edge-case warnings.

---

## 1. Executive Summary & Anti-Pattern Heatmap

| Component / Module | Path | Size | Primary Issue | Target Destination | Priority |
|---|---|---|---|---|---|
| **Plans View** | `havens-web/src/pages/Plans.tsx` | 862 lines | Mixes Creation Form, Map Picker, Cloudinary Upload, Filters, RSVP & Card Grid | `havens-web/src/pages/Plans/` (4 sub-components + 1 hook) | **High** |
| **Social View** | `havens-web/src/pages/Social.tsx` | 799 lines | Combines Friend Requests, Matchmaking, Discovery Cards, and Circles | `havens-web/src/pages/Social/` (3 sub-components + 1 hook) | **High** |
| **Onboarding View** | `havens-web/src/pages/Onboarding.tsx` | 800 lines | Monolithic 4-step wizard with file uploads, taxonomies & auth logic | `havens-web/src/pages/Onboarding/` (4 step views + machine hook) | **High** |
| **Calendar Tab** | `havens-web/src/components/CalendarTab.tsx` | 577 lines | Calendar grid rendering + Event modal + RSVP update logic | `havens-web/src/components/Calendar/` (3 sub-components) | **Medium** |
| **GraphQL Operations** | `havens-web/src/graphql/operations.ts` | 572 lines | Flat list of 25+ GraphQL queries & mutations across all domains | `havens-web/src/graphql/` (`auth.ts`, `events.ts`, `social.ts`, etc.) | **Medium** |
| **Backend Mutations** | `core/mutations.py` | 779 lines | 18+ mutations spanning Auth, Events, RSVPs, Friends, and Cloud uploads | `core/schema/mutations/` (Domain-sliced Graphene mixins) | **High** |
| **Backend Queries** | `core/queries.py` | 491 lines | Single Query class containing 29 query fields and resolvers | `core/schema/queries/` (Domain-sliced Graphene mixins) | **Medium** |

---

## 2. Frontend Decomposition Blueprints

---

### A. `pages/Plans.tsx` Refactoring Plan

#### Why It's Coupled:
`Plans.tsx` currently manages:
1. Form state (`title`, `description`, `date`, `time`, `location`, `category`, `visibility`, `imageFile`).
2. Cloudinary direct uploading (`uploadToCloudinary` flow with SHA-1 signature mutation).
3. Query fetching & caching (`GET_MY_CREATED_EVENTS` and `GET_ALL_EVENTS`).
4. Tab switching (`create plan` vs `my plans`), filtering (`all`, `upcoming`, `past`), and card rendering.
5. Deletion confirmation modal logic.

#### Target File Structure:
```
havens-web/src/pages/Plans/
├── index.tsx                  # Main Container / Router (SubTab switcher)
├── hooks/
│   ├── usePlanForm.ts         # Form state, validation, and submission logic
│   └── useCloudinaryUpload.ts # Cloudinary signature & upload fetch flow
├── components/
│   ├── PlanCreateForm.tsx     # Inputs, category picker, visibility selector, date/time
│   ├── PlanFilterTabs.tsx     # Status filter chips (All, Upcoming, Past)
│   ├── PlanCardGrid.tsx       # Grid of PlanItem cards with badges and actions
│   ├── PlanDeleteModal.tsx    # Confirmation dialog for deleting an event
│   └── PlanLocationPicker.tsx # Wrapper around LocationInput with preview
└── types.ts                   # PlanItem, Visibility, EventCreator, Category types
```

#### Step-by-Step Refactoring Recipe:
1. **Extract Types:** Move `PlanItem`, `Visibility`, `PlansSubTab`, `EventCreator` to `pages/Plans/types.ts`.
2. **Extract `useCloudinaryUpload` Hook:** Extract signature retrieval and FormData POST into a reusable hook `useCloudinaryUpload(folder: string)`.
3. **Extract `PlanCreateForm`:** Pass `onSubmit`, `isUploading`, `isSubmitting` as props.
4. **Extract `PlanCardGrid` & `PlanDeleteModal`:** Pass `plans`, `currentUserId`, `onDeleteClick`.

#### ⚠️ Troubleshooting & Common Pitfalls:
- **Timezone Offset Bug:** Combining separate `date` (YYYY-MM-DD) and `time` (HH:mm) strings into an ISO-8601 string (`${date}T${time}:00`) can cause timezone shifts when interpreted by Django. Always construct with `new Date(`${date}T${time}`).toISOString()`.
- **Cloudinary Signature Expiration:** Cloudinary signatures generated on the backend expire in 5 minutes. Do not cache the signature across form edits; always request a fresh signature on file submit.
- **Apollo Cache Invalidation:** When deleting a plan, `refetchQueries: [{ query: GET_ALL_EVENTS }, { query: GET_MY_CREATED_EVENTS }]` must be triggered, otherwise deleted events remain in the cache.

---

### B. `pages/Social.tsx` Refactoring Plan

#### Why It's Coupled:
`Social.tsx` currently manages:
1. Local storage cooldown logic (`havens_ignored_users` with 24-hour expiration).
2. "Meet" tab: User card swiping, ignore actions, and `CREATE_MATCH` mutation.
3. "Connections" tab: Pending friend requests (`MY_FRIEND_REQUESTS`, `RESPOND_FRIEND_REQUEST`), confirmed friends (`MY_FRIENDS`), and invite code generator.
4. "Circles" tab: Available communities (`GET_ALL_COMMUNITIES`) and join actions (`JOIN_COMMUNITY`).

#### Target File Structure:
```
havens-web/src/pages/Social/
├── index.tsx                  # Main Tab container (Meet, Connections, Circles)
├── hooks/
│   ├── useIgnoredUsers.ts     # localStorage ignore & cooldown logic
│   └── useMatchmaker.ts       # Card swiping, match creation, and ignore triggers
├── components/
│   ├── MeetTab/
│   │   ├── UserSwipeDeck.tsx  # Swipeable discovery cards for potential matches
│   │   └── MatchSuccessModal.tsx # Popup when mutual match is confirmed
│   ├── ConnectionsTab/
│   │   ├── FriendRequestsList.tsx # Pending friend requests with accept/reject buttons
│   │   ├── FriendsDirectory.tsx   # Active friend list with chat triggers
│   │   └── InviteGenerator.tsx    # Generate and copy invitation codes
│   └── CirclesTab/
│       └── CommunityList.tsx  # Community discovery cards and Join buttons
└── types.ts                   # TabType, CircleMatch, Friendship types
```

#### ⚠️ Troubleshooting & Common Pitfalls:
- **Bidirectional Friendship State:** When accepting a friend request, ensure Apollo refetches both `MY_FRIENDS` and `MY_FRIEND_REQUESTS`, or the pending badge will stay stuck in the UI.
- **Stale Ignored Users:** If a user clears their browser cache, ignored users will reappear. For persistent suppression, store ignore status in backend user preferences.

---

### C. `pages/Onboarding.tsx` Refactoring Plan

#### Why It's Coupled:
`Onboarding.tsx` handles:
1. Step 1: User account creation + Invitation code verification (for unauthenticated users).
2. Step 2: Primary hobby category selection (max 3 categories).
3. Step 3: Sub-hobby tag selection (max 5 per category).
4. Step 4: Profile photo upload (Cloudinary direct upload) + Bio + Location input.

#### Target File Structure:
```
havens-web/src/pages/Onboarding/
├── index.tsx                  # Wizard State Machine & Step Coordinator
├── hooks/
│   └── useOnboardingState.ts  # Form values, validation errors, and step transitions
├── components/
│   ├── Step1Account.tsx       # Username, Email, Password, Invite Code
│   ├── Step2Categories.tsx    # Gradient cards for primary categories
│   ├── Step3Hobbies.tsx       # Sub-hobby chip selector with limit counters
│   └── Step4ProfilePhoto.tsx  # Avatar dropzone, Bio, LocationInput, Finish button
└── constants.ts               # CATEGORY_GRADIENTS, MAX limits
```

#### ⚠️ Troubleshooting & Common Pitfalls:
- **Authentication Hand-off:** In Step 1, if account creation succeeds, the client immediately executes `TOKEN_AUTH` and calls `login(token)`. Make sure the auth token is persisted in `localStorage` before advancing to Step 2 so that `UPDATE_USER_HOBBIES` has a valid bearer token.
- **Category Pruning:** If a user selects 3 categories, chooses sub-hobbies, and then goes back to unselect a category, the sub-hobbies of that deselected category must be pruned from state before submission.

---

### D. `graphql/operations.ts` Modularization Plan

#### Target Structure:
```
havens-web/src/graphql/
├── index.ts               # Re-exports all operations for backwards compatibility
├── fragments/
│   ├── user.ts            # UserBasicFields, UserProfileFields
│   └── event.ts           # EventCardFields, EventDetailsFields
├── operations/
│   ├── auth.ts            # TOKEN_AUTH, CREATE_USER, VERIFY_TOKEN, REFRESH_TOKEN
│   ├── profile.ts         # MY_PROFILE, UPDATE_USER_PROFILE, UPDATE_ACCOUNT_SECURITY
│   ├── taxonomy.ts        # GET_ALL_HOBBY_CATEGORIES, GET_ALL_HOBBIES, UPDATE_USER_HOBBIES
│   ├── events.ts          # DISCOVERY_EVENTS, GET_ALL_EVENTS, CREATE_EVENT, DELETE_EVENT, SWIPE_EVENT
│   ├── tickets.ts         # GET_MY_TICKETS, CONFIRM_ATTENDANCE
│   ├── social.ts          # MY_FRIENDS, MY_FRIEND_REQUESTS, SEND_FRIEND_REQUEST, RESPOND_FRIEND_REQUEST
│   ├── matches.ts         # MY_MATCHES, CREATE_MATCH, GET_MESSAGES_BY_MATCH, SEND_MESSAGE
│   ├── communities.ts     # GET_ALL_COMMUNITIES, GET_COMMUNITY_BY_SUBDOMAIN, JOIN_COMMUNITY
│   └── media.ts           # GENERATE_CLOUDINARY_SIGNATURE, PRESIGNED_URL
```

---

## 3. Backend Decomposition Blueprints (`core/`)

---

### A. Modularizing `core/mutations.py` & `core/queries.py`

Django Graphene supports multi-inheritance for `Query` and `Mutation` root classes. This enables clean domain slicing without breaking the GraphQL schema contracts.

#### Target Structure:
```
core/
├── schema.py              # Root Schema Aggregator (from .schema import Query, Mutation)
└── schema/
    ├── __init__.py        # Combines mixins into class Query and class Mutation
    ├── queries/
    │   ├── __init__.py
    │   ├── auth.py        # resolve_my_profile, resolve_all_users, resolve_user_by_id
    │   ├── taxonomy.py    # resolve_all_hobby_categories, resolve_all_hobbies
    │   ├── communities.py # resolve_all_communities, resolve_community_by_subdomain
    │   ├── events.py      # resolve_discovery_events, resolve_all_events, resolve_my_created_events
    │   ├── tickets.py     # resolve_all_tickets, resolve_all_participations
    │   └── social.py      # resolve_my_friends, resolve_my_matches, resolve_messages_by_match
    └── mutations/
        ├── __init__.py
        ├── auth.py        # CreateUser, UpdateAccountSecurity, DeleteAccount
        ├── profile.py     # UpdateUserProfile, UpdateUserHobbies
        ├── communities.py # CreateCommunity, JoinCommunity
        ├── events.py      # CreateEvent, DeleteEvent, ConfirmAttendance, SwipeEvent
        ├── social.py      # SendFriendRequest, RespondFriendRequest, CreateMatch, SendMessage
        ├── invites.py     # GenerateInvite
        └── media.py       # GenerateCloudinarySignature, PresignedURL
```

#### How Graphene Mixins Work:
```python
# core/schema/queries/events.py
import graphene
from core.types import EventType

class EventQueries(graphene.ObjectType):
    discovery_events = graphene.List(EventType, ...)
    all_events = graphene.List(EventType, ...)

    def resolve_discovery_events(self, info, **kwargs):
        # Implementation...
        pass

# core/schema/__init__.py
import graphene
from .queries.auth import AuthQueries
from .queries.events import EventQueries
from .queries.social import SocialQueries
from .mutations.auth import AuthMutations
from .mutations.events import EventMutations

class Query(AuthQueries, EventQueries, SocialQueries, graphene.ObjectType):
    """Aggregated Query root."""
    pass

class Mutation(AuthMutations, EventMutations, graphene.ObjectType):
    """Aggregated Mutation root."""
    pass
```

---

## 4. Troubleshooting Guide for Common Issues

### Issue 1: "User is Anonymous" Warning on GraphQL Requests
- **Symptom:** Query returns empty list or warning: `🔴 BACKEND WARNING: Token received but user is still Anonymous`.
- **Cause:** JWT token format mismatch. Apollo might send `Authorization: Bearer <token>` while backend expects `Authorization: JWT <token>`, or vice versa.
- **Fix:** Check [`core/middleware.py`](file:///c:/Users/trian/Desktop/P%20HAVENS/core/middleware.py) and [`havens-web/src/services/apollo.ts`](file:///c:/Users/trian/Desktop/P%20HAVENS/havens-web/src/services/apollo.ts). `core/middleware.py` supports both prefixes, but ensure `django-graphql-jwt` middleware is registered in `havens/settings.py`.

### Issue 2: Haversine Distance Returning NULL / Empty Results
- **Symptom:** Discovery events feed returns no results when location coordinates are passed.
- **Cause:** If `latitude` or `longitude` on the user profile or event is `NULL`, the SQL trigonometric functions (`ACos`, `Cos`, `Sin`) evaluate to `NULL`.
- **Fix:** In [`core/queries.py`](file:///c:/Users/trian/Desktop/P%20HAVENS/core/queries.py), ensure `latitude is not None and longitude is not None` guards are checked before applying the Haversine annotation.

### Issue 3: Cloudinary Direct Upload Fails with "Signature Verification Failed"
- **Symptom:** Frontend upload to `api.cloudinary.com/v1_1/<cloud_name>/image/upload` returns HTTP 400 with signature error.
- **Cause:** Parameter mismatch between signed dictionary and FormData. Parameters signed by `generateCloudinarySignature` (such as `timestamp`, `folder`) must match the exact key-value pairs appended to `FormData`.
- **Fix:** Keep parameter serialization identical between `generateCloudinarySignature` mutation call and the `FormData` POST request.

### Issue 4: Celery Welcome Email Fails Silently
- **Symptom:** User registers, but no welcome email is received and no error is raised in UI.
- **Cause:** Redis server is offline or Celery worker is not running.
- **Fix:** The `CreateUser` mutation wraps `send_welcome_email_task.delay()` in a `try...except` block so registration succeeds even if email fails. Check Celery logs via `docker compose logs celery` or verify Redis connection on `localhost:6379`.

---

## 5. Dead Code Cleanup Reference

The following files are obsolete legacy artifacts and should not be edited:

- `havens-web/src/App.jsx` $\rightarrow$ Replaced by [`havens-web/src/App.tsx`](file:///c:/Users/trian/Desktop/P%20HAVENS/havens-web/src/App.tsx).
- `havens-web/src/components/CalendarTab.jsx` $\rightarrow$ Forwarding wrapper for [`CalendarTab.tsx`](file:///c:/Users/trian/Desktop/P%20HAVENS/havens-web/src/components/CalendarTab.tsx).
- `havens-web/src/components/PlansTab.jsx` $\rightarrow$ Forwarding wrapper for [`pages/Plans.tsx`](file:///c:/Users/trian/Desktop/P%20HAVENS/havens-web/src/pages/Plans.tsx).
- `havens-web/src/components/ScheduledEventCard.jsx` $\rightarrow$ Forwarding wrapper for [`ScheduledEventCard.tsx`](file:///c:/Users/trian/Desktop/P%20HAVENS/havens-web/src/components/ScheduledEventCard.tsx).
