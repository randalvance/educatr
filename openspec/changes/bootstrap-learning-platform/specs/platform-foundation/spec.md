## ADDED Requirements

### Requirement: Bun workspaces monorepo
The repository SHALL be organized as a Bun-workspaces monorepo with `apps/web`, `apps/mobile`, and shared packages under `packages/`.

#### Scenario: Workspace install succeeds
- **WHEN** a developer runs `bun install` at the repo root
- **THEN** all workspace packages are resolved and linked without error

#### Scenario: Server packages are not importable by mobile or client bundles
- **WHEN** `packages/db` or `packages/ai` is imported from `apps/mobile` or a client-bundled module in `apps/web`
- **THEN** the build or lint step SHALL fail, preventing server code from leaking into client bundles

### Requirement: Shared package is isomorphic
The `packages/shared` package SHALL be safe to import from both React Native and browser contexts and MUST NOT depend on Node built-ins or server-only SDKs.

#### Scenario: Shared import from mobile app
- **WHEN** `apps/mobile` imports types, Zod schemas, or the API client from `packages/shared`
- **THEN** the mobile build succeeds without polyfills for Node modules

### Requirement: Web application scaffold
The web app SHALL be built on TanStack Start with file-based routing and server functions, configured to deploy to Vercel.

#### Scenario: Local web dev server starts
- **WHEN** a developer runs the web dev script from the repo root
- **THEN** a TanStack Start dev server boots, serves the root route, and supports hot module reload

#### Scenario: Production deployment to Vercel
- **WHEN** the `main` branch is deployed to Vercel
- **THEN** `apps/web` builds successfully, routes render, and server functions respond

### Requirement: Mobile application scaffold
The mobile app SHALL be built on Expo + React Native with file-based routing (Expo Router) and configured to run in Expo Go or a development build.

#### Scenario: Local mobile dev server starts
- **WHEN** a developer runs the mobile dev script from the repo root
- **THEN** the Expo dev server starts and the app loads on a simulator or physical device

#### Scenario: Mobile app targets the web API
- **WHEN** the mobile app makes any network call
- **THEN** the target base URL is read from `EXPO_PUBLIC_API_URL` and MUST NOT be hardcoded

### Requirement: Postgres persistence layer
The system SHALL use Postgres with the `pgvector` extension as its primary datastore, accessed through a typed schema and a migration tool.

#### Scenario: Fresh database initialization
- **WHEN** migrations are run against an empty Postgres database
- **THEN** all required tables and the `pgvector` extension are created without error

#### Scenario: Missing database configuration
- **WHEN** the server starts without `DATABASE_URL` configured
- **THEN** the server SHALL fail fast at startup with a clear error identifying the missing variable

### Requirement: Environment and secrets management
The system SHALL read configuration from environment variables and MUST NOT hardcode secrets or endpoints.

#### Scenario: Required environment variables are documented
- **WHEN** a developer inspects the repo
- **THEN** an `.env.example` or equivalent lists every required variable including `DATABASE_URL`, `OPENROUTER_API_KEY`, and `EXPO_PUBLIC_API_URL`

#### Scenario: Secrets never appear in committed code
- **WHEN** the repo is scanned
- **THEN** no API keys, connection strings, or credentials are present in source files

### Requirement: Shared user scoping column
Every user-owned table SHALL include a `user_id` column from inception, even before authentication is implemented, to avoid a later breaking migration.

#### Scenario: New user-owned table is added
- **WHEN** a migration creates a table that stores user-generated content (chats, topics, quizzes, etc.)
- **THEN** that table includes a non-nullable `user_id` column

#### Scenario: MVP single-user operation
- **WHEN** authentication is not yet implemented
- **THEN** a stable placeholder `user_id` (e.g. cookie-scoped) is used consistently for all rows created in a browser session
