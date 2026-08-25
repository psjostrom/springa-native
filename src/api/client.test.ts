import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiError, createApiClient, parseUserSettings } from './client';
import { apiUrl } from '@/test/msw/helpers';
import { degradedCompletedOverview } from '@/test/msw/handlers/completedWorkoutOverview';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
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

  it('returns planned workout detail on 200', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json({
          effortMetric: 'pace',
          heartRateMetricAvailable: false,
          event: {
            id: 'event-123',
            intervalsEventId: 123,
            startDateLocal: '2026-08-13T12:00:00',
            name: 'W05 Easy',
            category: 'easy',
            description: '',
          },
          replacementCategory: 'easy',
          structure: { sections: [], timeline: [] },
          metrics: {
            duration: null,
            distance: null,
            fuelRateGPerHour: null,
            prescribedCarbsG: null,
          },
          preRunCarbsG: null,
          clothing: { status: 'unavailable', reason: 'outside-window' },
        })),
    );

    const detail = await makeClient().getPlannedWorkoutDetail('event-123');

    expect(detail.event.name).toBe('W05 Easy');
  });

  it('sends an exact effort metric body and parses the returned detail', async () => {
    let body: unknown;
    server.use(
      http.put(apiUrl('/api/intervals/events/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...defaultPlannedWorkoutDetail('event-123'),
          effortMetric: 'hr',
          heartRateMetricAvailable: true,
        });
      }),
    );

    const detail = await makeClient().changeWorkoutEffortMetric('event-123', 'hr');

    expect(body).toEqual({ effortMetric: 'hr' });
    expect(detail.effortMetric).toBe('hr');
    expect(detail.heartRateMetricAvailable).toBe(true);
  });

  it('rejects an effort metric response for another workout', async () => {
    server.use(
      http.put(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json(defaultPlannedWorkoutDetail('event-456')),
      ),
    );

    await expect(
      makeClient().changeWorkoutEffortMetric('event-123', 'feel'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      message: 'Effort metric response did not match requested workout',
    });
  });

  it('sends M4 mutation payloads', async () => {
    let putBody: unknown;
    let replaceBody: unknown;
    let saveCarbsBody: unknown;
    let deletedEventId: string | null = null;
    server.use(
      http.put(apiUrl('/api/intervals/events/:id'), async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/intervals/events/replace'), async ({ request }) => {
        replaceBody = await request.json();
        return HttpResponse.json({ newId: 456 });
      }),
      http.delete(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        deletedEventId = String(params.id);
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/prerun-carbs'), async ({ request }) => {
        saveCarbsBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const client = makeClient();
    await expect(client.moveWorkout('event-123', '2026-08-14T12:00:00')).resolves.toEqual({
      ok: true,
    });
    await expect(client.replaceWorkout('event-123', 'quality')).resolves.toEqual({
      newId: 456,
    });
    await expect(client.deleteWorkout('event-123')).resolves.toEqual({ ok: true });
    await expect(client.savePreRunCarbs('event-123', 30)).resolves.toEqual({ ok: true });

    expect(putBody).toEqual({ start_date_local: '2026-08-14T12:00:00' });
    expect(replaceBody).toEqual({ existingEventId: 'event-123', category: 'quality' });
    expect(saveCarbsBody).toEqual({ eventId: 'event-123', carbsG: 30 });
    expect(deletedEventId).toBe('event-123');
  });

  it('preserves typed server error details', async () => {
    server.use(
      http.post(apiUrl('/api/intervals/events/replace'), () =>
        HttpResponse.json(
          { error: 'Plan settings required', code: 'PLAN_SETTINGS_REQUIRED' },
          { status: 422 },
        ),
      ),
    );

    await expect(makeClient().replaceWorkout('event-123', 'quality')).rejects.toMatchObject({
      status: 422,
      message: 'Plan settings required',
      code: 'PLAN_SETTINGS_REQUIRED',
    });
  });

  it('returns the parsed completed workout overview on 200', async () => {
    const overview = await makeClient().getCompletedWorkoutOverview('activity-123');

    expect(overview.activityId).toBe('activity-123');
    expect(overview.reportCard.bg?.rating).toBe('good');
    expect(overview.reportCard.hrZone?.expectedRepSec).toBe(185);
    expect(overview.reportCard.recovery?.postHypo).toBe(true);
    expect(overview.splits).toEqual([
      { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
      { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
    ]);
    expect(overview.preRunCarbs).toEqual({
      grams: 45,
      source: 'activity',
      fallbackEventId: null,
    });
  });

  it('parses a degraded overview response with nulls preserved', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/activity/activity-123/overview'), () =>
        HttpResponse.json(degradedCompletedOverview()),
      ),
    );

    const overview = await makeClient().getCompletedWorkoutOverview('activity-123');

    expect(overview.reportCard).toEqual({
      bg: null,
      hrZone: null,
      entryTrend: null,
      recovery: null,
    });
    expect(overview.splits).toBeNull();
    expect(overview.preRunCarbs).toEqual({
      grams: null,
      source: 'none',
      fallbackEventId: null,
    });
  });

  it('sends exact completed-overview mutation payloads', async () => {
    const putBodies: unknown[] = [];
    const feedbackBodies: unknown[] = [];
    let deleteUrl: string | null = null;
    server.use(
      http.put(apiUrl('/api/intervals/activity/:id'), async ({ request }) => {
        putBodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
      http.delete(apiUrl('/api/prerun-carbs'), ({ request }) => {
        deleteUrl = request.url;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/run-feedback'), async ({ request }) => {
        feedbackBodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );

    const client = makeClient();
    await expect(client.updateActivityCarbs('activity-123', 60)).resolves.toEqual({
      ok: true,
    });
    await expect(client.updateActivityPreRunCarbs('activity-123', 30)).resolves.toEqual({
      ok: true,
    });
    await expect(client.updateActivityPreRunCarbs('activity-123', null)).resolves.toEqual({
      ok: true,
    });
    await expect(client.deletePreRunCarbs(202)).resolves.toBeUndefined();
    await expect(
      client.saveRunFeedback('activity-123', 'good', 'Felt strong'),
    ).resolves.toEqual({ ok: true });

    expect(putBodies).toEqual([
      { carbs_ingested: 60 },
      { PreRunCarbsG: 30 },
      { PreRunCarbsG: 0 },
    ]);
    expect(new URL(deleteUrl!).searchParams.get('eventId')).toBe('202');
    expect(feedbackBodies).toEqual([
      { activityId: 'activity-123', rating: 'good', comment: 'Felt strong' },
    ]);
  });

  it('throws ApiError with status on overview failures', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/activity/missing/overview'), () =>
        HttpResponse.json({ error: 'Activity not found' }, { status: 404 }),
      ),
      http.get(apiUrl('/api/intervals/activity/broken/overview'), () =>
        HttpResponse.json({ error: 'boom' }, { status: 502 }),
      ),
      http.post(apiUrl('/api/run-feedback'), () =>
        HttpResponse.json({ error: 'Invalid input' }, { status: 400 }),
      ),
    );

    await expect(
      makeClient().getCompletedWorkoutOverview('missing'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      makeClient().getCompletedWorkoutOverview('broken'),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      makeClient().saveRunFeedback('activity-123', 'bad', ''),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws ApiError when overview JSON is malformed', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/activity/x/overview'), () =>
        HttpResponse.json({ events: [] }),
      ),
    );

    await expect(makeClient().getCompletedWorkoutOverview('x')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Completed workout overview response had unexpected shape',
    });
  });
});
