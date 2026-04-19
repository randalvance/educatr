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
  const override = {
    chat: process.env.OPENROUTER_MODEL_CHAT,
    extraction: process.env.OPENROUTER_MODEL_EXTRACTION,
    embedding: process.env.OPENROUTER_MODEL_EMBEDDING,
  }[task]?.trim();
  return override && override.length > 0 ? override : DEFAULT_MODELS[task];
}
