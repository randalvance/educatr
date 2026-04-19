## ADDED Requirements

### Requirement: Generate quiz from a Topic
The system SHALL allow a user to generate a quiz for a given Topic on demand.

#### Scenario: User requests a quiz
- **WHEN** a user clicks "Generate quiz" on a Topic
- **THEN** a quiz is produced, persisted, and displayed in a playable form

#### Scenario: Generation failure
- **WHEN** AI generation fails or returns invalid output after retry
- **THEN** the user sees a clear error and no partial quiz is persisted

### Requirement: Multiple question formats
Generated quizzes SHALL support at least multiple-choice, true/false, and short-answer question types, with structured answer keys.

#### Scenario: Quiz contains mixed types
- **WHEN** a quiz is generated with default options
- **THEN** the resulting quiz contains a mix of supported question types, each with a correct answer and (for multiple-choice) plausible distractors

### Requirement: Quiz persistence
Generated quizzes SHALL be persisted in Postgres, linked to their source Topic, with questions and answers stored as structured rows.

#### Scenario: Reopen a previously generated quiz
- **WHEN** a user returns to a Topic with prior quizzes
- **THEN** those quizzes are listed and can be reopened exactly as generated

### Requirement: Taking a quiz
The system SHALL allow a user to answer a quiz and receive a per-question result and overall score.

#### Scenario: User completes a quiz
- **WHEN** a user submits all answers
- **THEN** each answer is marked correct or incorrect and an overall score is shown

### Requirement: Generation from a Topic group
The system SHALL support generating a quiz that spans all Topics in a `TopicGroup`.

#### Scenario: Group-level quiz
- **WHEN** a user generates a quiz on a `TopicGroup`
- **THEN** the quiz draws questions from the member Topics and is linked to the group
