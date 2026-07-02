# Havens API — Postman Collection Reference (v0.3.x)

> **URL base:** `POST http://localhost:8000/graphql/`
> **Headers obligatorios en TODAS las requests:**
> ```
> Content-Type: application/json
> ```
> **Headers solo para endpoints autenticados:**
> ```
> Authorization: JWT <tu-token-aqui>
> ```
> ⚠️ **Siempre usa el prefijo `JWT ` antes del token.**

> **Nota sobre versión:** Esta API usa `django-graphql-jwt 0.3.x`. Las queries están adaptadas a esta versión.

---

## 1. 🔐 Token Login (Obtener JWT)

**Auth:** Ninguno (público)

```graphql
mutation {
  tokenAuth(username: "havens_tester", password: "SuperSecret123!") {
    token
  }
}
```

**Respuesta esperada:**
```json
{
  "data": {
    "tokenAuth": {
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

> **⚠️ Importante:** En v0.3.x, `tokenAuth` solo retorna `token`. Para obtener los datos del usuario, usa el endpoint **#2 My Profile** inmediatamente después con el token en el header.

---

## 2. 👤 My Profile (Con totalPoints)

**Auth:** `Authorization: JWT <token>` ← **Usa el token obtenido en #1**

```graphql
query {
  myProfile {
    id
    username
    email
    totalPoints
  }
}
```

> **Flujo recomendado en frontend:**
> 1. Llamar `tokenAuth` → obtener `token`
> 2. Guardar `token` en AsyncStorage/LocalStorage
> 3. Llamar `myProfile` con `Authorization: JWT <token>` → obtener datos del usuario

---

## 3. 📝 Create User (Registro)

**Auth:** Ninguno (público)

```graphql
mutation {
  createUser(username: "nuevo_user", email: "nuevo@havens.app", password: "Password123!") {
    success
    message
    user {
      id
      username
      email
    }
  }
}
```

---

## 4. 🏘️ Community Count / List

**Auth:** Ninguno (público)

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

## 5. ➕ Community Creation

**Auth:** Ninguno (público) *(o restringe con `@superuser_required` si prefieres)*

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

---

## 6. 📍 Event Creation (Autenticado)

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
      latitude
      longitude
      pointsReward
    }
  }
}
```

> **Si ves "Authentication required":** Verifica que tu header sea exactamente `Authorization: JWT eyJhbG...` (con el prefijo `JWT ` y un espacio).

---

## 7. 🗺️ Event Info (Mapa — con filtro geoespacial)

**Auth:** Ninguno (público)

```graphql
query {
  allEvents(latitude: 4.7110, longitude: -74.0721, radiusKm: 10.0) {
    id
    title
    description
    latitude
    longitude
    pointsReward
    scheduledDate
    community {
      id
      name
    }
    creator {
      id
      username
    }
  }
}
```

> **Para ver TODOS los eventos** (sin filtro geoespacial), omite `latitude`, `longitude` y `radiusKm`.

---

## 8. ✅ Event Confirmation (Asistencia + Puntos)

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

> **Nota:** A futuro, `userId` debería tomarse de `info.context.user` (como `createEvent`) para evitar que un usuario confirme asistencia por otro. Pero por ahora, funciona con el argumento explícito.

---

## 9. 🔒 Verify Token

**Auth:** Ninguno (público)

```graphql
mutation {
  verifyToken(token: "eyJhbGciOiJIUzI1NiIs...") {
    payload
  }
}
```

---

## 10. 🔄 Refresh Token

**Auth:** Ninguno (público)

> **⚠️ En v0.3.x:** `refreshToken` recibe el **access token** (no un refresh token separado), y retorna un nuevo access token.

```graphql
mutation {
  refreshToken(token: "eyJhbGciOiJIUzI1NiIs...") {
    token
  }
}
```

**Respuesta esperada:**
```json
{
  "data": {
    "refreshToken": {
      "token": "eyJhbGciOiJIUzI1NiIs...nuevo-token..."
    }
  }
}
```

> **Nota:** Guarda el nuevo `token` y reemplázalo en todos los headers `Authorization: JWT ...` siguientes.

---

## 11. 📋 All Events (Sin filtro geoespacial)

**Auth:** Ninguno (público)

```graphql
query {
  allEvents {
    id
    title
    latitude
    longitude
    pointsReward
    community {
      id
      name
    }
  }
}
```

