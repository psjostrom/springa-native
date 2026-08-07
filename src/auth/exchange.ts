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

function parseMobileAuthJson(data: unknown): Session {
  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error('Mobile auth response missing token, expiresAt, or user.email');
  }
  const body = data as {
    token?: unknown;
    expiresAt?: unknown;
    user?: { email?: unknown };
  };
  if (
    typeof body.token !== 'string' ||
    body.token.length === 0 ||
    typeof body.expiresAt !== 'number' ||
    typeof body.user?.email !== 'string' ||
    body.user.email.length === 0
  ) {
    throw new Error('Mobile auth response missing token, expiresAt, or user.email');
  }
  return {
    token: body.token,
    expiresAt: normalizeExpiresAt(body.expiresAt),
    email: body.user.email,
  };
}

async function postMobileAuth(path: string, body: Record<string, string>): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  return parseMobileAuthJson(await res.json());
}

export async function exchangeGoogleIdToken(idToken: string): Promise<Session> {
  return postMobileAuth('/api/auth/mobile', { idToken });
}

/** Dev-only QA bypass — Springa POST /api/qa/mobile. */
export async function exchangeQaToken(token: string): Promise<Session> {
  if (!__DEV__) {
    throw new Error('QA sign-in is only available in development builds');
  }
  return postMobileAuth('/api/qa/mobile', { token });
}
