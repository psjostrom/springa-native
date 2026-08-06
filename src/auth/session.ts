export type Session = {
  token: string;
  expiresAt: number;
  email: string;
};

const SESSION_KEY = 'springa.session.v1';

export function isSessionValid(session: Session, nowSec = Date.now() / 1000): boolean {
  return session.expiresAt > nowSec + 60;
}

/** Parse stored session JSON; null on corrupt payload. */
export function parseSessionJson(raw: string): Session | null {
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<Session | null> {
  const SecureStore = await import('expo-secure-store');
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  const session = parseSessionJson(raw);
  if (!session || !isSessionValid(session)) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }

  return session;
}

export async function saveSession(session: Session): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
