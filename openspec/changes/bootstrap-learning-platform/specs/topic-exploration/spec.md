## ADDED Requirements

### Requirement: Conversational chat interface
The system SHALL provide a chat UI where a user sends messages and receives streaming AI responses about any subject.

#### Scenario: User sends a message
- **WHEN** a user submits a message in the chat UI
- **THEN** the message is persisted, an assistant response begins streaming within the same session, and both are visible in the thread

#### Scenario: Streaming response interruption
- **WHEN** the user navigates away or cancels during a streamed response
- **THEN** the partial response up to the interruption point is persisted and the stream is cleanly closed

### Requirement: Chat history persistence
The system SHALL persist every chat and message in Postgres, preserving role (`user` | `assistant`), content, and ordering.

#### Scenario: Reopening a chat
- **WHEN** a user reopens a previously created chat
- **THEN** all prior messages in that chat are loaded in original order

#### Scenario: Chat listing
- **WHEN** a user opens the app
- **THEN** their prior chats are listed with title and last-updated timestamp

### Requirement: New chat creation
The system SHALL allow a user to start a new chat at any time, automatically generating a concise title once the first exchange completes.

#### Scenario: First exchange completes
- **WHEN** the first user message and assistant response are stored
- **THEN** the chat is given an auto-generated short title derived from the exchange

### Requirement: Exploration-friendly prompting
The assistant SHALL behave as a teacher that explores subjects in depth, asks clarifying questions when helpful, and structures explanations in ways that are easy to later distill into granular lessons.

#### Scenario: Ambiguous user question
- **WHEN** a user asks an ambiguous question
- **THEN** the assistant either answers at the most useful scope or asks a brief clarifying question before answering
