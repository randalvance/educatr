## 1. Monorepo scaffolding (Bun workspaces)

- [x] 1.1 Initialize repo: root `package.json` with `"workspaces": ["apps/*", "packages/*"]`, Bun-pinned toolchain, `.gitignore`, `.nvmrc`/`.bun-version`
- [x] 1.2 Add shared tooling: TypeScript (base `tsconfig`), ESLint, Prettier, shared `tsconfig.base.json` extended by each workspace
- [x] 1.3 Create empty workspace packages: `packages/shared`, `packages/db`, `packages/ai` with `package.json` + `tsconfig.json`
- [x] 1.4 Add a dependency-boundary guard (dependency-cruiser or ESLint rule) preventing `packages/db` and `packages/ai` imports from `apps/mobile` and client-only modules in `apps/web`
- [x] 1.5 Root scripts: `bun run dev:web`, `bun run dev:mobile`, `bun run build`, `bun run typecheck`, `bun run lint`
- [x] 1.6 `.env.example` at root listing `DATABASE_URL`, `OPENROUTER_API_KEY`, `EXPO_PUBLIC_API_URL`; typed env loader in each app

## 2. Shared package (`packages/shared`)

- [ ] 2.1 Export Zod schemas for core entities: `Chat`, `Message`, `Topic`, `TopicGroup`, `Quiz`, `Flashcard`, `VisualExplainer`
- [ ] 2.2 Export derived TypeScript types from the Zod schemas
- [ ] 2.3 Implement isomorphic `apiClient` built on `fetch`, with typed request/response methods for every server endpoint
- [ ] 2.4 Implement SSE consumer helper usable in both web and React Native (wraps `fetch` streaming / RN SSE polyfill)
- [ ] 2.5 Verify the package has zero Node/server-only imports (build succeeds when bundled for RN)

## 3. Database package (`packages/db`)

- [ ] 3.1 Install Drizzle ORM + `drizzle-kit` + Postgres driver; create `client.ts` singleton
- [ ] 3.2 Create initial migration enabling the `pgvector` extension
- [ ] 3.3 Define schema: `chats`, `messages` (with `user_id` on all user-owned tables)
- [ ] 3.4 Define schema: `topics` (incl. `slug`, `embedding vector`, timestamps), `topic_groups`, `topic_sources`
- [ ] 3.5 Define schema: `quizzes`, `quiz_questions`, `flashcard_decks`, `flashcards`, `visual_explainers`
- [ ] 3.6 Generate and run migrations locally; verify schema matches expectations

## 4. AI gateway package (`packages/ai`)

- [ ] 4.1 Install `openai` SDK; configure client with OpenRouter base URL + API key
- [ ] 4.2 Implement `chat.stream({ messages, model })` exposing an async iterable of tokens
- [ ] 4.3 Implement `extract<T>` with Zod-validated structured JSON output and one retry on schema failure
- [ ] 4.4 Implement `embed` returning numeric vectors; expose dimensionality constant
- [ ] 4.5 Make chat/extraction/embedding models configurable via env vars with sensible defaults
- [ ] 4.6 Typed error classes (`AIConfigError`, `AIStreamError`, `AIValidationError`) and a retry helper

## 5. Web app scaffold (`apps/web`)

- [ ] 5.1 Install TanStack Start + React + Vite deps; add root route and a basic layout
- [ ] 5.2 Wire `apps/web` to consume `packages/shared`, `packages/db`, `packages/ai`
- [ ] 5.3 Cookie-scoped placeholder `user_id` helper for single-user MVP
- [ ] 5.4 Add Vercel deployment config; confirm it deploys as Node serverless functions
- [ ] 5.5 `/` route renders and proves end-to-end rendering works

## 6. Chat (topic-exploration) — web

- [ ] 6.1 Server functions: create-chat / list-chats / get-chat-with-messages (schemas from `packages/shared`)
- [ ] 6.2 Server route: SSE chat-stream endpoint — persist user message, call `ai/chat.stream`, forward tokens, persist assistant message on close
- [ ] 6.3 Auto-generate chat title after first exchange completes
- [ ] 6.4 Web UI: chat list sidebar + chat thread view with streaming token rendering
- [ ] 6.5 Handle interruption: cancel stream cleanly, persist partial assistant message
- [ ] 6.6 System prompt tuned for exploration (teacher persona, structured explanations)

## 7. Topic extraction pipeline

- [ ] 7.1 Zod schema for a Topic candidate (`title`, `summary`, `body_markdown`, `tags`) in `packages/shared`
- [ ] 7.2 Extractor server function that takes latest turn + short prior context and returns 0..N candidates
- [ ] 7.3 Run extractor after streamed response completes, non-blocking to UX
- [ ] 7.4 On extractor error or invalid output after retry, log and skip — never break the chat

## 8. Topic management + dedup

