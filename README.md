# havens — Technical Architecture & MVP Documentation

havens is a privacy-first, trust-circle web platform engineered to help people coordinate real-world gatherings, small group activities, and local discovery based on shared routines and interests. Rather than optimizing for infinite feed scrolling or algorithmic engagement loops, the platform focuses on bridging digital intent with physical meetups through localized, community-governed spaces called Circles.

This document serves as the comprehensive architectural reference, mathematical specification, and engineering log for the havens Minimum Viable Product (MVP).

---

## 1. Product Overview & Design Philosophy

### Mission & Core Philosophy
The core objective of havens is to lower the coordination friction of real-life social life without sacrificing personal privacy. Modern social platforms commodify user attention, encourage passive consumption, and treat physical locations as broadcast mechanisms. havens inverts this dynamic:

* **Intentional Coordination:** Technology stays in the background as an organizing utility for genuine in-person experiences.
* **Privacy by Default:** Coarse geographic coordinates and profile details are protected by boundary constraints and object-level permission barriers.
* **Circle Governance:** Autonomous group hubs (Circles) facilitate micro-communities organized around shared interests, routines, and neighborhoods.

```
+-------------------------------------------------------------------------+
|                      Progressive Discovery Model                         |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   | 1. Direct Connections (Accepted Friends)                        |   |
|   |    Full event visibility, direct messaging, direct invites      |   |
|   +--------------------------------+--------------------------------+   |
|                                    |                                    |
|   +--------------------------------v--------------------------------+   |
|   | 2. Mutual Friends & Circle Members                              |   |
|   |    High Trust Score weight (+15 to +50 pts), shared circle chat |   |
|   +--------------------------------+--------------------------------+   |
|                                    |                                    |
|   +--------------------------------v--------------------------------+   |
|   | 3. Nearby Verified Locals (Strict Haversine Boundary)           |   |
|   |    Affinity scoring only within geographic radius constraint    |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

### Brand Conventions & Visual Language
* **Typography & Casing:** Strict lowercase branding (`havens`) across the interface, code modules, and documentation.
* **Color System:** An earthy, grounded visual palette anchored by `#2D5A3D` as the primary forest accent, `#F4F6F0` / `#FAFBF7` warm canvas backgrounds, and slate neutrals (`#1A2E22`, `#607062`) to keep interfaces distraction-free and tactile.
* **Progressive Discovery Hierarchy:** Data access widens incrementally. Users first interact within direct friendships, branch outward to mutual connections and circle affiliations, and only interface with broader local discovery after meeting strict distance and validation thresholds.

---

## 2. System Architecture & Containerized Infrastructure

havens utilizes a multi-container Docker Compose topology to ensure complete environment parity between local development and production deployments.

```
                            +-----------------------------+
                            |     Client Browser / UI     |
                            |   (React 18 / Vite / TS)    |
                            |     Container Port: 5173    |
                            +--------------+--------------+
                                           |
                                [GraphQL POST / JWT]
                                           |
                                           v
                            +-----------------------------+
                            |     havens-web-app (WSGI)   |
                            |   Django 4.2 / Graphene     |
                            |     Container Port: 8000    |
                            +-------+-------------+-------+
                                    |             |
                     [ORM / SQL]   |             |  [Task Broker]
                                    |             |
                                    v             v
       +-------------------------------+   +-------------------------------+
       |       db (MySQL 8.0)          |   |     redis (Redis 7 Alpine)    |
       |   Host Port: 3307 -> 3306     |   |      Container Port: 6379     |
       +-------------------------------+   +---------------+---------------+
                                                           |
                                                    [Task Worker]
                                                           |
                                                           v
                                           +-------------------------------+
                                           |       celery (Worker Engine)  |
                                           |     Async Task Processing     |
                                           +-------------------------------+
```

