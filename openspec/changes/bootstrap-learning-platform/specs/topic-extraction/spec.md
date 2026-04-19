## ADDED Requirements

### Requirement: Automatic Topic extraction from chat turns
The system SHALL analyze each completed chat turn (user question + assistant response) and extract zero or more candidate Topics representing granular, self-contained lessons.

#### Scenario: Assistant response yields a new lesson
- **WHEN** a chat turn completes and its content covers a focused, teachable idea
- **THEN** at least one candidate Topic is produced with a title, summary, and body

#### Scenario: Turn contains no new teachable content
- **WHEN** a chat turn is small talk, a clarifying question, or purely meta
- **THEN** zero candidate Topics are produced and no error is surfaced to the user

### Requirement: Granular Topic scope
Extracted Topics SHALL be narrow enough to stand alone as a single lesson; broad subjects MUST be split into multiple related Topics rather than one sprawling Topic.

#### Scenario: Multi-concept response
- **WHEN** an assistant response covers several distinct concepts
- **THEN** multiple Topics are produced, one per concept, each with a focused scope

### Requirement: Structured Topic output
Each extracted Topic SHALL be returned as structured data with, at minimum: `title`, `summary`, `body_markdown`, and `tags`.

#### Scenario: Extraction produces parseable output
- **WHEN** the extractor runs against a chat turn
- **THEN** the result is JSON validated against the Topic schema before any database write

#### Scenario: Extraction output is invalid
- **WHEN** the extractor returns malformed output that cannot be validated after retries
- **THEN** the turn is skipped for extraction, a log is emitted, and chat UX is not blocked

### Requirement: Source traceability
Every extracted Topic SHALL record which chat message(s) produced or updated it.

#### Scenario: Topic is created
- **WHEN** a candidate Topic is persisted
- **THEN** a source link is recorded connecting the Topic to the originating message(s)

### Requirement: Non-blocking extraction
Topic extraction SHALL run after the user-visible streaming response completes and MUST NOT delay display of assistant tokens.

#### Scenario: Extraction failure during a chat
- **WHEN** extraction throws an error after a chat turn completes
- **THEN** the user still sees the assistant response and the chat remains usable
