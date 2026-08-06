import { getApiBaseUrl } from './config';
import type { Session } from './session';

export async function exchangeGoogleIdToken(idToken: string): Promise<Session> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error(`Mobile auth failed (${res.status})`);
  }
  const data = (await res.json()) as {
    token?: unknown;
    expiresAt?: unknown;
    user?: { email?: unknown };
  };
  if (
    typeof data.token !== 'string' ||
    data.token.length === 0 ||
    typeof data.expiresAt !== 'number' ||
    !Number.isFinite(data.expiresAt) ||
    typeof data.user?.email !== 'string' ||
    data.user.email.length === 0
  ) {
    throw new Error('Mobile auth response missing token, expiresAt, or user.email');
  }
  return {
    token: data.token,
    expiresAt: data.expiresAt,
    email: data.user.email,
  };
}
