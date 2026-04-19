## ADDED Requirements

### Requirement: Generate a visual explainer for a Topic
The system SHALL allow a user to generate a visual explainer for a given Topic on demand.

#### Scenario: User requests a visual explainer
- **WHEN** a user clicks "Generate visual explainer" on a Topic
- **THEN** a visual explainer is produced, persisted, and displayed

### Requirement: Structured visual output
A visual explainer SHALL consist of a diagram in a text-based format (Mermaid) plus a short narrative explanation keyed to the diagram.

#### Scenario: Diagram renders
- **WHEN** a generated visual explainer is opened
- **THEN** its Mermaid source is rendered to a diagram in the browser and the narrative is displayed alongside it

#### Scenario: Diagram syntax is invalid
- **WHEN** the generated Mermaid source fails to parse
- **THEN** the system SHALL retry generation at least once; persistent failures surface a clear error and no broken explainer is persisted

### Requirement: Visual explainer persistence
Generated visual explainers SHALL be persisted in Postgres, linked to their source Topic, with diagram source and narrative stored as structured fields.

#### Scenario: Reopen a visual explainer
- **WHEN** a user returns to a Topic with a prior explainer
- **THEN** the prior explainer is listed and openable in its original form

### Requirement: Regenerate and versioning
The system SHALL allow a user to regenerate a visual explainer for a Topic without destroying the prior one.

#### Scenario: User regenerates
- **WHEN** a user requests regeneration
- **THEN** a new visual explainer is persisted alongside the previous version, and both are listed on the Topic
