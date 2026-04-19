import { getClient } from './client.ts';
import { resolveModel } from './env.ts';
import { AIStreamError } from './errors.ts';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface ChatStreamOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Stream tokens from a chat completion. Yields text chunks as they arrive.
 */
export async function* streamChat(opts: ChatStreamOptions): AsyncGenerator<string, void, void> {
  const client = getClient();
  const model = opts.model ?? resolveModel('chat');

  try {
    const stream = await client.chat.completions.create(
      {
        model,
        messages: opts.messages,
        stream: true,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      opts.signal ? { signal: opts.signal } : undefined,
    );

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new AIStreamError(
      `Chat stream failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
