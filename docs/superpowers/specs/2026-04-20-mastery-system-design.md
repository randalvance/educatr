# Mastery System — Design Spec

**Status:** Draft
**Date:** 2026-04-20
**Author:** Randal + brainstorming session

## 1. Problem

Educatr extracts lesson-like "topics" from chat and generates quizzes on demand, but nothing about the learner is remembered. Quiz answers are graded client-side and discarded. There is no signal that tells the learner what they know, no queue that tells them what to study, and no adaptive behavior in question generation.

This spec establishes a mastery system that:

1. Persists every question response.
2. Tracks per-question spaced repetition state (SM-2).
3. Computes a per-topic mastery score and displays it.
4. Generates new practice questions dynamically — rewarding correct answers by replacing them with fresh content on the same topic.
5. Powers a "Due today" cross-topic review queue and a custom multi-topic practice mode.

## 2. Goals & Non-Goals

### Goals

- Learners can open the app and get a 15-question practice session tuned to what they need to review.
- Questions a learner answers correctly twice in a row retire from active rotation and enter spaced review.
- Questions answered wrong recur inside the same session and, if retired, lapse back into active rotation.
- Topic mastery is displayed as a radial progress indicator (0–100) with four qualitative labels.
- Generation is dynamic: correct answers spawn fresh questions so practice never repeats the same content indefinitely.
- Mastery state biases which topics contribute to the Due queue.

### Non-Goals (v1)

- **Flashcards.** The `flashcards` table stays; it is not wired into mastery.
- **Self-rating (Again / Hard / Good / Easy).** We use binary correct/wrong.
- **Study dashboard / analytics.** Per-topic radial and session summary only.
- **Streak / gamification mechanics.** Deliberately omitted.
- **Topic-group mastery.** Groups remain as clustering for future features, but the v1 mastery unit is a topic.
- **Backwards-compatible migration of existing quizzes.** The app is pre-launch; the legacy `quizzes` / `quiz_questions` tables are dropped.

## 3. Mental Model

A **topic** owns a pool of **questions**. Each question moves through three states:

```
active   → retired   → due (→ back to active on lapse)
```

- **Active:** question is eligible for the current practice pool. Moves to `retired` after 2 correct answers in a row.
- **Retired:** question is out of active rotation. SM-2 sets a future `due_at`.
- **Due:** when `due_at ≤ now`, the question is eligible for surfacing in Due queue as a spot-check. Correct → grows interval; wrong → lapse back to `active` (streak reset, `ease` penalized).

A **practice session** is the surface through which the learner interacts with questions. Sessions have a bounded 15-question queue drawn from one of two modes: `due_today` (cross-topic) or `custom` (selected topic IDs).

