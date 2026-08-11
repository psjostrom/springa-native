import { getApiBaseUrl } from '@/auth/config';
import { parseBgPayload } from './bg';
import { parseCalendarEvents } from './calendar';
import { ApiError } from './errors';
import { parsePlannedWorkoutDetail } from './plannedWorkout';
import type {
  BgPayload,
  CalendarEvent,
  PlannedWorkoutDetail,
  PlannedWorkoutReplacementCategory,
  UserSettings,
} from './types';

const DEFAULT_TIMEOUT_MS = 15_000;

export { ApiError };

export type ApiClientOptions = {
  getToken: () => string | null;
  onUnauthorized: () => void;
  baseUrl?: string;
  timeoutMs?: number;
};

export type ApiClient = {
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  getSettings: () => Promise<UserSettings>;
  getCalendar: (oldest: string, newest: string) => Promise<CalendarEvent[]>;
  getBg: () => Promise<BgPayload>;
  getPlannedWorkoutDetail: (eventId: string) => Promise<PlannedWorkoutDetail>;
  moveWorkout: (eventId: string, startDateLocal: string) => Promise<{ ok: true }>;
  replaceWorkout: (
    eventId: string,
    category: PlannedWorkoutReplacementCategory,
  ) => Promise<{ newId: number }>;
  deleteWorkout: (eventId: string) => Promise<{ ok: true }>;
  getPreRunCarbs: (eventId: string) => Promise<{ carbsG: number | null }>;
  savePreRunCarbs: (
    eventId: string,
    carbsG: number | null,
  ) => Promise<{ ok: true }>;
  deletePreRunCarbs: (eventId: string) => Promise<{ ok: true }>;
};

/** Reject null/array/non-objects so callers don't treat garbage as empty settings. */
export function parseUserSettings(data: unknown): UserSettings {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError(200, 'Settings response had unexpected shape');
  }
  return data as UserSettings;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = (options.baseUrl ?? getApiBaseUrl()).replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = options.getToken();
    if (!token) {
      options.onUnauthorized();
      throw new ApiError(401, 'No session token');
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const headers = new Headers(init.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (init.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${normalized}`, {
        ...init,
        headers,
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')
      ) {
        throw new ApiError(0, 'Request timed out. Check your connection and try again.');
      }
      throw new ApiError(
        0,
        'Network request failed. Check your connection and try again.',
      );
    }

    if (res.status === 401) {
      options.onUnauthorized();
      throw new ApiError(401, 'Unauthorized');
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      let code: string | undefined;
      try {
        const body: unknown = await res.json();
        if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
          const record = body as Record<string, unknown>;
          if (typeof record.error === 'string') message = record.error;
          if (typeof record.code === 'string') code = record.code;
        }
      } catch {
        // Preserve status fallback when an error response is not JSON.
      }
      throw new ApiError(res.status, message, code);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(res.status, 'Response was not valid JSON');
    }
  }

  return {
    apiFetch,
    getSettings: async () => parseUserSettings(await apiFetch<unknown>('/api/settings')),
    getCalendar: async (oldest: string, newest: string) => {
      const params = new URLSearchParams({ oldest, newest });
      return parseCalendarEvents(
        await apiFetch<unknown>(`/api/intervals/calendar?${params.toString()}`),
      );
    },
    getBg: async () => parseBgPayload(await apiFetch<unknown>('/api/bg')),
    getPlannedWorkoutDetail: async (eventId: string) =>
      parsePlannedWorkoutDetail(
        await apiFetch<unknown>(
          `/api/intervals/events/${encodeURIComponent(eventId)}`,
        ),
      ),
    moveWorkout: (eventId: string, startDateLocal: string) =>
      apiFetch<{ ok: true }>(
        `/api/intervals/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ start_date_local: startDateLocal }),
        },
      ),
    replaceWorkout: (
      eventId: string,
      category: PlannedWorkoutReplacementCategory,
    ) =>
      apiFetch<{ newId: number }>('/api/intervals/events/replace', {
        method: 'POST',
        body: JSON.stringify({ existingEventId: eventId, category }),
      }),
    deleteWorkout: (eventId: string) =>
      apiFetch<{ ok: true }>(
        `/api/intervals/events/${encodeURIComponent(eventId)}`,
        { method: 'DELETE' },
      ),
    getPreRunCarbs: (eventId: string) =>
      apiFetch<{ carbsG: number | null }>(
        `/api/prerun-carbs?eventId=${encodeURIComponent(eventId)}`,
      ),
    savePreRunCarbs: (eventId: string, carbsG: number | null) =>
      apiFetch<{ ok: true }>('/api/prerun-carbs', {
        method: 'POST',
        body: JSON.stringify({ eventId, carbsG }),
      }),
    deletePreRunCarbs: (eventId: string) =>
      apiFetch<{ ok: true }>(
        `/api/prerun-carbs?eventId=${encodeURIComponent(eventId)}`,
        { method: 'DELETE' },
      ),
  };
}
