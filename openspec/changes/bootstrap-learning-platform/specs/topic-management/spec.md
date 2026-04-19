## ADDED Requirements

### Requirement: Topic CRUD
The system SHALL support creating, reading, updating, and deleting Topics, persisted in Postgres.

#### Scenario: Read Topic detail
- **WHEN** a user navigates to a Topic's detail view
- **THEN** the Topic's title, summary, body, tags, and related artifacts are displayed

#### Scenario: Edit Topic
- **WHEN** a user edits a Topic's title, summary, or body and saves
- **THEN** the changes are persisted and the updated_at timestamp advances

#### Scenario: Delete Topic
- **WHEN** a user deletes a Topic
- **THEN** the Topic and its owned artifacts (quizzes, flashcards, visual explainers) are removed or safely detached

### Requirement: Lexical deduplication on creation
Before inserting a new Topic, the system SHALL normalize the title to a slug and compare it to existing Topics in the user's scope; an exact slug match SHALL be treated as a duplicate.

#### Scenario: Exact slug match exists
- **WHEN** a new candidate Topic shares a normalized title slug with an existing Topic
- **THEN** no new row is created; the candidate is merged into the existing Topic and the source chat message is linked to it

### Requirement: Semantic deduplication via embeddings
The system SHALL compute an embedding for each Topic's `title + summary` and, on creation, use `pgvector` cosine similarity to detect near-duplicates within a configurable threshold.

#### Scenario: Near-duplicate detected
- **WHEN** a candidate Topic's embedding is within the duplicate threshold of an existing Topic
- **THEN** the candidate is merged into the existing Topic rather than inserted as a new row

#### Scenario: No near-duplicate
- **WHEN** no existing Topic falls within the duplicate threshold
- **THEN** the candidate is inserted as a new Topic with its embedding stored

### Requirement: Topic grouping
The system SHALL support grouping related Topics under a parent `TopicGroup`, computed from embedding proximity within a "related" threshold.

#### Scenario: Grouping computation
- **WHEN** the grouping routine runs over the Topic set
- **THEN** Topics with pairwise cosine similarity within the related threshold are clustered under a shared `TopicGroup`, with auto-generated group title and summary

#### Scenario: Browsing a group
- **WHEN** a user opens a `TopicGroup`
- **THEN** the member Topics are listed with their summaries

### Requirement: Merge provenance
When a candidate Topic is merged into an existing Topic, the system SHALL retain enough provenance for a user to see what was merged.

#### Scenario: Viewing merged Topic
- **WHEN** a user views a Topic that has absorbed duplicates
- **THEN** the source messages from each merge event are visible in the Topic's sources list
