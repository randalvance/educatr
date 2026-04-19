export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      '[@educatr/db] DATABASE_URL is not set. Add it to your environment (.env).',
    );
  }
  return value;
}