- [ ] 8.1 Title → slug normalization utility
- [ ] 8.2 Lexical dedup: on create, lookup by slug in user scope; merge if found
- [ ] 8.3 Compute embedding for `title + summary` via `packages/ai`; store on row
- [ ] 8.4 pgvector nearest-neighbor query with configurable duplicate threshold (default 0.15)
- [ ] 8.5 Merge flow: link source message to existing Topic; append new body as a revision/note
- [ ] 8.6 CRUD server functions: list / get / update / delete Topic
- [ ] 8.7 Web Topic detail page: title, summary, body, tags, sources, linked artifacts
- [ ] 8.8 Grouping routine: cluster Topics within related threshold (0.15–0.35); write `topic_groups` + link members
- [ ] 8.9 Web Topic group page: list members with summaries; "generate for group" actions

## 9. Quiz generation

- [ ] 9.1 Zod schemas for quiz + question types (MCQ, T/F, short-answer) in `packages/shared`
- [ ] 9.2 `generateQuiz(topicId | groupId, options)` server function using `ai/extract`
- [ ] 9.3 Persist quiz + questions; link to source Topic or TopicGroup
- [ ] 9.4 Web UI: "Generate quiz" action on Topic and Group pages
- [ ] 9.5 Web UI: quiz-taking flow with per-question feedback and overall score
- [ ] 9.6 Web UI: list of prior quizzes on a Topic / Group

## 10. Flashcard generation

- [ ] 10.1 Zod schemas for flashcard deck + card (front, back, optional hint) in `packages/shared`
- [ ] 10.2 `generateFlashcards(topicId | groupId, options)` server function
- [ ] 10.3 Persist deck + cards; link to source Topic or TopicGroup
- [ ] 10.4 Web UI: "Generate flashcards" action on Topic and Group pages
- [ ] 10.5 Web UI: flip-through study session (forward/back, position indicator)
- [ ] 10.6 Web UI: list of prior decks on a Topic / Group

## 11. Visual explainer

- [ ] 11.1 Zod schema for visual explainer (Mermaid source + narrative markdown) in `packages/shared`
- [ ] 11.2 `generateVisualExplainer(topicId)` server function
- [ ] 11.3 Validate Mermaid source parses; retry generation once on parse failure
- [ ] 11.4 Persist explainer; link to source Topic; keep prior versions on regenerate
- [ ] 11.5 Web UI: Mermaid renderer component; diagram + narrative view
- [ ] 11.6 Web UI: "Generate" and "Regenerate" actions on Topic; list of versions

## 12. Web deployment

- [ ] 12.1 Provision Postgres (Neon or Vercel Postgres), enable `pgvector`
- [ ] 12.2 Configure Vercel env vars (`DATABASE_URL`, `OPENROUTER_API_KEY`, model overrides)
- [ ] 12.3 Migration-run script; document manual run before deploy
- [ ] 12.4 Smoke-test the full loop on the deployed web app: chat → Topic created → quiz/flashcards/explainer generated

## 13. Mobile app scaffold (`apps/mobile`)

- [ ] 13.1 Initialize Expo app with Expo Router and TypeScript template
- [ ] 13.2 Configure Expo to consume `packages/shared`; verify no Node-only imports leak in
- [ ] 13.3 Set up `EXPO_PUBLIC_API_URL`; wire `apiClient` from `packages/shared` with that base URL
- [ ] 13.4 Install an RN-compatible SSE consumer (`react-native-sse` or `expo/fetch` streaming) and confirm the shared SSE helper works on device
- [ ] 13.5 Shared auth stub: reuse the cookie-scoped `user_id` pattern, or pass a device-stored id header accepted by the web server
- [ ] 13.6 Root layout, navigation structure (chats list / chat detail / topics / topic detail)
- [ ] 13.7 Smoke-test: app launches on iOS simulator and Android emulator, fetches chats from deployed web API

## 14. Mobile feature parity (core loop)

- [ ] 14.1 Chats list screen + new-chat flow
- [ ] 14.2 Chat thread screen with streaming token rendering via the shared SSE helper
- [ ] 14.3 Topics list screen + Topic detail screen (title, summary, body, sources)
- [ ] 14.4 "Generate quiz" / "Generate flashcards" / "Generate visual explainer" actions calling the shared `apiClient`
- [ ] 14.5 Quiz-taking screen, flashcard study screen, visual-explainer screen (Mermaid rendering via an RN-compatible renderer or WebView)
- [ ] 14.6 On-device smoke-test of the full loop against the deployed web API

## 15. Documentation

- [ ] 15.1 Root README: monorepo layout, Bun install, dev scripts, env vars
- [ ] 15.2 `apps/web` README: deploy to Vercel, migration workflow
- [ ] 15.3 `apps/mobile` README: Expo dev workflow, pointing the app at a deployed API, device testing
