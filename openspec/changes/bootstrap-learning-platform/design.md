## Context

`educatr` is a greenfield repo. We are standing up an AI-driven learning tool where exploratory chat produces persistent, granular **Topics** — each a reviewable lesson — and those Topics fuel downstream study artifacts (quizzes, flashcards, visual explainers). The stack is fixed by product direction: **Bun** as runtime/package manager, **TanStack Start** (React meta-framework) deployed to **Vercel** for web, **Expo + React Native** for mobile, **Postgres** for persistence, and **OpenRouter** as the sole AI provider. Because the system is a vertical slice touching two client UIs, server routes, AI orchestration, persistence, and a novel dedup/grouping pipeline, upfront technical decisions reduce churn during implementation.

## Goals / Non-Goals

**Goals:**
- A working end-to-end loop on web: chat → topic extraction → persisted Topic → on-demand quiz / flashcards / visual explainer.
- A React Native (Expo) mobile client that consumes the same server endpoints and delivers the same core loop.
- A single OpenRouter-backed AI abstraction that supports streaming chat, structured JSON output, and embeddings.
- Automatic Topic deduplication (semantic, not just exact-match) and hierarchical grouping.
- Deployable to Vercel with Postgres migrations runnable locally and in CI.
- Type-safe data access end-to-end (TS types from schema → server → both clients), via a shared workspace package.
- Bun workspaces as the monorepo substrate, with clean client/server import boundaries.

**Non-Goals:**
- User authentication and multi-tenant account management (single-user MVP is acceptable; auth can follow).
- Collaboration features (shared topics, comments, sharing links).
- App-store submission and EAS production builds in this change (Expo dev/preview builds only).
- Spaced-repetition scheduling logic for flashcards (generation only; scheduling is a later change).
- Rich WYSIWYG authoring of topics — they are AI-generated and lightly editable.
- Offline support / PWA.

## Decisions

### 1. Monorepo layout: Bun workspaces
Two clients (web + mobile) share types, Zod schemas, and an API client, so we use **Bun workspaces** as a light monorepo. Layout:

```
apps/
  web/        # TanStack Start → Vercel
  mobile/     # Expo + React Native
packages/
  shared/     # types, Zod schemas, API client (isomorphic — no Node/server imports)
  db/         # Drizzle schema + client (server-only; imported only by apps/web server code)
  ai/         # OpenRouter gateway (server-only; imported only by apps/web server code)
```

**Rules**:
- `packages/shared` MUST be safe to import from both React Native and browser contexts. No Node builtins, no `fs`, no server SDKs.
- `packages/db` and `packages/ai` are server-only and MUST NOT be imported by `apps/mobile` or by client bundles of `apps/web`.
- `apps/mobile` communicates with `apps/web`'s server endpoints over HTTPS using the client from `packages/shared`.

**Why Bun workspaces over pnpm/turbo**: we already standardized on Bun; workspaces are native, fast, and zero-config. We can adopt Turborepo later if build caching becomes a bottleneck.

