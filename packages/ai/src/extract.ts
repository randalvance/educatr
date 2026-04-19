import type { z } from 'zod';
import { getClient } from './client.ts';
import { resolveModel } from './env.ts';
import { AIValidationError } from './errors.ts';
import type { ChatMessage } from './chat.ts';

export interface ExtractOptions<T> {
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  /** A short hint included in the system prompt to describe the shape. */
  schemaDescription?: string;
  model?: string;
  temperature?: number;
}

/**
 * Ask the model to produce JSON and validate it against a Zod schema.
 * Retries once on validation failure before raising {@link AIValidationError}.
 */
export async function extract<T>(opts: ExtractOptions<T>): Promise<T> {
  const client = getClient();
  const model = opts.model ?? resolveModel('extraction');

  const systemPrimer: ChatMessage = {
    role: 'system',
    content: [
      'You must respond with a single valid JSON object and nothing else.',
      'Do not wrap the JSON in markdown or prose.',
      opts.schemaDescription
        ? `The JSON must conform to: ${opts.schemaDescription}`
        : 'The JSON must conform to the caller-provided schema.',
    ].join('\n'),
  };

  let lastRaw = '';
  let lastIssues: unknown = undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: ChatMessage[] =
      attempt === 0
        ? [systemPrimer, ...opts.messages]
        : [
            systemPrimer,
            ...opts.messages,
            {
              role: 'user',
              content:
                'Your previous response was not valid against the schema. Return only the JSON object, with no surrounding text.',
            },
          ];

    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    });

    lastRaw = completion.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(lastRaw);
    } catch {
      continue;
    }

    const result = opts.schema.safeParse(parsed);
    if (result.success) return result.data;
    lastIssues = result.error.issues;
  }

  throw new AIValidationError(
    'Structured extraction output failed schema validation after retry.',
    lastRaw,
    lastIssues,
  );
}
