## Why

There is no product yet — `educatr` is a greenfield repo. We need to stand up an AI-powered learning app where users explore any topic through conversation, and the system automatically distills those conversations into persistent, granular Topic lessons that can be reviewed, quizzed, and visualized. Bootstrapping the full vertical slice now lets us validate the core loop (chat → topic extraction → study artifacts) end-to-end before layering on polish.

## What Changes

- Establish a Bun-workspaces monorepo with `apps/web`, `apps/mobile`, and shared packages (`shared`, `db`, `ai`).
- Stand up the web application using TanStack Start, deployable to Vercel.
- Stand up a React Native mobile client using Expo, consuming the same server endpoints as web.
- Provision a Postgres database and introduce a typed data-access layer with migrations.
- Integrate OpenRouter as the sole AI provider behind a thin server-side abstraction (streaming-capable).
- Add a conversational UI where users chat with AI to explore any subject.
- Extract **Topics** (granular lessons) automatically from chat turns, with title, summary, and structured content.
- Deduplicate and group Topics: detect near-duplicates on creation and cluster related Topics into parent groups.
- Generate study artifacts on demand from a Topic: quizzes (multiple formats), flashcards, and visual explainers.
- Persist chats, messages, topics, topic groups, and generated artifacts in Postgres.

## Capabilities

### New Capabilities
- `platform-foundation`: Bun-workspaces monorepo layout, shared packages, TanStack Start web scaffold, Expo React Native mobile scaffold, Postgres schema + migrations, Vercel deployment config, environment/secrets, shared server utilities.
- `ai-gateway`: Server-side OpenRouter integration — model selection, streaming, structured-output helpers, retry/error handling.
- `topic-exploration`: Chat interface and server endpoints for open-ended AI conversations about any subject, with streamed responses and persisted history.
- `topic-extraction`: Pipeline that turns chat turns into Topic records (granular lessons) with structured fields.
- `topic-management`: CRUD, grouping, and deduplication of Topics — including similarity detection at creation and parent/child group relationships.
- `quiz-generation`: Generate and persist quizzes (multiple question formats) from a given Topic or Topic group.
- `flashcard-generation`: Generate and persist flashcard decks from a given Topic or Topic group.
- `visual-explainer`: Generate and persist visual explainers (diagrams/structured visuals) for a given Topic.

### Modified Capabilities
<!-- None — greenfield project. -->

## Impact

- **New repo scaffolding** (Bun workspaces):
  - `apps/web/` — TanStack Start routes + server functions.
  - `apps/mobile/` — Expo + React Native app.
  - `packages/shared/` — types, Zod schemas, isomorphic API client (used by both apps).
  - `packages/db/` — Drizzle schema, migrations, client (server-only).
  - `packages/ai/` — OpenRouter client + prompt modules (server-only).
- **New dependencies**: `@tanstack/react-start`, Drizzle ORM + `drizzle-kit`, Postgres driver, `openai` SDK (pointed at OpenRouter), `zod`, `pgvector`, Expo + React Native + Expo Router, an RN-compatible SSE consumer.
- **Infrastructure**: Vercel project (web), Expo dev tooling (mobile), Postgres instance (Neon or Vercel Postgres), env vars (`DATABASE_URL`, `OPENROUTER_API_KEY`, `EXPO_PUBLIC_API_URL`).
- **APIs**: New server endpoints in `apps/web` for chat streaming, topic CRUD, and artifact generation — consumed by both web and mobile clients via a shared API client.
- **No existing code impacted** — greenfield.
