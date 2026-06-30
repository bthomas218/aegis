# Aegis

Aegis is a Turbo monorepo for a NestJS authentication API backed by Prisma. The current implementation focuses on user registration, login, and JWT-based access token issuance.

## What is in this repo?

### Apps

- apps/api: the main NestJS backend application
  - authentication endpoints for register and login
  - Prisma-based user persistence
  - JWT and password hashing utilities
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

2. Configure environment variables for the API before starting it. The API expects values such as:

- DATABASE_URL
- JWT_SECRET
- PORT (optional)

3. Start the API:

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

- POST /auth/register to create a user and issue an access token
- POST /auth/login to authenticate an existing user and return a token
- Prisma-backed user lookup and creation logic
- Validation and error handling for authentication flow

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
