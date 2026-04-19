import { getClient } from './client.ts';
import { resolveModel, EMBEDDING_DIMENSIONS } from './env.ts';
import { AIStreamError } from './errors.ts';

export { EMBEDDING_DIMENSIONS };

export interface EmbedOptions {
  input: string;
  model?: string;
}

/** Embed a single string; returns a numeric vector of {@link EMBEDDING_DIMENSIONS}. */
export async function embed(opts: EmbedOptions): Promise<number[]> {
  const client = getClient();
  const model = opts.model ?? resolveModel('embedding');
  try {
    const res = await client.embeddings.create({
      model,
      input: opts.input,
    });
    const vector = res.data[0]?.embedding;
    if (!vector) throw new AIStreamError('Embedding response had no data.');
    return vector;
  } catch (err) {
    if (err instanceof AIStreamError) throw err;
    throw new AIStreamError(
      `Embedding failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
