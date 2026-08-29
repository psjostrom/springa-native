import { getApiBaseUrl } from '@/auth/config';
import { parseBgPayload } from './bg';
import { parseCalendarEvents } from './calendar';
import { parseCompletedWorkoutOverview } from './completedWorkoutOverview';
import { ApiError } from './errors';
import { parsePlannedWorkoutDetail } from './plannedWorkout';
import {
  parsePlannerApplyResponse,
  parsePlannerPreview,
  parsePlannerState,
} from './planner';
import type { ApiErrorDetails } from './errors';
import type {
  BgPayload,
  CalendarEvent,
  CompletedWorkoutOverview,
  EffortMetric,
  PlannedWorkoutDetail,
  PlannedWorkoutReplacementCategory,
  PlannerApplyRequest,
  PlannerApplyResponse,
  PlannerConfig,
  PlannerPreview,
  PlannerPreviewRequest,
  PlannerState,
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
  getPlanner: () => Promise<PlannerState>;
  savePlannerConfig: (config: PlannerConfig) => Promise<{ ok: true }>;
  previewPlanner: (request: PlannerPreviewRequest) => Promise<PlannerPreview>;
  applyPlanner: (request: PlannerApplyRequest) => Promise<PlannerApplyResponse>;
  getCalendar: (oldest: string, newest: string) => Promise<CalendarEvent[]>;
  getBg: () => Promise<BgPayload>;
  getPlannedWorkoutDetail: (eventId: string) => Promise<PlannedWorkoutDetail>;
  changeWorkoutEffortMetric: (
    eventId: string,
    effortMetric: EffortMetric,
  ) => Promise<PlannedWorkoutDetail>;
  moveWorkout: (eventId: string, startDateLocal: string) => Promise<{ ok: true }>;
  replaceWorkout: (
    eventId: string,
    category: PlannedWorkoutReplacementCategory,
  ) => Promise<{ newId: number }>;
  deleteWorkout: (eventId: string) => Promise<{ ok: true }>;
  savePreRunCarbs: (
    eventId: string,
    carbsG: number | null,
  ) => Promise<{ ok: true }>;
  getCompletedWorkoutOverview: (
    activityId: string,
  ) => Promise<CompletedWorkoutOverview>;
  updateActivityCarbs: (
    activityId: string,
    carbsG: number,
  ) => Promise<{ ok: true }>;
  updateActivityPreRunCarbs: (
    activityId: string,
    carbsG: number | null,
  ) => Promise<{ ok: true }>;
  deletePreRunCarbs: (eventId: number) => Promise<void>;
  saveRunFeedback: (
    activityId: string,
    rating: 'good' | 'bad',
    comment: string,
  ) => Promise<{ ok: true }>;
};

/** Reject null/array/non-objects so callers don't treat garbage as empty settings. */
export function parseUserSettings(data: unknown): UserSettings {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError(200, 'Settings response had unexpected shape');
  }
  return data as UserSettings;
}

function parseOk(data: unknown): { ok: true } {
  if (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data).length === 1 &&
    (data as Record<string, unknown>).ok === true
  ) {
    return { ok: true };
  }
  throw new ApiError(200, 'Planner response had unexpected shape');
}

