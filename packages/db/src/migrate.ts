import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { requireDatabaseUrl } from './env.ts';

async function main() {
  const sql = postgres(requireDatabaseUrl(), { max: 1, prepare: false });
  const db = drizzle(sql);
  console.log('[@educatr/db] Running migrations...');
  await migrate(db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
  console.log('[@educatr/db] Migrations complete.');
  await sql.end();
}

main().catch((err) => {
  console.error('[@educatr/db] Migration failed:', err);
  process.exit(1);
});
