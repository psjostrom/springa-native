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
    token: string;
    expiresAt: number;
    user: { email: string };
  };
  return {
    token: data.token,
    expiresAt: data.expiresAt,
    email: data.user.email,
  };
}