function parseApiErrorDetails(value: unknown): ApiErrorDetails | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const details: ApiErrorDetails = {};
  if (
    record.fields !== null &&
    typeof record.fields === 'object' &&
    !Array.isArray(record.fields)
  ) {
    const fields = Object.entries(record.fields as Record<string, unknown>)
      .filter(([, field]) => typeof field === 'string')
      .reduce<Record<string, string>>((result, [key, field]) => {
        result[key] = field as string;
        return result;
      }, {});
    if (Object.keys(fields).length > 0) details.fields = fields;
  }
  if (
    typeof record.appliedWorkoutCount === 'number' &&
    Number.isSafeInteger(record.appliedWorkoutCount) &&
    record.appliedWorkoutCount >= 0
  ) {
    details.appliedWorkoutCount = record.appliedWorkoutCount;
  }
  if (Array.isArray(record.failures)) {
    const failures = record.failures.filter(
      (failure): failure is { id: string; name: string; error: string } =>
        failure !== null &&
        typeof failure === 'object' &&
        !Array.isArray(failure) &&
        typeof (failure as Record<string, unknown>).id === 'string' &&
        typeof (failure as Record<string, unknown>).name === 'string' &&
        typeof (failure as Record<string, unknown>).error === 'string',
    );
    if (failures.length > 0) details.failures = failures;
  }
  return Object.keys(details).length > 0 ? details : undefined;
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
    const start = Date.now();
    console.log(`[API] --> ${init.method ?? 'GET'} ${normalized}`);
    try {
      res = await fetch(`${baseUrl}${normalized}`, {
        ...init,
        headers,
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
      console.log(
        `[API] <-- ${init.method ?? 'GET'} ${normalized} ${res.status} (${Date.now() - start}ms)`,
      );
    } catch (err) {
      console.log(
        `[API] ERR ${init.method ?? 'GET'} ${normalized} in ${Date.now() - start}ms:`,
        err,
      );
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
      let details: ApiErrorDetails | undefined;
      try {
        const body: unknown = await res.json();
        if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
          const record = body as Record<string, unknown>;
          if (typeof record.error === 'string') message = record.error;
          if (typeof record.code === 'string') code = record.code;
          details = parseApiErrorDetails(record);
        }
      } catch {
        // Preserve status fallback when an error response is not JSON.
      }
      throw new ApiError(res.status, message, code, details);
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
    getPlanner: async () => parsePlannerState(await apiFetch<unknown>('/api/planner')),
    savePlannerConfig: async (config: PlannerConfig) =>
      parseOk(await apiFetch<unknown>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(config),
      })),
    previewPlanner: async (request: PlannerPreviewRequest) =>
      parsePlannerPreview(await apiFetch<unknown>('/api/planner/preview', {
        method: 'POST',
        body: JSON.stringify(request),
      })),
    applyPlanner: async (request: PlannerApplyRequest) =>
      parsePlannerApplyResponse(await apiFetch<unknown>('/api/planner/apply', {
        method: 'POST',
        body: JSON.stringify(request),
      })),
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
    changeWorkoutEffortMetric: async (eventId: string, effortMetric: EffortMetric) => {
      const detail = parsePlannedWorkoutDetail(
        await apiFetch<unknown>(
          `/api/intervals/events/${encodeURIComponent(eventId)}`,
          {
            method: 'PUT',
            body: JSON.stringify({ effortMetric }),
          },
        ),
      );
      if (detail.event.id !== eventId) {
        throw new ApiError(
          200,
          'Effort metric response did not match requested workout',
        );
      }
      return detail;
    },
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
    savePreRunCarbs: (eventId: string, carbsG: number | null) =>
      apiFetch<{ ok: true }>('/api/prerun-carbs', {
        method: 'POST',
        body: JSON.stringify({ eventId, carbsG }),
      }),
    getCompletedWorkoutOverview: async (activityId: string) =>
      parseCompletedWorkoutOverview(
        await apiFetch<unknown>(
          `/api/intervals/activity/${encodeURIComponent(activityId)}/overview`,
        ),
      ),
    updateActivityCarbs: (activityId: string, carbsG: number) =>
      apiFetch<{ ok: true }>(
        `/api/intervals/activity/${encodeURIComponent(activityId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ carbs_ingested: carbsG }),
        },
      ),
    updateActivityPreRunCarbs: (activityId: string, carbsG: number | null) =>
      apiFetch<{ ok: true }>(
        `/api/intervals/activity/${encodeURIComponent(activityId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ PreRunCarbsG: carbsG ?? 0 }),
        },
      ),
    deletePreRunCarbs: async (eventId: number) => {
      await apiFetch<unknown>(
        `/api/prerun-carbs?eventId=${encodeURIComponent(String(eventId))}`,
        { method: 'DELETE' },
      );
    },
    saveRunFeedback: (
      activityId: string,
      rating: 'good' | 'bad',
      comment: string,
    ) =>
      apiFetch<{ ok: true }>('/api/run-feedback', {
        method: 'POST',
        body: JSON.stringify({ activityId, rating, comment }),
      }),
  };
}