### 2. Web framework: TanStack Start (fixed)
TanStack Start provides file-based routing, server functions, and streaming SSR. On Vercel it runs as Node serverless functions. **Why**: user-specified; gives us colocated server/client code and first-class streaming for AI responses. **Alternative considered**: Next.js App Router (rejected — not requested; TanStack Start's server-function model is cleaner for this app shape).

### 1b. Mobile framework: Expo + React Native
Expo is the default for new React Native apps — it gives us a batteries-included dev workflow, Expo Router (file-based routing that mirrors TanStack/Next patterns), EAS for builds, and OTA updates. **Why Expo over bare RN CLI**: faster iteration, no native tooling gymnastics for MVP features. **Trade-off**: if we later need a native module Expo doesn't support, we drop to a prebuild/bare workflow — acceptable risk for this app's feature set (all mobile features are network/UI; no exotic native needs identified).

### 2. Database: Postgres + Drizzle ORM + pgvector
Drizzle for schema + migrations + typed queries. `pgvector` extension for embedding similarity used in dedup and grouping. **Why**: Drizzle keeps types close to SQL without runtime ORM overhead; `pgvector` lets dedup live inside a single query. **Alternatives**: Prisma (heavier, generator step awkward on Vercel), raw SQL (loses TS inference ergonomics). **Hosting**: Neon or Vercel Postgres — both support pgvector. Decide at deploy time.

### 3. AI provider abstraction: OpenAI-compatible SDK → OpenRouter
Use `openai` npm SDK configured with `baseURL: https://openrouter.ai/api/v1` and `OPENROUTER_API_KEY`. Wrap in an internal `ai/` module exposing:
- `chat.stream({ messages, model })` — streaming chat completions.
- `extract<T>({ messages, schema, model })` — structured output via JSON-schema / Zod-validated JSON mode.
- `embed({ input, model })` — embeddings for dedup.
**Why**: OpenRouter is OpenAI-compatible, so the widely used SDK works as-is; the wrapper isolates model choice (different models for chat vs extraction vs embeddings) and enables easy test doubles. **Alternative**: Vercel AI SDK — viable, but adds another abstraction on top of the OpenAI client and couples framework-specific helpers to server logic.

### 4. Chat streaming transport: Server-Sent Events via TanStack Start server route
A server route reads the OpenRouter stream and re-emits SSE chunks to the browser; the web client consumes with `EventSource` or `fetch` + reader. For the **React Native client**, `EventSource` is not available natively — we use `fetch` with a streaming reader (`react-native-sse` or `expo/fetch` streaming) to consume the same SSE endpoint. **Why SSE over WebSockets**: simpler, works on Vercel serverless, matches OpenAI streaming semantics 1:1, and both clients can consume it with modest shims. **Trade-off**: serverless function max duration on Vercel (~60s Hobby, longer on Pro) caps chat length — acceptable for MVP.

### 5. Topic extraction: post-turn structured extraction
After each assistant response, a background-style server call runs a structured-extraction prompt over the latest user+assistant pair (plus short prior context) and returns zero-or-more candidate Topics as JSON: `{ title, summary, body_markdown, tags[] }`. **Why**: extracting continuously (per turn) gives granular lessons rather than one mega-topic per chat; JSON mode guarantees parseable output. **Alternative**: extract at chat end (rejected — loses granularity, delays value). Extraction runs sequentially after streaming completes to keep UX snappy.

### 6. Dedup & grouping: two-tier (lexical + embedding)
On Topic creation:
1. **Lexical pre-check**: normalize title → slug; if exact match exists in same user scope, merge (return existing Topic id).
2. **Semantic check**: compute embedding of `title + summary`; query pgvector for nearest neighbors within cosine distance `< 0.15`; if a match exists, treat as duplicate and merge/link.
3. **Grouping**: Topics further away (cosine `0.15–0.35`) become **related** and may be clustered into a parent `TopicGroup`. Grouping is computed lazily (on demand / batch) rather than on every insert to control cost.

Merging strategy: when a duplicate is detected, we keep the older Topic, append any materially new content as an additional "note" revision, and point the new chat message at the existing Topic.

**Why two-tier**: lexical catches trivial duplicates cheaply; embeddings catch phrasing variants. Thresholds are tunable knobs; start conservative (high bar to merge) to avoid collapsing distinct lessons.

### 7. Artifact generation (quiz / flashcards / visual explainer)
Each generator is a server function:
- `generateQuiz(topicId, options)` — returns JSON quiz (multiple-choice, true/false, short-answer), persisted to `quizzes` + `quiz_questions` tables.
- `generateFlashcards(topicId, options)` — returns JSON array, persisted to `flashcard_decks` + `flashcards`.
- `generateVisualExplainer(topicId)` — returns a structured visual description (Mermaid diagram source + narrative), persisted to `visual_explainers`. **Why Mermaid over image-gen**: text-based, renderable client-side, deterministic, fits in a DB row; image generation is out of scope for MVP.

All three use `extract<T>` (structured JSON output) with capability-specific Zod schemas.

### 8. Data model (high-level)
- `chats` (id, title, created_at)
- `messages` (id, chat_id, role, content, created_at)
- `topics` (id, title, slug, summary, body_markdown, embedding vector(1536), group_id?, created_at, updated_at)
- `topic_groups` (id, title, summary, created_at)
- `topic_sources` (topic_id, message_id) — many-to-many: which chat messages produced/updated a Topic.
- `quizzes` + `quiz_questions`
- `flashcard_decks` + `flashcards`
- `visual_explainers` (topic_id, diagram_source, narrative_markdown)

### 9. Deployment
**Web**: Vercel project deploying `apps/web`, with `vercel.json` if needed. Env vars: `DATABASE_URL`, `OPENROUTER_API_KEY`. Migrations run via a `drizzle-kit` script invoked manually (or in a CI/CD step) — **not** auto-run per request.

**Mobile**: Expo dev server for local development; Expo Go or development builds for on-device testing. EAS builds and store submission are out of scope for this change. The mobile app targets a configurable `EXPO_PUBLIC_API_URL` pointing at the deployed web app.

### 10. Cross-client API contract
`packages/shared` exposes a single typed `apiClient` used by both web (client components) and mobile. It wraps `fetch`, handles SSE streaming for chat, and surfaces typed responses derived from Zod schemas colocated in `packages/shared`. Server functions in `apps/web` import the same Zod schemas to validate inputs and shape outputs — one source of truth for request/response contracts.

## Risks / Trade-offs

- **Client/server boundary leaks** → A careless import from `packages/db` or `packages/ai` into `apps/mobile` or a client bundle would ship server code (and potentially secrets) to users. Mitigation: enforce via package `exports` and a lint rule / dependency-cruiser check in CI.
- **RN SSE gap** → React Native lacks a native `EventSource`. Mitigation: use a vetted SSE polyfill (e.g. `react-native-sse`) or `expo/fetch` streaming; encapsulate streaming in `packages/shared` so callers don't care.
- **Vercel function timeouts** → Long chat turns may be cut off. Mitigation: stream early tokens, keep extraction short, consider Vercel Pro for longer limits if needed.
- **Embedding cost drift** → Per-Topic embedding adds per-insert AI cost. Mitigation: cache by normalized content hash; only re-embed on material edits.
- **Aggressive dedup collapses distinct topics** → Start with conservative threshold (0.15) and expose merge/unmerge UI later if needed.
- **OpenRouter rate/model availability** → Provider outages cascade. Mitigation: wrap calls with retry + model fallback list; surface clear error states in UI.
- **No auth in MVP** → Treating all data as single-tenant is fine locally, risky in production. Mitigation: include a `user_id` column on all rows from day one so auth can be bolted on without a migration headache.
- **Schema churn** → Early schema will change. Mitigation: small, additive migrations; keep destructive changes behind explicit tasks.

## Migration Plan

Not applicable — greenfield. First-time deploy steps:
1. Provision Postgres (Neon/Vercel Postgres), enable `pgvector`.
2. Set `DATABASE_URL` and `OPENROUTER_API_KEY` in Vercel + local `.env`.
3. Run initial `drizzle-kit migrate`.
4. Deploy TanStack Start app to Vercel.

Rollback: revert deployment; migrations are additive so no data rollback needed at this stage.

## Open Questions

- Which Postgres host — Neon vs Vercel Postgres? (Defer to deploy time.)
- Which embedding model — OpenAI `text-embedding-3-small` via OpenRouter, or a cheaper alternative? (Pick during AI-gateway task.)
- Should we include a minimal anonymous-user concept now (cookie-scoped `user_id`) or truly single-tenant? Recommend cookie-scoped placeholder.
- Target models per task (chat, extraction, embeddings) — leave configurable via env.