### Container Topology & Roles
* **Frontend (`havens-frontend`):** Built with React 18, TypeScript, Vite 7, Apollo Client 3.14, and Tailwind CSS 3.4 running in an isolated `node:20-alpine` environment. Uses polling-aware file watching (`CHOKIDAR_USEPOLLING=true`) for hot-module replacement across Docker mounts.
* **Backend (`havens-web-app`):** Python 3.10-slim running Django 4.2 LTS, Graphene-Django 3.0, and Django GraphQL JWT. Serves all GraphQL queries and mutations through a unified schema pipeline.
* **Relational Database (`db`):** MySQL 8.0 configured with `utf8mb4` character encoding, custom health checks via `mysqladmin ping`, and persistent volume storage (`db_data`).
* **Cache & Message Broker (`redis`):** Redis 7 Alpine configured with Append-Only File (`--appendonly yes`) persistence. Handles sliding-window rate limiting and acts as Celery's message broker.
* **Background Worker (`celery`):** Standalone worker instance running Celery 5.3 tied to the primary Django application context for non-blocking email delivery and asynchronous event processing.

### Layered GraphQL Schema Routing
All GraphQL operations are cleanly decoupled across domain boundaries:

```
havens/
  schema.py                 <-- Root Schema Router (combines Query & Mutation)
  settings.py               <-- Application Settings & Security Policies
  urls.py                   <-- Route definitions & SecureGraphQLView entrypoint
core/
  schema.py                 <-- Modular Core Schema Entrypoint
  queries.py                <-- Field resolvers & Query ObjectType
  mutations.py              <-- Input validation, atomic DB operations & Mutations
  types.py                  <-- DjangoObjectType definitions & computed resolvers
  permissions.py            <-- Resolver-level authorization guards
  graphql_validation.py     <-- AST-level security & depth limit validation
  graphql_views.py          <-- SecureGraphQLView with execution timeouts
  rate_limit.py             <-- Redis sliding-window IP rate limiting
```

---

## 3. Data Schema & Relational Design

The database schema decouples core authentication records from user profile attributes, social graphs, and location data.

```
       +-------------------------+             1:1             +-------------------------+
       |   auth_user (Django)    +---------------------------->+       UserProfile       |
       |-------------------------|                             |-------------------------|
       | id: PK                  |                             | id: PK                  |
       | username: VARCHAR       |                             | user_id: FK -> User     |
       | email: VARCHAR          |                             | bio: TEXT               |
       | password: VARCHAR       |                             | date_of_birth: DATE     |
       +------------+------------+                             | neighbourhood: VARCHAR  |
                    |                                          | city_name: VARCHAR      |
                    | 1:N                                      | latitude: FLOAT         |
                    +--------------------+                     | longitude: FLOAT        |
                    |                    |                     | photo_url: VARCHAR      |
                    v                    v                     | invite_code: VARCHAR    |
       +------------+------------+  +----+------------------+  | total_points: INT       |
       |        Community        |  |    InvitationCode     |  +------------+------------+
       |-------------------------|  |-----------------------|               |
       | id: PK                  |  | id: PK                |               | M:N
       | name: VARCHAR           |  | code: VARCHAR(36)     |               v
       | subdomain: VARCHAR      |  | created_by_id: FK     |  +------------+------------+
       | creator_id: FK -> User  |  | used_by_id: FK (1:1)  |  |          Hobby          |
       | latitude / longitude    |  | is_used: BOOL         |  |-------------------------|
       | is_virtual: BOOL        |  | created_at: DATETIME  |  | id: PK                  |
       +------------+------------+  +-----------------------+  | category_id: FK         |
                    |                                          | name: VARCHAR           |
                    | 1:N                                      +------------+------------+
                    v                                                       |
       +------------+------------+                                          | N:1
       |          Event          |                                          v
       |-------------------------|                             +------------+------------+
       | id: PK                  |                             |      HobbyCategory      |
       | creator_id: FK -> User  |                             |-------------------------|
       | community_id: FK (NULL) |                             | id: PK                  |
       | title: VARCHAR          |                             | name: VARCHAR           |
       | latitude / longitude    |                             +-------------------------+
       | visibility: VARCHAR     |
       | scheduled_date: DATETIME|
       +------------+------------+
                    |
                    | 1:N
                    v
       +------------+------------+
       |        EventRSVP        |
       |-------------------------|
       | id: PK                  |
       | user_id: FK -> User     |
       | event_id: FK -> Event   |
       | response: VARCHAR       |
       | updated_at: DATETIME    |
       +-------------------------+
```

