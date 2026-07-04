# Havens API v2 — Postman Collection Reference

> **URL base:** `POST http://localhost:8000/graphql/`
> **Headers obligatorios en TODAS las requests:**
> ```
> Content-Type: application/json
> ```
> **Headers para endpoints autenticados:**
> ```
> Authorization: JWT <tu-token-aqui>
> ```
> ⚠️ **Siempre usa el prefijo `JWT ` antes del token.**

---

## ⚠️ IMPORTANTE: Migraciones

Después de actualizar los modelos, corre las migraciones:
```bash
docker-compose exec web python manage.py makemigrations core
docker-compose exec web python manage.py migrate
```

---

## 🔐 1. Auth & User

### 1.1 Token Login
**Auth:** Ninguno (público)
```graphql
mutation {
  tokenAuth(username: "havens_tester", password: "SuperSecret123!") {
    token
  }
}
```

### 1.2 My Profile
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myProfile {
    id
    username
    email
    totalPoints
    bio
    neighbourhood
    photoUrl
  }
}
```

### 1.3 Update User Profile (Feature 7)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  updateUserProfile(bio: "Soy amante de los eventos", neighbourhood: "El Poblado, Medellín", photoUrl: "https://s3.amazonaws.com/havens/avatar.jpg") {
    profile {
      id
      username
      bio
      neighbourhood
      photoUrl
    }
    success
    message
  }
}
```

### 1.4 Verify Token
**Auth:** Ninguno
```graphql
mutation {
  verifyToken(token: "eyJhbGciOiJIUzI1NiIs...") {
    payload
  }
}
```

### 1.5 Refresh Token (v0.3.x)
**Auth:** Ninguno
```graphql
mutation {
  refreshToken(token: "eyJhbGciOiJIUzI1NiIs...") {
    token
  }
}
```

---

## 📝 2. Users & Registration (Feature 1: Gatekeeper)

### 2.1 Create User (REQUIRES Invitation Code)
**Auth:** Ninguno (público)
```graphql
mutation {
  createUser(
    username: "new_user"
    email: "new@havens.app"
    password: "SecurePass123!"
    invitationCode: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    bio: "Hola, soy nuevo aquí"
    neighbourhood: "El Poblado"
  ) {
    user {
      id
      username
      email
    }
    success
    message
  }
}
```

### 2.2 Generate Invitation Code (Feature 1)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  generateInvite {
    invitation {
      id
      code
      isUsed
      createdAt
    }
    success
    message
  }
}
```

### 2.3 My Invitation Codes (Feature 1)
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myInvitationCodes {
    id
    code
    isUsed
    usedBy {
      username
    }
    createdAt
  }
}
```

---

## 🏘️ 3. Communities (Feature 2)

### 3.1 Create Community
**Auth:** Ninguno (público)
```graphql
mutation {
  createCommunity(name: "Beach Lovers", subdomain: "beach") {
    success
    message
    community {
      id
      name
      subdomain
    }
  }
}
```

### 3.2 Join Community (Feature 2)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  joinCommunity(communityId: 1) {
    membership {
      id
      community {
        id
        name
      }
      joinedAt
    }
    success
    message
  }
}
```

### 3.3 My Communities (Feature 2)
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myCommunities {
    id
    community {
      id
      name
      subdomain
    }
    joinedAt
  }
}
```

### 3.4 Community by Subdomain
**Auth:** Ninguno
```graphql
query {
  communityBySubdomain(subdomain: "beach") {
    id
    name
    subdomain
    events {
      id
      title
      latitude
      longitude
    }
  }
}
```

### 3.5 All Communities
**Auth:** Ninguno
```graphql
query {
  allCommunities {
    id
    name
    subdomain
  }
}
```

---

## 🤝 4. Friendships (Feature 3: Red de Confianza)

### 4.1 Send Friend Request
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  sendFriendRequest(toUserId: 2) {
    friendship {
      id
      fromUser {
        username
      }
      toUser {
        username
      }
      status
      createdAt
    }
    success
    message
  }
}
```

### 4.2 Respond to Friend Request
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  respondFriendRequest(friendshipId: 1, action: "accept") {
    friendship {
      id
      status
    }
    success
    message
  }
}
```

### 4.3 My Friends
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myFriends {
    id
    username
    totalPoints
    bio
    photoUrl
  }
}
```

### 4.4 My Friend Requests (pending)
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myFriendRequests {
    id
    fromUser {
      id
      username
      photoUrl
    }
    status
    createdAt
  }
}
```

---

## 📍 5. Events & Tinder Swipe (Feature 4)

### 5.1 Create Event (Autenticado)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  createEvent(
    title: "Beach Cleanup"
    description: "Clean the beach and earn points"
    latitude: 4.7110
    longitude: -74.0721
    communityId: 1
    pointsReward: 50
    visibility: "public"
  ) {
    success
    message
    event {
      id
      title
      creator {
        id
        username
      }
      trustScore
    }
  }
}
```

### 5.2 Swipe Event / RSVP (Feature 4)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  swipeEvent(eventId: 1, response: "going") {
    rsvp {
      id
      response
      event {
        id
        title
      }
    }
    success
    message
  }
}
```
> Response options: `going`, `maybe`, `pass`

