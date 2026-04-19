## ADDED Requirements

### Requirement: OpenRouter is the sole AI provider
The system SHALL route all AI inference (chat, structured extraction, embeddings) through OpenRouter, using an OpenAI-compatible client configured with the OpenRouter base URL and `OPENROUTER_API_KEY`.

#### Scenario: AI call is issued
- **WHEN** any server code invokes the AI gateway
- **THEN** the request is sent to `https://openrouter.ai/api/v1` authenticated with `OPENROUTER_API_KEY`

#### Scenario: Provider credential missing
- **WHEN** `OPENROUTER_API_KEY` is not set and an AI call is attempted
- **THEN** the gateway SHALL raise a typed configuration error without sending any network request

### Requirement: Streaming chat completions
The gateway SHALL support streaming chat completions, exposing incremental tokens to the caller.

#### Scenario: Chat stream yields tokens
- **WHEN** the server calls `chat.stream({ messages, model })`
- **THEN** it receives an async iterable of text chunks that can be forwarded to the client

#### Scenario: Upstream stream error
- **WHEN** OpenRouter returns an error mid-stream
- **THEN** the gateway surfaces a typed error to the caller and closes the stream cleanly

### Requirement: Structured output extraction
The gateway SHALL provide a typed `extract<T>` helper that returns JSON validated against a caller-supplied schema.

#### Scenario: Valid structured response
- **WHEN** the model returns JSON that conforms to the supplied schema
- **THEN** the helper returns the parsed, typed value

#### Scenario: Schema violation
- **WHEN** the model returns JSON that fails schema validation
- **THEN** the helper SHALL retry at least once; if the retry also fails it raises a typed validation error

### Requirement: Embedding generation
The gateway SHALL provide an `embed` helper that returns a fixed-length numeric vector for a given text input.

#### Scenario: Single input embedding
- **WHEN** `embed({ input })` is called with a non-empty string
- **THEN** it returns a numeric vector of the configured dimensionality

### Requirement: Per-task model configuration
Models used for chat, extraction, and embeddings SHALL be configurable independently (e.g. via environment variables) without code changes.

#### Scenario: Override chat model
- **WHEN** an environment variable overrides the default chat model
- **THEN** subsequent `chat.stream` calls use the overridden model
