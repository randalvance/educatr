import OpenAI from 'openai';
import { requireApiKey } from './env.ts';

let _client: OpenAI | null = null;

/**
 * OpenRouter-backed OpenAI-compatible client. Module-cached so Vercel serverless
 * warm starts reuse the same instance.
 */
export function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({
    apiKey: requireApiKey(),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      // Optional OpenRouter attribution headers — harmless if empty.
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://educatr.local',
      'X-Title': 'educatr',
    },
  });
  return _client;
}
