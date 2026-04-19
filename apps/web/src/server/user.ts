import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { resolveUser, USER_COOKIE } from '../lib/user.ts';

/**
 * Server-only: resolve the cookie-scoped placeholder user id for the current
 * request. If a new id is minted, the matching Set-Cookie is attached to the
 * response automatically.
 */
export function getOrCreateUserId(): string {
  const request = getRequest();
  const { userId, setCookie } = resolveUser(request.headers.get('cookie'));
  if (setCookie) setResponseHeader('Set-Cookie', setCookie);
  return userId;
}

/** Same helper, but driven from an incoming `Request` (used inside server routes). */
export function readUserFromRequest(request: Request): {
  userId: string;
  setCookie: string | null;
} {
  return resolveUser(request.headers.get('cookie'));
}

export { USER_COOKIE };
