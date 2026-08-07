import { getApiBaseUrl } from './config';
import type { Session } from './session';

const MOBILE_AUTH_TIMEOUT_MS = 15_000;

/** Reject non-finite or millisecond-scale values; session store expects Unix seconds. */
function normalizeExpiresAt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Mobile auth response expiresAt must be a positive Unix timestamp in seconds');
  }
  // ≥ 1e12 is almost certainly milliseconds (current epoch ms ≈ 1.7e12).
  if (value >= 1e12) {
    return Math.floor(value / 1000);
  }
  return value;
}

export async function exchangeGoogleIdToken(idToken: string): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/api/auth/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(MOBILE_AUTH_TIMEOUT_MS),
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')
    ) {
      throw new Error('Sign-in timed out. Check your connection and try again.');
    }
    throw err;
  }
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
    typeof data.user?.email !== 'string' ||
    data.user.email.length === 0
  ) {
    throw new Error('Mobile auth response missing token, expiresAt, or user.email');
  }
  return {
    token: data.token,
    expiresAt: normalizeExpiresAt(data.expiresAt),
    email: data.user.email,
  };
}
