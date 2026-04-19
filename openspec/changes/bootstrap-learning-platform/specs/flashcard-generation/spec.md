## ADDED Requirements

### Requirement: Generate flashcards from a Topic
The system SHALL allow a user to generate a flashcard deck for a given Topic on demand.

#### Scenario: User requests flashcards
- **WHEN** a user clicks "Generate flashcards" on a Topic
- **THEN** a deck of flashcards is produced, persisted, and displayed

### Requirement: Flashcard structure
Each flashcard SHALL have a clearly defined front (prompt) and back (answer), optionally with hints or example cues.

#### Scenario: Flashcard is rendered
- **WHEN** a user opens a flashcard
- **THEN** the front is shown first, and the back is revealed on user action

### Requirement: Deck persistence
Generated flashcard decks SHALL be persisted in Postgres, linked to their source Topic (or `TopicGroup`), with cards stored as structured rows.

#### Scenario: Reopen a previously generated deck
- **WHEN** a user returns to a Topic with prior decks
- **THEN** those decks are listed and openable in their original form

### Requirement: Study session
The system SHALL support a basic flip-through study session over a deck.

#### Scenario: Stepping through a deck
- **WHEN** a user opens a deck in study mode
- **THEN** they can advance forward, go back, and see their position within the deck

### Requirement: Generation from a Topic group
The system SHALL support generating a flashcard deck that spans all Topics in a `TopicGroup`.

#### Scenario: Group-level deck
- **WHEN** a user generates flashcards on a `TopicGroup`
- **THEN** the deck draws cards from the member Topics and is linked to the group