### Relational Entities & Constraints
* **`User` & `UserProfile`:** Separated via a strict `OneToOneField`. Profiles store physical neighborhood identifiers, coordinates, bios, total points, dynamically generated 6-character alphanumeric referral codes, and birth dates. Enforces a 14+ minimum age rule computed against UTC date boundaries.
* **Circle Governance (`Community`):** Enforces a hard cap of `MAX_CIRCLES_PER_USER = 3` at both the model validation level (`clean()`) and database save level (`save()`) to prevent community spam and fragmented group creation.
* **Social Connections (`Friendship`):** Asynchronous state machine tracking bidirectional user relationships with states `pending`, `accepted`, and `rejected`. Protected by unique composite indexes `unique_together = ('from_user', 'to_user')`.
* **Events & RSVP Architecture (`Event`, `EventRSVP`):** Events store coordinates, points reward values, and visibility tiers (`public`, `friends_only`, `community_only`). The `EventRSVP` table records response statuses (`going`, `maybe`, `pass`) with a composite unique constraint per user and event.
* **Hierarchical Taxonomy (`HobbyCategory`, `Hobby`):** Two-tier classification tree mapping parent categories (such as *Sports & Fitness*, *Technology*, *Arts & Creativity*) to granular child activities (such as *Bouldering*, *Machine Learning*, *Ceramics*), seeded via `python manage.py seed_hobbies`.

### N+1 Query Elimination & ORM Optimization
GraphQL resolvers utilize eager-loading strategies to prevent quadratic database query scaling:

```python
# Resolver optimization for communities and memberships
queryset = Community.objects.select_related(
    'creator',
    'creator__profile'
).prefetch_related(
    'hobbies__category',
    'memberships__user__profile'
)

# Resolver optimization for user recommendations
queryset = User.objects.select_related(
    'profile'
).prefetch_related(
    'profile__hobbies__category'
)
```

---

## 4. Mathematical Engine & Core Algorithms

### 4.1 Database-Level Geolocation Engine (Haversine Formula)
To prevent cross-city data leakage and eliminate unnecessary in-memory computation, physical proximity filtering is executed directly in the database engine using the Haversine spherical distance formula.

Given two geographic coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ where $\phi$ is latitude and $\lambda$ is longitude in radians, the great-circle distance $d$ across a spherical Earth of radius $R = 6371\text{ km}$ is defined as:

$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$

Using the spherical law of cosines, this is computed in Django ORM expressions using native trigonometric database functions:

$$d = R \cdot \arccos\left(\cos(\phi_1)\cos(\phi_2)\cos(\lambda_2 - \lambda_1) + \sin(\phi_1)\sin(\phi_2)\right)$$

```python
# Database-level Haversine expression executed in MySQL
distance_expr = 6371 * ACos(
    Cos(Radians(Value(ref_lat))) * Cos(Radians(F('profile__latitude'))) *
    Cos(Radians(F('profile__longitude')) - Radians(Value(ref_lon))) +
    Sin(Radians(Value(ref_lat))) * Sin(Radians(F('profile__latitude')))
)

# Strict geographic boundary applied before any affinity scoring
queryset = queryset.filter(
    profile__latitude__isnull=False,
    profile__longitude__isnull=False
).annotate(
    db_distance=distance_expr
).filter(
    db_distance__lte=radius_km
)
```

**Virtual Circle Bypass:** Circles configured with `is_virtual=True` or null coordinates bypass physical radius restrictions, allowing global participation for remote discussions and digital hubs.

### 4.2 Parent-Category Affinity Matcher
Candidate profiles and circles passing the strict geographic boundary are evaluated by an affinity scoring engine. The algorithm weights exact hobby intersections against broader interest category alignment:

$$\text{Affinity Score} = (|H_{\text{user}} \cap H_{\text{candidate}}| \times 3) + (|C_{\text{user}} \cap C_{\text{candidate, related}}| \times 1)$$

