import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { makeTestApiClient } from '@/test/TestAppProviders';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';

const detail = defaultPlannedWorkoutDetail();
const preview = {
  date: '2026-08-13', category: 'quality', suggestedCategory: 'easy', previewHash: 'a'.repeat(64),
  workout: {
    name: detail.event.name, description: detail.event.description,
    startDateLocal: detail.event.startDateLocal, structure: detail.structure, metrics: detail.metrics,
  },
};

describe('single workout API', () => {
  it('sends date and category with Bearer auth and parses the preview', async () => {
    server.use(http.get(apiUrl('/api/intervals/events/preview'), ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer test-token');
      expect(new URL(request.url).searchParams.get('date')).toBe('2026-08-13');
      expect(new URL(request.url).searchParams.get('category')).toBe('quality');
      return HttpResponse.json(preview);
    }));
    await expect(makeTestApiClient().previewWorkout('2026-08-13', 'quality')).resolves.toEqual(preview);
  });

  it.each([
    { ...preview, date: '2026-02-30' },
    { ...preview, category: 'race' },
    { ...preview, previewHash: '' },
    { ...preview, workout: { ...preview.workout, structure: {} } },
    { ...preview, workout: { ...preview.workout, metrics: { ...preview.workout.metrics, duration: { minutes: '35', estimated: false } } } },
    { ...preview, workout: { ...preview.workout, startDateLocal: '2026-08-14T12:00:00' } },
  ])('rejects malformed preview %#', async (response) => {
    server.use(http.get(apiUrl('/api/intervals/events/preview'), () => HttpResponse.json(response)));
    await expect(makeTestApiClient().previewWorkout('2026-08-13', 'quality')).rejects.toThrow();
  });

  it('rejects a preview for the wrong date or category', async () => {
    server.use(http.get(apiUrl('/api/intervals/events/preview'), () => HttpResponse.json(preview)));
    await expect(makeTestApiClient().previewWorkout('2026-08-14', 'quality')).rejects.toThrow();
    await expect(makeTestApiClient().previewWorkout('2026-08-13', 'long')).rejects.toThrow();
  });

  it('saves intent and preview hash without client-generated workout data', async () => {
    const input = { date: '2026-08-13', category: 'quality' as const, previewHash: preview.previewHash };
    server.use(http.post(apiUrl('/api/intervals/events'), async ({ request }) => {
      expect(await request.json()).toEqual(input);
      return HttpResponse.json({ newId: 42 });
    }));
    await expect(makeTestApiClient().createWorkout(input)).resolves.toEqual({ newId: 42 });
  });

  it.each([{}, { newId: 0 }, { newId: '42' }])('rejects an invalid creation receipt %#', async (response) => {
    server.use(http.post(apiUrl('/api/intervals/events'), () => HttpResponse.json(response)));
    await expect(makeTestApiClient().createWorkout({ date: '2026-08-13', category: 'easy', previewHash: preview.previewHash })).rejects.toThrow();
  });
});