**Mastery per topic** is a composite of *breadth* (how many questions you've retired, capped) and *recency* (accuracy on the last 20 first-try responses).

## 4. Data Model

### 4.1 New tables

**Note on `user_id` typing:** all `user_id` columns below are `text` to match the existing convention in `topics.user_id` and `chats.user_id`. Confirm during planning that this matches the identity column type emitted by auth.

**Note on index syntax:** `INDEX` declarations are shown inline for readability. In Drizzle / Postgres migrations, they're emitted as separate `CREATE INDEX` statements.

```sql
-- Questions live directly on topics. SM-2 state is inline.
CREATE TABLE questions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id         uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  data             jsonb NOT NULL,              -- QuizQuestion shape (MCQ | T/F | SA)
  source           text NOT NULL CHECK (source IN ('extracted','batch_on_start','generated_on_correct')),
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- SM-2 state
  ease             real NOT NULL DEFAULT 2.5,
  interval_days    real NOT NULL DEFAULT 0,
  due_at           timestamptz,                 -- NULL until first retirement
  reps             int  NOT NULL DEFAULT 0,
  lapses           int  NOT NULL DEFAULT 0,
  correct_streak   int  NOT NULL DEFAULT 0,     -- for 2-in-a-row retirement
  retired_at       timestamptz,                 -- NULL = active in pool
  INDEX ix_questions_topic       (topic_id),
  INDEX ix_questions_due         (due_at) WHERE retired_at IS NOT NULL,
  INDEX ix_questions_active      (topic_id) WHERE retired_at IS NULL
);

CREATE TABLE practice_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  mode            text NOT NULL CHECK (mode IN ('due_today','custom')),
  topic_ids       uuid[],                         -- populated for `custom`; NULL for `due_today`
  queue_ids       uuid[] NOT NULL,                -- immutable original queue snapshot at start
  remaining_queue uuid[] NOT NULL,                -- mutable live queue; head = next question
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,                    -- NULL while open
  INDEX ix_sessions_user (user_id, started_at DESC)
);

CREATE TABLE question_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id       text NOT NULL,
  answer        jsonb NOT NULL,
  is_correct    bool  NOT NULL,
  first_try     bool  NOT NULL,                  -- was this the first response on this question this session?
  responded_at  timestamptz NOT NULL DEFAULT now(),
  INDEX ix_responses_question (question_id, responded_at DESC),
  INDEX ix_responses_user_topic_recency (user_id, responded_at DESC)
);

-- Per-(user, topic) mastery cache. Write-through on every response.
CREATE TABLE topic_mastery (
  user_id        text NOT NULL,
  topic_id       uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score          real NOT NULL DEFAULT 0,
  coverage       real NOT NULL DEFAULT 0,
  accuracy       real NOT NULL DEFAULT 0,
  retired_count  int  NOT NULL DEFAULT 0,
  pool_count     int  NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);
```

### 4.2 Dropped tables

- `quizzes`
- `quiz_questions`

Corresponding routes, components, and server functions removed in the same change:

- `apps/web/src/routes/quizzes.$quizId.tsx`
- `apps/web/src/components/quiz-panel.tsx`
- server functions: `listQuizzesFn`, `createQuizFn`, and related

### 4.3 Invariants

- `correct_streak` is never incremented on a question with `retired_at IS NOT NULL`. Retired questions transition via the SM-2 path only.
- `topic_mastery.score = coverage × accuracy` is maintained by the write path; no trigger-level enforcement (deliberate — one authoritative writer).
- A question is in exactly one state: `retired_at IS NULL` (**active**) or `retired_at IS NOT NULL AND due_at > now()` (**retired**) or `retired_at IS NOT NULL AND due_at ≤ now()` (**due**).

## 5. The Practice Engine

### 5.1 Queue construction — `due_today` mode

```
Budget: 15 slots.

1. SRS-due fill
   Pull all questions where retired_at IS NOT NULL AND due_at ≤ now(),
   across the user's topics. Oldest due_at first. Up to 15 slots.

2. In-progress fill (if slots remain)
   Pull active questions (retired_at IS NULL) from topics the user has
   touched in the last 7 days. Sample topics with weight (1 - topic.mastery).
   Within a topic, prefer questions with lowest correct_streak.

3. Net-new reservation (~15% = ~2 slots)
   Reserve up to 2 slots for questions from topics the user has never practiced.
   If no such topics exist, re-allocate the reserved slots to in-progress fill.

4. Clustering
   Group the final 15 into runs of 2–3 questions from the same topic, ordered
   randomly across topics. Avoids both single-question context thrash and
   large monotonous blocks.
```

### 5.2 Queue construction — `custom` mode

Same algorithm, but filtered to `topic_ids` up front. No net-new reservation (the user's selection defines scope). Single-topic practice is the special case of `topic_ids = [one id]`.

### 5.3 Session lifecycle

```
POST /api/practice/start { mode, topic_ids? }
  1. Build the 15-item queue (IDs only).
  2. For each topic contributing to the queue, count active questions.
     If count < 3, batch-generate enough to reach 5.
     Parallel AI calls, one per topic, with a 15s per-call timeout.
     Topics whose generation fails or times out contribute fewer questions;
     queue may shrink.
  3. If final queue < 5 questions → return 500 with actionable message;
     do not persist the session row.
  4. Create practice_sessions row with queue_ids snapshot.
  5. Return { session_id, queue: [question_id, ...] }.

POST /api/practice/respond { session_id, question_id, answer }
  1. Validate session is open (ended_at IS NULL).
  2. Grade: compute is_correct by question type.
     Determine first_try: false if any prior response for this
     (question_id, session_id) exists; true otherwise.
  3. Insert question_responses row.
  4. Update question SRS state (see 5.4).
  5. Upsert topic_mastery for (user, topic).
  6. If is_correct AND topic's active-pool count < 3, fire-and-forget
     generation of one new question (source='generated_on_correct').
  7. Return { is_correct, explanation, queue_remaining, mastery: {...} }.

POST /api/practice/end { session_id }
  1. Set practice_sessions.ended_at.
  2. Return summary: { correct_count, total, topics_touched,
                       mastery_deltas: [{topic_id, before, after}] }.
```

### 5.4 Question state transitions

```
// Inside /respond handler:

if is_correct:
  if retired_at IS NULL:                                 // ACTIVE → ...
    correct_streak += 1
    if correct_streak >= 2:
      retired_at   := now()
      ease         := 2.5
      interval_days := 1
      due_at        := now() + INTERVAL '1 day'
      reps          := 1
  else:                                                  // DUE → retire with new interval
    interval_days := interval_days * ease
    ease          := clamp(ease + 0.1, 1.3, infinity)
    due_at        := now() + interval_days days
    reps          += 1

else:                                                    // WRONG
  if retired_at IS NULL:                                 // ACTIVE: reset streak, re-insert
    correct_streak := 0
    // Queue manager re-inserts question later in the queue (see 5.5)
  else:                                                  // RETIRED/DUE: lapse
    retired_at     := NULL
    correct_streak := 0
    lapses         += 1
    ease           := clamp(ease - 0.2, 1.3, infinity)
    interval_days  := 0
    due_at         := NULL
```

### 5.5 Wrong-answer re-insertion

On a wrong answer in the **active** phase, the question gets re-inserted into the queue 3–5 slots later (randomized within that window). Prevents parroting; forces real recall.

Queue state is **persisted per-session, not in-memory**, because the deploy target is Vercel serverless (no stable in-process state across requests). Implementation:

- `practice_sessions.queue_ids` is the immutable original queue (for audit and reconciliation).
- Add a `practice_sessions.remaining_queue uuid[]` column — the live, mutable queue. Updated on every `/respond` call: the responded question is removed if correct; on wrong (active phase), it's re-inserted 3–5 slots later within the remaining array.
- All queue mutations happen inside the response transaction, so the queue state and SRS state are always consistent.
- On browser refresh, the client reads `remaining_queue[0]` to know what to render next.

### 5.6 Generation timing

- **Batch-on-start** (Section 5.3 step 2): synchronous within session start; user waits for the session to open (~2–4s one-time).
- **Drip-refill** (Section 5.3 step 6 of /respond): asynchronous, fire-and-forget. Failures logged and ignored.
- **Model:** `OPENROUTER_MODEL_EXTRACTION`-tier. Questions don't need the chat model.
- **Cap per topic:** hard ceiling of 50 active+retired questions per topic. Once hit, drip-refill and batch-top-up stop for that topic.

## 6. Mastery

### 6.1 Formula

```
coverage         = min(retired_count / 5, 1)             // TARGET = 5
rolling_accuracy = first_try_correct_last_20 / first_try_responses_last_20
mastery          = coverage × rolling_accuracy           // 0..1
```

Both numerator and denominator of `rolling_accuracy` are restricted to **first-try responses only** (`question_responses.first_try = true`), over the most recent 20 first-try responses on that topic. Follow-up responses on a wrong question in the same session are excluded from both terms.

Edge cases:

- No first-try responses yet → `rolling_accuracy = 0`, so `mastery = 0` (label: New).
- Fewer than 20 first-try responses → compute over what's there; no minimum sample gate.
- Lapses decrement `retired_count`, so `coverage` drops with forgetting.

### 6.2 Recompute triggers

- After every `/respond` call (single `(user, topic)` affected).
- After an SM-2 lapse un-retires a question (same call site).
- After a new question is generated, update `pool_count` (mastery score unaffected).

Implemented as a single `INSERT ... ON CONFLICT UPDATE` on `topic_mastery`.

### 6.3 Labels

```
mastery == 0                     → "New"
0 < mastery ≤ 0.35               → "Learning"
0.35 < mastery ≤ 0.70            → "Solid"
mastery > 0.70                   → "Strong"
```

### 6.4 Consumers

| Surface | Read shape |
|---|---|
| `/topics` index | `topic_mastery.{score, retired_count, pool_count}` per topic |
| Topic detail page | Same + `accuracy`, `lapses` from related question aggregate |
| Queue builder | `topic_mastery.score` for `(1 - score)` sampling weight |
| Session summary | Snapshot before and after (captured at /start and /end) |

## 7. UX Surfaces

### 7.1 Home (`/`)

Primary CTA: **Start review** (links to `due_today` session). Secondary CTA: **Custom…** (opens topic picker). Below: recent topics list with small radial + label.

If queue would be empty, show empty state: *"Nothing queued. Start a chat or pick topics to practice."*

### 7.2 Custom topic picker

Modal from `/`. Multi-select topic list with inline radial + mastery label per row. Includes "Weak topics only" quick filter (`mastery < 0.35`). Confirm → POST `/api/practice/start { mode: 'custom', topic_ids }`.

### 7.3 Practice screen (`/practice/:sessionId`)

Shows one question at a time. Header has progress (`6 / 15`), topic name, small live radial.

- **Correct response:** show "✓ Correct", explanation (from `question.data.explanation`), `Next →` advances.
- **Wrong response:** show "✗ Not quite", explanation, note "You'll see this again later", `Next →` advances.

No timer, no streak counter in-session. The small radial updates live after each response.

### 7.4 Session summary

Shown when queue is empty or user exits. Lists:

- Count: `12 of 15 correct on first try · 4 topics practiced`
- Per-topic mastery delta: `The Lindy Effect   18% → 34%  ▲ 16`
- CTAs: Back to home · Practice again

### 7.5 Topics index (`/topics`)

Each card gets the 72px radial + label. Default sort: *Recently updated*. Additional sorts: *Lowest mastery first*, *Highest mastery first*.

### 7.6 Topic detail (`/topics/:id`)

Hero radial (168px) replaces the current "Updated …" area. One-line breakdown below the ring: *"3 of 5 mastered · 82% recent · 1 lapse this week"*. **Practice this topic** button above the rendered body — a shortcut to a single-topic `custom` session.

### 7.7 Removed surfaces

- `/quizzes/:id` route and `QuizPanel` component.
- "Generate Quiz" CTAs on topic and topic-group pages.

### 7.8 Radial component contract

```tsx
<MasteryRadial
  value={number}      // 0..100; component does not compute, receives
  label={string}      // 'New' | 'Learning' | 'Solid' | 'Strong'
  size={'sm' | 'md' | 'lg'}  // 72 | 168
  showNumber={boolean}
/>
```

Color maps to label via a lookup; the component itself is presentational.

## 8. Error Handling

| Failure | Handling |
|---|---|
| Batch generation for topic X fails at session start | Topic contributes fewer questions; queue shrinks silently. Log warn. |
| All batch generation fails, queue < 5 | Return 500 with actionable message; no session row persisted. |
| Drip-refill on correct fails | Swallowed. Pool doesn't grow this turn; next correct retries. |
| SM-2 update succeeds, mastery upsert fails | Response persists; mastery retried via reconciliation job (see below). Read path treats missing row as `{score: 0}`. |
| Response POSTed after `ended_at` set | 409; client redirects to summary. |
| Session abandoned (browser closed) | Stale-session close job (see below) sets `ended_at` for sessions with `ended_at IS NULL AND started_at < now() - interval '24 hours'`. |

### 8.1 Scheduled jobs

Both jobs run hourly as Vercel Cron Jobs (`vercel.json` → `crons[]`), hitting dedicated internal routes:

- `POST /api/internal/close-stale-sessions` — closes sessions open > 24h.
- `POST /api/internal/reconcile-mastery` — scans the last hour of `question_responses` and re-upserts `topic_mastery` for any `(user_id, topic_id)` pair whose row is missing or older than the latest response on that topic.

Both endpoints require an `x-internal-token` header compared to an env secret. Non-blocking to user traffic; idempotent.

## 9. Cost

**Call sites:**

1. Extraction on chat — unchanged.
2. Batch-on-start — per topic whose active pool < 3, one call requesting up to 5 questions. Realistic: 3–5 topics × 1 call = ~5 calls/session.
3. Drip-refill on correct — at most 1 call per correct answer, only when `active_pool < 3`. Bounded by correct answers per session.

**Per-session cost (extraction-tier model, rough):**
- ~800 output tokens per question × ~10 generations ≈ 8k tokens ≈ **~$0.01 / session**

**Cost controls:**
- 50-question hard ceiling per topic (see 5.6).
- Single generation call per topic at batch-on-start returning N questions.
- Drip-refill restricted to `is_correct && active_pool < 3`.

## 10. Testing

### Unit

- `grade_response(question, answer) → {is_correct, first_try}` — exhaustive per question type (MCQ, TF, SA).
- `apply_sm2(state, is_correct) → new_state` — table-driven across all entry states (active, retired+correct, retired+wrong, lapse). Verify ease floor at 1.3.
- `recompute_mastery(responses, retired_count, pool_count) → {coverage, accuracy, score}` — include empty state, <5 retired, post-lapse, all-wrong-recent cases.
- `build_queue(user, mode, topic_ids) → [ids]` — mock DB; verify composition ratios, mastery weighting, net-new reservation, topic clustering.

### Integration (real DB)

- Full happy-path session: start → 15 correct responses → summary. Assert SRS state, mastery deltas, session row closed.
- Retirement path: active question, wrong → right → right → assert `retired_at` set, `due_at` = start + 1d.
- SM-2 lapse path: retire, advance clock 1d, respond wrong → assert `retired_at = NULL`, `correct_streak = 0`, `ease -= 0.2`.
- Mastery cache consistency: 50 responses across 3 topics → assert `topic_mastery` matches re-computation from raw `question_responses` + `questions.retired_at`.
- Cost cap: topic with 50 questions → verify drip-refill skipped.

### Manual QA

- Full session on real AI-generated content with dev DB.
- Cross-topic Due session after a week of seed data usage.
- Session-abandonment recovery: start session, kill browser, run close-stale-sessions job, reopen app.

## 11. Migration

Single migration in `packages/db/migrations/`:

1. `DROP TABLE quizzes, quiz_questions CASCADE`.
2. Create `questions`, `practice_sessions`, `question_responses`, `topic_mastery` with indexes as specified.
3. No data backfill needed (pre-launch).

Server/client code removals in the same change:

- `apps/web/src/routes/quizzes.$quizId.tsx`
- `apps/web/src/components/quiz-panel.tsx`
- References to `listQuizzesFn`, `createQuizFn`, and quiz generation logic in `apps/web/src/server/quizzes.ts`
- "Generate Quiz" CTAs on topic and topic-group detail pages

Optional one-time seed: iterate existing topics, batch-generate 3 questions each. Skippable — first practice session on a topic does it on demand.

## 12. Open Questions / Future Work

- **Weak-topics-only home CTA:** likely promoted from picker filter to first-class entry point if telemetry shows it as dominant.
- **Ambient habit signal:** "days practiced this week" on home, without the anti-patterns of streak mechanics.
- **Flashcards:** out of v1; when introduced, decide whether they unify with the questions SRS engine or keep separate lightweight scheduling.
- **Topic-group mastery:** aggregate across a cluster for cross-topic quizzes.
- **Self-rating buttons:** if data shows certain question types drift to wrong intervals under binary grading, add a "That was hard" toggle to apply a half-ease-bump.
- **Question quality feedback:** report-this-question link on practice screen; for v2 (needs a moderation loop).
