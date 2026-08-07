import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { exchangeGoogleIdToken, exchangeQaToken } from './exchange';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';

describe('exchangeGoogleIdToken', () => {
  it('returns a session from POST /api/auth/mobile', async () => {
    const session = await exchangeGoogleIdToken('google-id-token');
    expect(session.token).toBe('mobile-jwt');
    expect(session.email).toBe('runner@example.com');
    expect(session.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('throws on non-OK response', async () => {
    server.use(
      http.post(apiUrl('/api/auth/mobile'), () =>
        new HttpResponse('Unauthorized', { status: 401 }),
      ),
    );
    await expect(exchangeGoogleIdToken('bad')).rejects.toThrow(
      'Mobile auth failed (401)',
    );
  });
});

describe('exchangeQaToken', () => {
  it('returns a session from POST /api/qa/mobile', async () => {
    const session = await exchangeQaToken('qa-secret');
    expect(session.token).toBe('qa-mobile-jwt');
    expect(session.email).toBe('qa@example.com');
  });

  it('throws on non-OK response', async () => {
    server.use(
      http.post(apiUrl('/api/qa/mobile'), () =>
        new HttpResponse('Not Found', { status: 404 }),
      ),
    );
    await expect(exchangeQaToken('bad')).rejects.toThrow(
      'Mobile auth failed (404)',
    );
  });
});