Where:
* $H_{\text{user}}$ is the set of the requesting user's specific hobby IDs.
* $H_{\text{candidate}}$ is the candidate's set of hobby IDs.
* $C_{\text{user}}$ is the set of category IDs associated with the user's hobbies.
* $C_{\text{candidate, related}}$ is the set of hobbies belonging to the user's categories but not matching on the exact hobby ID.

The normalized match percentage is calculated internally for ranking:

$$\text{Match Ratio} = \frac{|H_{\text{exact}}| \times 1.0 + |H_{\text{related}}| \times 0.4}{\max(1, |H_{\text{user}}|)}$$

$$\text{Match Percentage} = \min\left(99, \max\left(20, \lfloor \text{Match Ratio} \times 100 \rfloor \right)\right) \quad \text{if } (|H_{\text{exact}}| + |H_{\text{related}}| > 0) \text{ else } 0$$

Raw numerical percentages are filtered out of public UI surfaces to avoid bias, while underlying affinity scores strictly determine feed ordering.

### 4.3 Dynamic Trust Score Resolution
Events are dynamically scored based on the attendee's personal relationship graph and institutional affiliations:

$$\text{Trust Score} = S_{\text{host}} + S_{\text{mutual}} + S_{\text{community}}$$

* **Host Connection ($S_{\text{host}}$):** $+50\text{ pts}$ if the event host is a confirmed direct friend (`status='accepted'`).
* **Mutual Attendees ($S_{\text{mutual}}$):** $+15\text{ pts}$ per mutual confirmed friend who has RSVPed as `going`, capped at $+30\text{ pts}$ (2 friends).
* **Circle Membership ($S_{\text{community}}$):** $+20\text{ pts}$ if the event is hosted by a Circle in which the user holds an active membership.

```python
def resolve_trustScore(self, info):
    user = info.context.user
    if not user or not user.is_authenticated:
        return 0

    score = 0
    # 1. Host is a direct friend
    if self.creator:
        if Friendship.objects.filter(
            Q(from_user=user, to_user=self.creator, status='accepted') |
            Q(from_user=self.creator, to_user=user, status='accepted')
        ).exists():
            score += 50

    # 2. Mutual friends attending ('going')
    user_friends = set(Friendship.objects.filter(from_user=user, status='accepted').values_list('to_user_id', flat=True))
    user_friends.update(Friendship.objects.filter(to_user=user, status='accepted').values_list('from_user_id', flat=True))

    going_users = set(EventRSVP.objects.filter(event=self, response='going').values_list('user_id', flat=True))
    mutual_going = user_friends & going_users
    score += min(len(mutual_going) * 15, 30)

    # 3. Same community affiliation
    if self.community and CommunityMembership.objects.filter(user=user, community=self.community).exists():
        score += 20

    return score
```

---

## 5. Key Modules & User Experience Flows

```
+---------------------------------------------------------------------------------------+
|                                User Journey & Modules                                 |
|                                                                                       |
|   +-------------------+      +--------------------+      +------------------------+   |
|   | 1. Onboarding     +----->| 2. Discovery Feed  +----->| 3. Event & Circle Flow |   |
|   | - Legal Terms     |      | - Dual-Mode Map    |      | - RSVP (Going/Maybe)   |   |
|   | - Age (14+) Check |      | - Facepile UI      |      | - Facepile Update      |   |
|   | - Hobby Selection |      | - Geolocation Sync |      | - Direct Chat & Media  |   |
|   | - Invite Code TTL |      | - Affinity Ranking |      | - Circle Chat          |   |
|   +-------------------+      +--------------------+      +------------------------+   |
+---------------------------------------------------------------------------------------+
```

### Guided Step-by-Step Onboarding
* **Step 1: Terms & Privacy Agreement:** Mandatory affirmative acceptance of platform legal terms, UGC safe-harbor rules, and geolocation policies before proceeding.
* **Step 2: Profile Foundation & Age Gate:** Collection of username, email, password, neighborhood, and date of birth. Enforces 14+ age restriction.
* **Step 3: Multi-Step Hobby Selector:** Structured taxonomy picker allowing users to select up to 3 primary categories and up to 5 sub-hobbies per category.
* **Step 4: Profile Media:** Direct-to-cloud profile picture upload via signed Cloudinary parameters.

