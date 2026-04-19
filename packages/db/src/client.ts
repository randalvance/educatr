import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireDatabaseUrl } from './env.ts';
import * as schema from './schema/index.ts';

let _client: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: postgres.Sql | null = null;

/**
 * Server-only Postgres client.
 *
 * Cached at module scope so Vercel serverless function warm starts reuse the
 * connection pool rather than opening a new one per invocation.
 */
export function getDb() {
  if (_client) return _client;
  _sql = postgres(requireDatabaseUrl(), {
    // Small pool to stay well under Postgres connection limits on serverless.
    max: 5,
    prepare: false,
  });
  _client = drizzle(_sql, { schema });
  return _client;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