### 5.3 My RSVPs (Feature 4)
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myRsvps {
    id
    response
    event {
      id
      title
      latitude
      longitude
      scheduledDate
    }
  }
}
```

### 5.4 Event RSVPs
**Auth:** Ninguno
```graphql
query {
  eventRsvps(eventId: 1) {
    id
    response
    user {
      id
      username
    }
  }
}
```

### 5.5 All Events (with geofilter)
**Auth:** Ninguno
```graphql
query {
  allEvents(latitude: 4.7110, longitude: -74.0721, radiusKm: 10.0) {
    id
    title
    description
    latitude
    longitude
    trustScore
    visibility
    creator {
      id
      username
    }
    community {
      id
      name
    }
  }
}
```

### 5.6 Event by ID
**Auth:** Ninguno
```graphql
query {
  eventById(id: 1) {
    id
    title
    description
    trustScore
    creator {
      username
    }
    rsvps {
      id
      response
      user {
        username
      }
    }
  }
}
```

### 5.7 Confirm Attendance (existing MVP)
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  confirmAttendance(userId: 1, eventId: 1) {
    success
    message
    totalPoints
    ticket {
      id
      status
    }
    participation {
      id
      pointsAwarded
    }
  }
}
```

---

## 💬 6. Matches & Chat (Feature 5)

### 6.1 Create Match
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  createMatch(user2Id: 2) {
    match {
      id
      user1 {
        username
      }
      user2 {
        username
      }
      createdAt
    }
    success
    message
  }
}
```

### 6.2 My Matches
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  myMatches {
    id
    user1 {
      id
      username
      photoUrl
    }
    user2 {
      id
      username
      photoUrl
    }
    createdAt
  }
}
```

### 6.3 Send Message
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  sendMessage(matchId: 1, content: "¡Hola! ¿Vamos al evento?") {
    message {
      id
      sender {
        username
      }
      content
      createdAt
      isRead
    }
    success
    messageField
  }
}
```

### 6.4 Get Messages by Match
**Auth:** `Authorization: JWT <token>`
```graphql
query {
  messagesByMatch(matchId: 1) {
    id
    sender {
      username
      photoUrl
    }
    content
    createdAt
    isRead
  }
}
```

---

## 🖼️ 7. Image Upload (Feature 6: AWS S3 Presigned URL)

### 7.1 Get Presigned URL
**Auth:** `Authorization: JWT <token>`
```graphql
mutation {
  presignedUrl(filename: "avatar.jpg", contentType: "image/jpeg") {
    url
    fields
    success
    message
  }
}
```

**Why Presigned URL?**
> The backend generates a **temporary, signed URL** from AWS S3. The frontend (React Native) uploads the image **directly to S3** using this URL, completely bypassing the Django server. This is the most scalable approach for mobile image uploads because:
> 1. Django server is never overloaded with large image file uploads
> 2. S3 handles all the bandwidth and storage
> 3. The frontend only uploads the image after receiving the presigned URL
> 4. The `fields` object contains the S3 form fields needed for the POST request

**Frontend usage (React Native / JavaScript):**
```javascript
const formData = new FormData();
Object.entries(presigned.fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' });

fetch(presigned.url, { method: 'POST', body: formData })
  .then(res => res.ok ? 'Uploaded!' : 'Failed')
```

---

## 📋 Legacy Endpoints (MVP)

### Tickets & Participations
```graphql
query {
  ticketsByUser(userId: 1) {
    id
    status
    event {
      id
      title
    }
  }
}

query {
  participationsByUser(userId: 1) {
    id
    pointsAwarded
    attendedAt
    event {
      title
    }
  }
}

query {
  allTickets {
    id
    user { username }
    event { title }
    status
  }
}
```

---

## 🛠️ Troubleshooting

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `Authentication required` | Header `Authorization` sin prefijo `JWT ` | Cambiar `eyJ...` → `JWT eyJ...` |
| `Cannot query field 'refreshToken'` | `tokenAuth` v0.3.x solo retorna `token` | Usar solo `token` en la query; usar `myProfile` para datos del usuario |
| `myProfile: null` | No se envió header `Authorization` | Agregar `Authorization: JWT <token>` |
| `Invalid or already used invitation code` | `createUser` ahora requiere código válido | Generar con `generateInvite` primero, o crear un código manual en admin |
| `No module named 'boto3'` | No está instalado en el contenedor | `pip install boto3` o agregar a requirements.txt |
| `relation "core_invitationcode" does not exist` | No se corrieron las migraciones | `makemigrations` + `migrate` |

---

## 🔐 Configuración de Variables de Entorno (AWS S3)

Agrega estas variables en tu `.env` o Docker Compose:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=havens-uploads
AWS_S3_REGION_NAME=us-east-1
```

---

## 📋 Lista Completa de Mutaciones (Schema)

```graphql
type Mutation {
  createUser(...)
  tokenAuth(username, password)
  verifyToken(token)
  refreshToken(token)
  updateUserProfile(bio, neighbourhood, photoUrl)
  createCommunity(name, subdomain)
  joinCommunity(communityId)
  createEvent(title, description, latitude, longitude, communityId, pointsReward, visibility)
  confirmAttendance(userId, eventId)
  swipeEvent(eventId, response)
  generateInvite
  sendFriendRequest(toUserId)
  respondFriendRequest(friendshipId, action)
  createMatch(user2Id)
  sendMessage(matchId, content)
  presignedUrl(filename, contentType)
}
```

## 📋 Lista Completa de Queries (Schema)

```graphql
type Query {
  hello
  myProfile
  allUsers
  userById(id)
  allCommunities
  communityById(id)
  communityBySubdomain(subdomain)
  myCommunities
  allEvents(latitude, longitude, radiusKm)
  eventById(id)
  eventsByCommunity(communityId)
  allTickets
  ticketsByUser(userId)
  allParticipations
  participationsByUser(userId)
  myInvitationCodes
  myFriends
  myFriendRequests
  pendingFriendRequests
  eventRsvps(eventId)
  myRsvps
  myMatches
  messagesByMatch(matchId)
  userProfileById(userId)
}
```