### Dynamic Rotating Invitation System
* Personal referral codes generated upon profile creation with a default 6-character uppercase alphanumeric format.
* Dynamic event/community invite links utilize short-lived codes with a 2-minute Time-to-Live (TTL) expiration window and on-demand refresh mutations to minimize link leakage.

### Google Maps Platform Integration
* Reusable `LocationAutocomplete` and `LocationInput` components wrapping Google Maps Places API (New) and Geocoding API.
* Converts physical user inputs into validated street addresses, neighborhood names, and floating-point latitude/longitude coordinates.
* Strict API key referrer restrictions preventing unauthorized third-party origin consumption.

### Discovery Feed & Interactive Map
* Dual-mode discovery interface allowing real-time switching between responsive card feeds and interactive Google Maps pinboards (`DiscoveryMapView`).
* **Facepile UI (`Facepile.tsx`):** Renders stacked, overlapping avatar rows for users registered as `going` or `maybe` on each gathering.
* **Feed Personalization:** Automatically excludes events created by the caller, gatherings where the user is already marked as `going`, and past gatherings.

### Secure Cloudinary Media Pipelines
Media uploads never touch the Django application server as multipart file streams. Instead, clients request a cryptographically signed signature payload and transmit files directly to Cloudinary:

```
Client (Browser)                  Django Backend                   Cloudinary API
       |                                |                                |
       |-- 1. generateCloudinarySig() ->|                                |
       |   (folder, timestamp)          |                                |
       |                                |-- 2. HMAC-SHA1 Hash ---------->|
       |<- 3. Return signature & key ---|      using CLOUDINARY_SECRET   |
       |                                                                 |
       |-- 4. POST multipart payload (File + Signature) ---------------->|
       |<- 5. Return secure URL & public_id -----------------------------|
       |                                                                 |
       |-- 6. Save photoUrl via GraphQL Mutation ----------------------->|
```

* Backend signs parameters using HMAC-SHA1 via `GenerateCloudinarySignature`.
* Media is isolated into dedicated directories: `havens_profiles` for user avatars and `havens_events` for gathering cover art.

---

## 6. Security Hardening & Threat Mitigation

### Object-Level Authorization
* Custom resolver permissions (`permissions.py`) verify ownership before modifying profiles, circles, or events.
* 1-on-1 direct messaging and circle chat resolvers strictly enforce active participant checks. Users cannot read or inject messages into conversations outside their memberships.

### GraphQL Defense-in-Depth
* **Schema Introspection Blocking:** Introspection queries (`__schema`, `__type`) are blocked when `DEBUG=False` via `NoSchemaIntrospectionCustomRule`.
* **AST Query Depth Limiting:** Queries are validated against a strict depth limit of 5 levels (`GRAPHQL_MAX_QUERY_DEPTH = 5`) using `depth_limit_validator` to prevent nested recursive denial-of-service (DoS) attacks.
* **Execution Timeout:** The custom `SecureGraphQLView` applies execution timeouts via POSIX timers (`setitimer`) to abort runaway queries.

### Network & Traffic Controls
* **Sliding-Window Rate Limiting:** `GraphQLRateLimitMiddleware` enforces Redis-backed rate limits:
  * General GraphQL operations: 60 requests per minute per IP.
  * Sensitive authentication mutations (`createUser`, `tokenAuth`, `updateAccountSecurity`): 10 requests per minute per IP.
* **CORS Lockdown:** Strict origin whitelisting (`CORS_ALLOW_ALL_ORIGINS = False`) restricting API access to `https://havensapp.com`, authorized subdomains, and designated local development ports.

### Credential Isolation & Safe Error Masking
* Zero hardcoded secrets: all database credentials, JWT secrets, SMTP passwords, and API keys are loaded strictly from the root `.env` file (ignored in `.gitignore`).
* **Error Masking (`format_graphql_error`):** In production mode, database exceptions (`OperationalError`, `IntegrityError`, MySQL tracebacks) are stripped from GraphQL error responses and replaced with generic, safe client messages.

---

## 7. Background Pipelines & Legal Compliance