---

## 12. 🔍 Event by ID

**Auth:** Ninguno (público)

```graphql
query {
  eventById(id: 1) {
    id
    title
    description
    latitude
    longitude
    pointsReward
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

---

## 13. 🎟️ Tickets by User

**Auth:** `Authorization: JWT <token>` (recomendado)

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
```

---

## 14. 🏆 Participations by User

**Auth:** `Authorization: JWT <token>` (recomendado)

```graphql
query {
  participationsByUser(userId: 1) {
    id
    pointsAwarded
    attendedAt
    event {
      id
      title
    }
  }
}
```

---

## 15. 🏘️ Community by Subdomain

**Auth:** Ninguno (público)

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

---

## 16. 👥 All Users (Admin/Superuser)

**Auth:** `Authorization: JWT <token>` (recomendado restringir con `@superuser_required`)

```graphql
query {
  allUsers {
    id
    username
    email
    totalPoints
  }
}
```

---

## 17. ℹ️ API Health Check

**Auth:** Ninguno (público)

```graphql
query {
  hello
}
```

**Respuesta esperada:**
```json
{ "data": { "hello": "Havens API v1" } }
```

---

## 📋 Checklist de Headers en Postman

Para cada request, verifica:

| Header | Valor | ¿En qué requests? |
|--------|-------|-------------------|
| `Content-Type` | `application/json` | **TODAS** |
| `Authorization` | `JWT <token>` | Solo autenticadas (2, 6, 8, 13, 14, 16) |

### Configuración correcta en Postman:

1. Ve a la pestaña **Headers** de tu request
2. Agrega:
   - `Key:` `Content-Type` → `Value:` `application/json`
   - `Key:` `Authorization` → `Value:` `JWT eyJhbGciOiJIUzI1NiIs...` (tu token completo con el prefijo `JWT ` y un espacio)
3. En la pestaña **Body**, selecciona **GraphQL** y pega la query

---

## 🔄 Flujo de Autenticación Completo (v0.3.x)

Paso 1 — **Login** (sin header):
```graphql
mutation {
  tokenAuth(username: "havens_tester", password: "SuperSecret123!") {
    token
  }
}
```

Paso 2 — **Guardar token** en variable de Postman / environment:
- Postman: `pm.environment.set("token", pm.response.json().data.tokenAuth.token);`

Paso 3 — **Obtener perfil** (con header `Authorization: JWT {{token}}`):
```graphql
query {
  myProfile {
    id
    username
    email
    totalPoints
  }
}
```

Paso 4 — **Usar token** en todas las requests autenticadas.

Paso 5 — **Refrescar token** cuando expire (con header opcional, o sin header):
```graphql
mutation {
  refreshToken(token: "{{token}}") {
    token
  }
}
```

---

## 🛠️ Troubleshooting Rápido

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `Authentication required` en `createEvent` | Header `Authorization` sin prefijo `JWT ` | Cambiar `eyJ...` → `JWT eyJ...` |
| `Cannot query field 'refreshToken'` en `tokenAuth` | `tokenAuth` v0.3.x solo retorna `token` | Usar solo `token` en la query; obtener `user` con `myProfile` después |
| `Cannot query field 'user'` en `tokenAuth` | `tokenAuth` v0.3.x no retorna `user` | Usar `myProfile` query después del login |
| `Unknown argument 'refreshToken'` en `refreshToken` | v0.3.x usa `token` como argumento, no `refreshToken` | Cambiar `refreshToken` → `token` en los argumentos |
| `myProfile: null` | No se envió header `Authorization` | Agregar `Authorization: JWT <token>` |

---

## ⚠️ Diferencias v0.3.x vs v0.4.x

| Feature | v0.3.x (tú tienes esta) | v0.4.x (no disponible en PyPI) |
|---------|--------------------------|--------------------------------|
| `tokenAuth` retorna | Solo `token` | `token`, `refreshToken`, `payload`, `user` |
| `refreshToken` recibe | `token` (access token) | `refreshToken` (refresh token separado) |
| `refreshToken` retorna | `token` (nuevo access token) | `token`, `refreshToken`, `payload` |
| Flujo de login | 2 requests: `tokenAuth` → `myProfile` | 1 request: `tokenAuth` retorna todo |
