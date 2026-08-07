import { describe, expect, it } from 'vitest';
import {
  createSessionApi,
  isSessionValid,
  parseSessionJson,
  type Session,
  type SessionStore,
} from './session';

describe('isSessionValid', () => {
  it('accepts future expiry', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    expect(isSessionValid(s, 1_700_000_000)).toBe(true);
  });

  it('rejects near-expiry within skew', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 1_700_000_030 };
    expect(isSessionValid(s, 1_700_000_000)).toBe(false);
  });
});

describe('parseSessionJson', () => {
  it('returns null for corrupt JSON', () => {
    expect(parseSessionJson('{not json')).toBeNull();
  });

  it('parses a valid session payload', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    expect(parseSessionJson(JSON.stringify(s))).toEqual(s);
  });

  it('returns null when token is missing or empty', () => {
    expect(
      parseSessionJson(JSON.stringify({ email: 'a@b.c', expiresAt: 2_000_000_000 })),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: '', email: 'a@b.c', expiresAt: 2_000_000_000 }),
      ),
    ).toBeNull();
  });

  it('returns null when email is missing or empty', () => {
    expect(
      parseSessionJson(JSON.stringify({ token: 't', expiresAt: 2_000_000_000 })),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: 't', email: '', expiresAt: 2_000_000_000 }),
      ),
    ).toBeNull();
  });

  it('returns null for non-finite expiresAt', () => {
    expect(
      parseSessionJson('{"token":"t","email":"a@b.c","expiresAt":1e400}'),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({
          token: 't',
          email: 'a@b.c',
          expiresAt: Number.POSITIVE_INFINITY,
        }),
      ),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: 't', email: 'a@b.c', expiresAt: 'soon' }),
      ),
    ).toBeNull();
  });
});

describe('session persistence queue', () => {
  it('keeps a session saved while a delayed clear from sign-out is still running', async () => {
    const map = new Map<string, string>();
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        map.delete(key);
      },
    };

    const { saveSession, clearSession, loadSession } = createSessionApi(
      async () => store,
    );

    const oldSession: Session = {
      token: 'old',
      email: 'old@example.com',
      expiresAt: 2_000_000_000,
    };
    const newSession: Session = {
      token: 'new',
      email: 'new@example.com',
      expiresAt: 2_000_000_000,
    };

    await saveSession(oldSession);
    const clearStarted = clearSession();
    const saveStarted = saveSession(newSession);
    await Promise.all([clearStarted, saveStarted]);

    expect(await loadSession()).toEqual(newSession);
  });

  it('rejects clearSession when both deletion attempts fail', async () => {
    const deleteError = new Error('SecureStore unavailable');
    const store: SessionStore = {
      async getItemAsync() {
        return null;
      },
      async setItemAsync() {
        // no-op
      },
      async deleteItemAsync() {
        throw deleteError;
      },
    };

    const { clearSession } = createSessionApi(async () => store);

    await expect(clearSession()).rejects.toBe(deleteError);
  });
});