### Asynchronous Email Tasks
Email delivery is offloaded to Celery background workers to keep GraphQL HTTP response times under 50ms:

```python
@shared_task(name='core.tasks.send_welcome_email_task')
def send_welcome_email_task(user_email, username, app_url=None):
    """Dispatches formatted HTML welcome email through configured SMTP relay."""
    ...
```

* Production setups route through Resend / SMTP relays with TLS encryption on port 587.
* Local development defaults to Django's console email backend when `EMAIL_HOST` is unset.

### Legal Compliance Framework
The platform incorporates built-in terms and conditions covering:
* **UGC Safe Harbor:** User-generated content moderation policies and circle content boundaries.
* **Geolocation Privacy Compliance:** Explicit user consent for location processing with coarse neighborhood masking.
* **Hold Harmless Liability Waiver:** Standardized liability protections for independent, user-organized in-person gatherings.

---

## 8. Local Setup, Environment & Deployment

### Prerequisites
* Docker Engine 24.0+ and Docker Compose v2+
* Node.js 20+ and Python 3.10+ (for local, non-containerized workflows)
* Valid Google Maps API Key and Cloudinary credentials

### Environment Configuration
Create a `.env` file in the root directory:

```env
# Django Core Settings
DJANGO_ENV=development
DEBUG=True
SECRET_KEY=replace-with-a-secure-random-secret-key-32-chars-min
ALLOWED_HOSTS=localhost,127.0.0.1,web

# Database Configuration (MySQL)
DB_NAME=havens_db
DB_USER=root
DB_PASSWORD=your_secure_mysql_password
DB_HOST=db
DB_PORT=3306

# Redis & Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key

# Email Relay (Resend / SMTP)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=re_your_resend_api_key
DEFAULT_FROM_EMAIL=havens <welcome@havensapp.com>
FRONTEND_URL=http://localhost:5173
```

### Docker Lifecycle Commands

```bash
# 1. Build and start all services in detached mode
docker compose up -d --build

# 2. Apply database migrations
docker compose exec web python manage.py migrate

# 3. Seed hobby categories and taxonomy
docker compose exec web python manage.py seed_hobbies

# 4. Create administrative superuser
docker compose exec web python manage.py createsuperuser

# 5. Clean up or deduplicate event records (if needed)
docker compose exec web python manage.py cleanup_events

# 6. Stream real-time container logs
docker compose logs -f web celery
```

### Local Port Allocation
| Service | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- |
| `frontend` | 5173 | `5173` | Vite React Development Server |
| `web` | 8000 | `8000` | Django GraphQL API Backend |
| `db` | 3306 | `3307` | MySQL 8.0 Database Engine |
| `redis` | 6379 | `6379` | Redis 7 Cache & Task Broker |

---

## 9. References, Standards & Academic Sources

* Sinnott, R. W. (1984). "Virtues of the Haversine." *Sky and Telescope*, 68(2), 159.
* GraphQL Working Group. (October 2021). "GraphQL Specification." *GraphQL Foundation*. https://spec.graphql.org/
* Fielding, R. T., & Reschke, J. (2014). "Hypertext Transfer Protocol (HTTP/1.1): Authentication." *RFC 7235*, IETF.
* Jones, M., Bradley, J., & Sakimura, N. (May 2015). "JSON Web Token (JWT)." *RFC 7519*, IETF. https://datatracker.ietf.org/doc/html/rfc7519
* OWASP Foundation. (2023). "OWASP Top 10 API Security Risks – 2023." *Open Web Application Security Project*. https://owasp.org/API-Security/
* Django Software Foundation. (2024). "Django Documentation: Database access optimization and Geographic Queries." https://docs.djangoproject.com/
* Meta Platforms & Apollo GraphQL. (2024). "Apollo Client for React: State Management and Query Caching." https://www.apollographql.com/docs/react/
* Google Cloud Platform. (2024). "Places API (New) & Maps JavaScript API Reference." https://developers.google.com/maps/documentation
* Cloudinary Ltd. (2024). "Generating Authenticated Upload Signatures." https://cloudinary.com/documentation/upload_images#generating_authentication_signatures