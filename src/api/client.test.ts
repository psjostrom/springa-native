import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiError, createApiClient, parseUserSettings } from './client';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';

const baseUrl = process.env.EXPO_PUBLIC_SPRINGA_API_URL ?? 'https://www.springa.run';

function makeClient(onUnauthorized: () => void = () => {}) {
  return createApiClient({
    getToken: () => 'test-token',
    onUnauthorized,
    baseUrl,
  });
}

describe('parseUserSettings', () => {
  it('accepts a plain object', () => {
    expect(parseUserSettings({ intervalsConnected: true }).intervalsConnected).toBe(
      true,
    );
  });

  it('rejects null, arrays, and primitives', () => {
    expect(() => parseUserSettings(null)).toThrow(ApiError);
    expect(() => parseUserSettings([])).toThrow(ApiError);
    expect(() => parseUserSettings('nope')).toThrow(ApiError);
  });
});

describe('createApiClient', () => {
  it('returns settings on 200 with Bearer', async () => {
    const settings = await makeClient().getSettings();
    expect(settings.intervalsConnected).toBe(true);
    expect(settings.diabetesMode).toBe(true);
  });

  it('returns calendar events on 200', async () => {
    const events = await makeClient().getCalendar('2026-08-01', '2026-08-31');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.date).toBeInstanceOf(Date);
    expect(events.some((e) => e.name === 'Threshold intervals')).toBe(true);
  });

  it('returns bg payload on 200', async () => {
    const bg = await makeClient().getBg();
    expect(bg.current?.mmol).toBe(6.2);
  });

  it('calls onUnauthorized and throws ApiError on 401', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );
    let cleared = false;
    await expect(
      makeClient(() => {
        cleared = true;
      }).getSettings(),
    ).rejects.toBeInstanceOf(ApiError);
    expect(cleared).toBe(true);
  });

  it('throws ApiError with status on other failures', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    try {
      await makeClient().getSettings();
      expect.unreachable('expected getSettings to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });

  it('throws ApiError when settings JSON is not an object', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () => HttpResponse.json([1, 2, 3])),
    );
    await expect(makeClient().getSettings()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Settings response had unexpected shape',
    });
  });

  it('throws ApiError when calendar JSON is not an array', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json({ events: [] }),
      ),
    );
    await expect(
      makeClient().getCalendar('2026-01-01', '2026-01-31'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Calendar response had unexpected shape',
    });
  });

  it('throws ApiError on network failure', async () => {
    server.use(http.get(apiUrl('/api/settings'), () => HttpResponse.error()));
    try {
      await makeClient().getSettings();
      expect.unreachable('expected getSettings to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toMatch(/network/i);
    }
  });

  it('treats missing token as unauthorized', async () => {
    let cleared = false;
    const client = createApiClient({
      getToken: () => null,
      onUnauthorized: () => {
        cleared = true;
      },
      baseUrl,
    });
    await expect(client.getSettings()).rejects.toBeInstanceOf(ApiError);
    expect(cleared).toBe(true);
  });
});
