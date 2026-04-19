import { randomUUID } from 'node:crypto';

export const USER_COOKIE = 'educatr_uid';

/**
 * Cookie-scoped placeholder user id for the single-user MVP. Replaced by a real
 * auth subject when authentication lands.
 *
 * Reads the id from the incoming request's `Cookie` header; if absent, mints a
 * new UUID and returns it alongside a `Set-Cookie` value the caller should
 * attach to the response.
 */
export interface ResolvedUser {
  userId: string;
  setCookie: string | null;
}

export function resolveUser(cookieHeader: string | null | undefined): ResolvedUser {
  const existing = parseCookie(cookieHeader ?? '', USER_COOKIE);
  if (existing) return { userId: existing, setCookie: null };
  const userId = randomUUID();
  const setCookie = `${USER_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
  return { userId, setCookie };
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}
