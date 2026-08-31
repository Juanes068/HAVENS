# havens

havens is a community-first social platform designed to bridge the gap between digital interaction and real-world connection. Instead of keeping people glued to endless feeds, the platform helps trusted circles, local groups, and friends discover meaningful activities, coordinate plans, and organize spontaneous encounters in their area.

The product follows a minimalist aesthetic with earthy tones—centered around our signature forest green (`#2D5A3D`)—and maintains a clean, intentional lowercase identity throughout the interface.

---

## Architecture and Technology Stack

havens is built as a modular, containerized application designed for high performance, geospatial accuracy, and developer velocity.

```
                   +---------------------------------------+
                   |           React 18 + Vite             |
                   |      Tailwind CSS + Apollo Client     |
                   |       (Node 20 Alpine Container)      |
                   +-------------------+-------------------+
                                       |
                              GraphQL / JSON (HTTP)
                                       |
                   +-------------------v-------------------+
                   |         Django 4.2 + Graphene         |
                   |         (Python 3.11 Container)       |
                   |      havens/schema -> core/schema     |
                   +---------+-------------------+---------+
                             |                   |
            +----------------v---+           +---v----------------+
            |    MySQL 8.0 DB    |           |   Redis 7 Alpine   |
            | (Geospatial / ORM) |           |  (Cache & Limits)  |
            +--------------------+           +---+----------------+
                                                 |
                                             Tasks queue
                                                 |
                                             +---v----------------+
                                             |   Celery Worker    |
                                             | (Async Dispatcher) |
                                             +---+----------------+
                                                 |
                                 +---------------+---------------+
                                 |                               |
                         +-------v-------+               +-------v-------+
                         |  Resend Mail  |               |  Cloudinary   |
                         | (Transactional|               | (Media CDN)   |
                         +---------------+               +---------------+
```

### Containerized Environment

The entire stack runs in isolated Docker containers orchestrated via Docker Compose:

- **Frontend Container**: Node 20 Alpine running Vite with polling watchers enabled (`CHOKIDAR_USEPOLLING=true`) to ensure seamless Hot Module Replacement (HMR) during Windows and cross-platform development.
- **Backend Container**: Python with Django 4.2, handling API requests, business logic, authentication, and database migrations.
- **Database Container**: MySQL 8.0 running on an internal Docker network, exposed locally on port `3307` to prevent collisions with existing system databases.
- **Cache & Message Broker**: Redis 7 Alpine managing rate limits, query caches, and task queues.
- **Background Worker**: Celery worker instance processing asynchronous jobs such as email dispatches and notification pipelines.

### Frontend

- **React 18 & Vite**: Fast build times, modern JSX rendering, and instant dev server startup.
- **Apollo Client 3**: Declarative data fetching, normalized client-side caching, and centralized JWT header injection.
- **Tailwind CSS**: Utility-first styling framework engineered for fluid responsiveness across mobile devices, tablets, and desktop displays.
- **Lucide Icons & Google Maps**: Clean iconography combined with `@react-google-maps/api` for smooth visual mapping.

### Backend

- **Django & Graphene-Django**: A structured GraphQL API built on a layered architecture:
  - `havens/schema.py`: Acts as the root schema router.
  - `core/schema.py`: Aggregates domain-specific queries, mutations, and types.
  - `core/queries.py` and `core/mutations.py`: House isolated business logic, authorization checks, and payload resolvers.
- **MySQL & Django ORM**: Relational persistence layer optimized with compound indexes and specialized queries.
- **Cloudinary Storage**: Direct client-to-cloud media uploading utilizing backend-generated SHA signatures, eliminating server bandwidth bottlenecks for avatar and event image processing.

### Supporting Services

- **Redis**: Low-latency cache store and distributed rate-limiting backend.
- **Celery**: Background task runner executing long-running I/O operations without blocking the HTTP request-response cycle.
- **Resend**: Transactional email provider for welcome emails, invitation codes, and system notifications.
- **Google Maps Platform**: Geocoding API and Places API (New) for location autocomplete, address resolution, and pin placement.

---

## Key Modules and Features

### 1. Authentication and Onboarding

- **Gatekeeper Flow**: Flexible onboarding with step-by-step profile configuration.
- **Age Validation**: Strict birthdate checks enforcing a minimum age requirement of 14 years before profile creation.
- **Profile Customization**: Biography authoring, city selection, and secure direct-to-Cloudinary photo uploads.
- **Taxonomic Hobby Engine**: Multi-tier interest selector organizing hobbies into primary and secondary categories for granular affinity scoring.

### 2. Geolocation Engine

- **Haversine Distance Filtering**: Proximity queries evaluate the spherical Haversine formula directly in SQL at the database layer:
  $$\text{distance} = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
- **Zero In-Memory Overhead**: Distance calculations are executed during database index scans, allowing strict radial filtering (e.g., within 5 km, 15 km, or 50 km) without loading unnecessary records into Python memory.

### 3. Discovery and Interactive Maps

- **Dual Discovery View**: Seamless switching between an interactive map with customized pins and an interactive card feed.
- **Human-Readable Addresses**: Integration with Google Geocoding converts raw coordinate pairs into clean, formatted street addresses.
- **Temporal Garbage Filtering**: Query resolvers automatically filter out expired gatherings, ensuring users only see active or upcoming events.

### 4. Social Hub and Circles

- **Connection Lifecycle**: Asynchronous relationship states (`pending`, `accepted`, `declined`) with bidirectional status updates.
- **Affinity Scoring**: Algorithm computes overlap between member hobby taxonomies to highlight shared interests and potential compatibility.
- **Flexible Circles**: Users can create location-based local hubs or virtual circles that operate independently of geographical constraints.
- **Paginated Directories**: Cursor and offset-based pagination to maintain sub-second response times across large directories.

