# Aegis

Aegis is a Turbo monorepo for a NestJS authentication API backed by Prisma and Postgres. The API supports registration, login, JWT access tokens, refresh token rotation, logout, authenticated user profile lookup, and role-gated admin user management.

## Repository Structure

```text
apps/
  api/
    prisma/
    src/
      auth/
      prisma/
      users/
    test/
packages/
  eslint-config/
  typescript-config/
```

## Requirements

- Node.js 18 or newer
- pnpm
- Docker, for the local Postgres service

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start local infrastructure:

```bash
docker compose up -d postgres
```

The compose file exposes Postgres on `localhost:5432`.

Create `apps/api/.env`:

```bash
DATABASE_URL="postgresql://aegis:password@localhost:5432/aegis"
JWT_SECRET="replace-me-with-a-local-secret"
PORT=3000
```

Apply migrations:

```bash
pnpm --filter api exec prisma migrate dev
```

Seed development users:

```bash
pnpm --filter api db:seed
```

The seed creates or updates these development-only login users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@aegis.local` | `Admin123!` |
| Super admin | `super-admin@aegis.local` | `SuperAdmin123!` |

Start the API:

```bash
pnpm --filter api dev
```

The API listens on `http://localhost:3000` unless `PORT` is set.

## Scripts

From the repository root:

```bash
pnpm build
pnpm lint
pnpm --filter api build
pnpm --filter api db:seed
pnpm --filter api test
pnpm --filter api test:e2e
```

## API Surface

### Health

#### `GET /`

Response: `200 OK`

```json
{
  "status": "OK"
}
```

### Auth

#### `POST /auth/register`

Creates a user with role `USER` and returns an access token and refresh token.

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: `201 Created`

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "refresh-token"
}
```

#### `POST /auth/login`

Authenticates an existing user and returns an access token and refresh token.

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: `200 OK`

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "refresh-token"
}
```

#### `POST /auth/refresh`

Rotates a refresh token. The old refresh token is revoked and a new token pair is returned.

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

Response: `200 OK`

```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-refresh-token"
}
```

#### `POST /auth/logout`

Revokes a refresh token.

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

Response: `204 No Content`

### Users

All user endpoints require a bearer access token.

#### `GET /users/me`

Returns the authenticated user's public profile.

Response: `200 OK`

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "role": "USER"
}
```

### Admin Users

All admin endpoints require a bearer access token. `ADMIN` and `SYSTEM_ADMIN` can read users. Only `SYSTEM_ADMIN` can create, update, or delete users. Route `:id` parameters must be UUIDs.

#### `GET /admin/users`

Query parameters:

- `page`: optional integer, minimum `1`, default `1`
- `limit`: optional integer, `1` through `100`, default `10`
- `search`: optional email search string
- `role`: optional `USER`, `ADMIN`, or `SYSTEM_ADMIN`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "role": "USER",
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "itemCount": 1,
    "itemsPerPage": 10,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

#### `GET /admin/users/:id`

Response: `200 OK`

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "USER",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

#### `POST /admin/users`

Requires `SYSTEM_ADMIN`.
Returns `409 Conflict` when the email is already in use.

Request:

```json
{
  "email": "admin-created@example.com",
  "password_hash": "already-hashed-password",
  "role": "ADMIN"
}
```

Response: `201 Created`

```json
{
  "id": "user-id",
  "email": "admin-created@example.com",
  "role": "ADMIN",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

#### `PATCH /admin/users/:id`

Requires `SYSTEM_ADMIN`.
Returns `409 Conflict` when the request attempts to change the user to an email that is already in use.

Request:

```json
{
  "email": "updated@example.com",
  "role": "ADMIN"
}
```

Response: `200 OK`

```json
{
  "id": "user-id",
  "email": "updated@example.com",
  "role": "ADMIN",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

#### `DELETE /admin/users/:id`

Requires `SYSTEM_ADMIN`.

Response: `200 OK`

```json
{
  "id": "user-id",
  "email": "updated@example.com",
  "role": "ADMIN",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

## Testing

Run unit tests:

```bash
pnpm --filter api test
```

Run end-to-end tests:

```bash
pnpm --filter api test:e2e
```

Run type and build checks:

```bash
pnpm --filter api exec tsc --noEmit -p tsconfig.json
pnpm --filter api build
```

## Notes

- `password_hash` on admin create/update expects an already-hashed password value. Public registration accepts a plain `password` and hashes it before persistence.
- Seeded users are for local development only.
