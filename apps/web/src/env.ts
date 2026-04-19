/**
 * Typed server-side environment loader. Throws at first access if a required
 * variable is missing, so misconfiguration fails fast rather than mid-request.
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[@educatr/web] Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  get DATABASE_URL() {
    return requireEnv('DATABASE_URL');
  },
  get OPENROUTER_API_KEY() {
    return requireEnv('OPENROUTER_API_KEY');
  },
};
