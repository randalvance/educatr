import { AIConfigError } from './errors.ts';

export const DEFAULT_MODELS = {
  chat: 'anthropic/claude-sonnet-4',
  extraction: 'anthropic/claude-sonnet-4',
  embedding: 'openai/text-embedding-3-small',
} as const;

export const EMBEDDING_DIMENSIONS = 1536;

export function requireApiKey(): string {
  const value = process.env.OPENROUTER_API_KEY;
  if (!value) {
    throw new AIConfigError(
      '[@educatr/ai] OPENROUTER_API_KEY is not set. Add it to your environment (.env).',
    );
  }
  return value;
}

export function resolveModel(task: keyof typeof DEFAULT_MODELS): string {
  switch (task) {
    case 'chat':
      return process.env.OPENROUTER_MODEL_CHAT ?? DEFAULT_MODELS.chat;
    case 'extraction':
      return process.env.OPENROUTER_MODEL_EXTRACTION ?? DEFAULT_MODELS.extraction;
    case 'embedding':
      return process.env.OPENROUTER_MODEL_EMBEDDING ?? DEFAULT_MODELS.embedding;
  }
}