### 5. Calendar and Plan Management

- **Personal Agenda**: Centralized view of all confirmed and pending events.
- **RSVP States**: Multi-state attendance tracking (`Going`, `Maybe`) with live attendee counters.
- **Event Sharing & Ownership**: Direct plan sharing capabilities alongside strict creator permissions for updating details or safely canceling gatherings.

---

## Cybersecurity and System Robustness

```
 Client Request
       |
       v
+-------------------------------------------------------------+
| Nginx / Reverse Proxy                                       |
| - Rate Limiting & SSL Termination                           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Django Security Layer                                       |
| - CORS Policy & Allowed Hosts validation                    |
| - Redis-backed Rate Limiter (IP & User buckets)             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| GraphQL Security Inspection                                 |
| - AST Query Depth Limiter (rejects deeply nested queries)   |
| - Introspection Disabled in Production                      |
| - JWT Signature & Expiration Verification                   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Resolver Authorization & Permissions                        |
| - Object-level ownership checks                             |
| - Chat and circle membership verification                   |
| - Masked error handler (suppresses raw SQL/tracebacks)      |
+-------------------------------------------------------------+
```

### GraphQL Hardening

- **Object-Level Access Control**: Resolvers verify entity ownership and group participation before returning records. Private message threads and member lists cannot be queried without valid membership.
- **Query Depth Limiting**: The GraphQL AST validator analyzes incoming queries and rejects malicious requests exceeding safe depth thresholds, preventing nested denial-of-service attempts.
- **Introspection Controls**: Schema introspection is automatically disabled in production environments (`DEBUG=False`) to prevent unauthorized API schema scraping.

### Network and Resource Protection

- **Redis Rate Limiting**: Request buckets track traffic per IP address and authenticated user, throttling automated scrapers and brute-force attempts.
- **Connection Health & Recycling**: MySQL connections are managed with persistent reuse parameters to avoid thread exhaustion during high concurrency.

### Secrets and Privacy Management

- **Environment Isolation**: All credentials, tokens, and third-party secrets (Google Maps, Cloudinary, Resend, database passwords) are stored exclusively in `.env` files and injected at runtime.
- **Legal Compliance**: Explicit Terms of Service and Privacy Policy consent is required upon registration.
- **Sanitized Error Responses**: Internal database exceptions and traceback outputs are caught and masked, delivering generic error messages to the client while logging full traces securely on the server.

---

## Local Installation and Execution Guide

### Prerequisites

Ensure you have the following tools installed on your development machine:

- **Docker Desktop** (with Docker Compose v2)
- **Git**

### 1. Clone the Repository and Configure Environment

```bash
git clone https://github.com/Juanes068/Capstone-Project.git
cd Capstone-Project
```

Copy the example environment configuration and fill in the required API keys:

```bash
cp .env.example .env
```

Ensure your `.env` contains the required variables:

```env
# Django Settings
SECRET_KEY=your_local_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,web

# Database Settings
DB_NAME=havens_db
DB_USER=root
DB_PASSWORD=your_root_password
DB_HOST=db
DB_PORT=3306

# Redis
REDIS_URL=redis://redis:6379/1

# Third-Party Integrations
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=your_resend_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
```

### 2. Build and Start the Infrastructure

Launch all containers in detached mode:

```bash
docker compose up -d --build
```

Verify that all five services are healthy and running:

```bash
docker compose ps
```

### 3. Run Database Migrations

Apply database migrations inside the web container:

```bash
docker compose exec web python manage.py migrate
```

*(Optional)* Create a Django administrative superuser:

```bash
docker compose exec web python manage.py createsuperuser
```

### 4. Access Local Endpoints

Once the containers are running, access the local services:

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:5173` | React application with Vite hot reloading |
| **GraphQL API** | `http://localhost:8000/graphql/` | GraphQL endpoint and GraphiQL interactive playground |
| **Django Admin** | `http://localhost:8000/admin/` | Superuser administration dashboard |
| **MySQL Database** | `localhost:3307` | Database host mapping for external tools (DBeaver, TablePlus) |

### 5. Useful Development Commands

- **View container logs:**
  ```bash
  docker compose logs -f web frontend
  ```
- **Restart a specific service:**
  ```bash
  docker compose restart web
  ```
- **Stop all containers:**
  ```bash
  docker compose down
  ```
- **Stop containers and clear database volumes (fresh start):**
  ```bash
  docker compose down -v
  ```

---

## Repository Structure

```
.
├── core/                   # Main Django application
│   ├── models.py           # Relational database models
│   ├── queries.py          # GraphQL query resolvers
│   ├── mutations.py        # GraphQL mutation resolvers
│   ├── types.py            # Graphene ObjectType mappings
│   ├── permissions.py      # Authorization & access control helpers
│   ├── rate_limit.py       # Redis rate limiting implementation
│   ├── tasks.py            # Celery asynchronous background tasks
│   └── tests.py            # Test suites
├── havens/                 # Django project configuration
│   ├── settings.py         # App settings and environment loading
│   ├── urls.py             # Main routing table
│   └── schema.py           # Root GraphQL schema router
├── havens-web/             # Frontend application
│   ├── src/                # React application source code
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.js      # Vite build configuration
│   └── Dockerfile          # Node 20 Alpine frontend container
├── docker-compose.yml      # Multi-container orchestration config
├── requirements.txt        # Python backend dependencies
└── README.md               # Project documentation
```