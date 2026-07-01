# Aegis

Aegis is a Turbo monorepo for a NestJS authentication API backed by Prisma. The current implementation focuses on user registration, login, JWT-based access token issuance, refresh token rotation, and logout token revocation.

## What is in this repo?

### Apps

- apps/api: the main NestJS backend application
  - authentication endpoints for register, login, refresh, and logout
  - Prisma-based user persistence
  - JWT, refresh token, and password hashing utilities
  - unit and end-to-end tests

### Packages

- packages/eslint-config: shared ESLint rules for the monorepo
- packages/typescript-config: shared TypeScript configuration

## Repository structure

```text
apps/
  api/
    src/
      auth/
      prisma/
      users/
    test/
packages/
  eslint-config/
  typescript-config/
```

## Getting started

1. Install dependencies:

```bash
pnpm install
```

2. Start the local development database:

```bash
docker compose up -d postgres
```

The compose file starts Postgres on `localhost:5432` with:

- user: `aegis`
- password: `password`
- database: `aegis`

3. Configure environment variables for the API before starting it. Create `apps/api/.env` with:

```bash
DATABASE_URL="postgresql://aegis:password@localhost:5432/aegis"
JWT_SECRET="replace-me-with-a-local-secret"
PORT=3000
```

The API expects:

- DATABASE_URL
- JWT_SECRET
- PORT (optional)

4. Apply database migrations:

```bash
pnpm --filter api exec prisma migrate dev
```

5. Seed local development users:

```bash
pnpm --filter api db:seed
```

The seed creates or updates these development-only login users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@aegis.local` | `Admin123!` |
| Super admin | `super-admin@aegis.local` | `SuperAdmin123!` |

6. Start the API:

```bash
pnpm --filter api dev
```

## Available scripts

From the repository root:

```bash
pnpm build
pnpm lint
pnpm --filter api test
pnpm --filter api test:e2e
```

## API highlights

The backend currently provides:

- POST /auth/register to create a user and issue access and refresh tokens
- POST /auth/login to authenticate an existing user and issue access and refresh tokens
- POST /auth/refresh to rotate a refresh token and issue a new token pair
- POST /auth/logout to revoke a refresh token and return no content
- Prisma-backed user lookup and creation logic
- Prisma-backed refresh token persistence and revocation
- Validation and error handling for authentication flow

### Auth endpoints

#### POST /auth/register

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

#### POST /auth/login

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

#### POST /auth/refresh

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

The provided refresh token is revoked when it is rotated.

#### POST /auth/logout

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

Response: `204 No Content`

The provided refresh token is revoked and the response body is empty.

## Testing

The API includes both unit and end-to-end tests for the auth flow:

```bash
pnpm --filter api test
pnpm --filter api test:e2e
```

## Tech stack

- NestJS
- TypeScript
- Prisma
- JWT
- Argon2
- Turbo
- pnpm
