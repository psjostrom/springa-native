# Single-workout effort metric

Date: 2026-08-23
Status: approved for implementation
Repos: `springa` API, `springa-native` client

## Goal

Let a user change one planned run between pace, heart rate, and feel from its
native detail view. This changes that event's prescribed workout only; it does
not change the user's default metric or other runs.

## Ownership and boundaries

- Springa API owns eligibility, heart-rate availability, metric resolution,
  workout re-emission, provider writes, and the detail response.
- Native sends the selected intent and renders the returned detail. It never
  generates workout names or descriptions and never calls Intervals.icu or
  Google Calendar directly.
- TanStack Query remains the only owner of server data. The PWA cookie API and
  its Google Calendar synchronization remain unchanged; this Bearer mutation
  is native-only and does not invoke that synchronization.

## API contract

`GET /api/intervals/events/:id` and a successful effort-metric mutation return
the same `PlannedWorkoutDetail` JSON shape. The existing fields remain
unchanged; two required top-level fields are added:

```ts
type EffortMetric = 'pace' | 'hr' | 'feel';

type PlannedWorkoutDetail = {
  effortMetric: EffortMetric;
  heartRateMetricAvailable: boolean;
  event: {
    id: string;
    intervalsEventId: number;
    startDateLocal: string;
    name: string;
    category: 'easy' | 'long' | 'interval' | 'race' | 'other';
    description: string;
  };
  replacementCategory: 'easy' | 'quality' | 'long' | 'club' | null;
  structure: {
    sections: {
      name: string;
      repeats: number | null;
      steps: {
        label: string | null;
        duration: string;
        zone: 'z1' | 'z2' | 'z3' | 'z4' | 'z5';
        detail: string;
      }[];
    }[];
    timeline: {
      durationMinutes: number;
      intensityPercent: number;
      zone: 'z1' | 'z2' | 'z3' | 'z4' | 'z5';
      estimated: boolean;
    }[];
  };
  metrics: {
    duration: { minutes: number; estimated: boolean } | null;
    distance: { km: number; estimated: boolean } | null;
    fuelRateGPerHour: number | null;
    prescribedCarbsG: number | null;
  };
  preRunCarbsG: number | null;
  clothing:
    | {
        status: 'available';
        recommendation: {
          upper: string[];
          lower: string[];
          accessories: string[];
          weather: {
            temp: number;
            feelsLike: number;
            windSpeed: number;
            precipitation: number;
            isRain: boolean;
            isSnow: boolean;
          };
        };
      }
    | {
        status: 'unavailable';
        reason: 'outside-window' | 'forecast-unavailable';
      };
};
```

`effortMetric` is resolved from persisted event content, not copied from global
settings. `heartRateMetricAvailable` is computed from current live
profile/settings data: positive finite LTHR and exactly five finite HR zones.
An existing event may still report `effortMetric: 'hr'` with availability
`false`, so the client can move it away from HR.

Request:

```http
PUT /api/intervals/events/event-123
Authorization: Bearer <session-token>
Content-Type: application/json

{"effortMetric":"hr"}
```

The effort branch accepts exactly `{ effortMetric: EffortMetric }` and returns
the complete updated `PlannedWorkoutDetail` body above. The existing move
branch (`{ "start_date_local": "2026-08-13T12:00:00" }`) keeps its
`{ "ok": true }` response; mixed or unknown fields are rejected. Native
verifies that response `event.id` matches the requested event before committing
it to cache.

## Eligibility and validation

The API is authoritative. It accepts the effort branch only for a planned,
non-race run whose local calendar day is today or later in the user's timezone.
Completed, missed/past, race, paired, non-run, and otherwise unsupported
events return `422 UNSUPPORTED_EVENT`. Invalid JSON, invalid metric values, or
mixed/unknown request fields return `400 INVALID_INPUT`. Selecting HR without
current LTHR and five valid zones returns `422 PLAN_SETTINGS_REQUIRED` with a
heart-rate-unavailable message. `404 EVENT_NOT_FOUND`, `401` auth failures, and
`502 UPSTREAM_ERROR` retain the existing API error envelope:
`{ "error": string, "code": string }`.

The server validates and renders the candidate name, description, structure,
and metrics with existing workout re-emission logic before the provider write.
It then performs one provider update and returns the detail built from that
same result; native does not issue a second detail fetch. The mutation is
idempotent for retries with the same metric. Provider failures return the
existing upstream error shape with HTTP 502.

## Native picker

Show the control in the planned workout detail header, beside date/status and
before the workout metrics, matching the PWA's compact header location. Show it
only when the event is planned and eligible by local date; hide it for
completed, missed/past, and race events. The server still re-checks every
mutation.

Use the SDK 57 universal Expo UI picker:

```tsx
import { Host, Picker } from '@expo/ui';

<Host matchContents>
  <Picker
    appearance="menu"
    selectedValue={detail.effortMetric}
    enabled={editable && !metricMutation.isPending}
    onValueChange={handleMetricChange}
    testID="effort-metric-picker"
  >
    <Picker.Item label="By Pace" value="pace" />
    {(detail.heartRateMetricAvailable || detail.effortMetric === 'hr') && (
      <Picker.Item label="By Heart Rate" value="hr" />
    )}
    <Picker.Item label="By Feel" value="feel" />
  </Picker>
</Host>
```

`Host` and `Picker` come from `@expo/ui`; `appearance="menu"` gives the
platform popup/dropdown. The universal SDK 57 picker does not document a
per-item disabled prop. Therefore omit the HR item when
`heartRateMetricAvailable` is false, unless it is the current value; retain a
current HR item so `selectedValue` always has an option and let the user switch
away. Show helper text explaining that LTHR and five HR zones are required.
Give the surrounding header container an explicit available width so Android
does not shrink-wrap the hosted control. Do not add a picker dependency or
silently fall back to the community picker.

While pending, keep the old detail visible, disable the picker and other
workout actions, and show a platform-appropriate pending indicator. A
successful response replaces heading, structure, and metrics from one detail
object. An error leaves the old detail intact, shows an inline retryable alert,
and re-enables the control.

## Cache and failure flow

- Do not optimistically rewrite the event name or description.
- On success, set `plannedWorkout(identity, eventId)` to the returned detail and
  update every cached `calendar(identity)` page using the returned event. Do
  not perform a follow-up detail request.
- On failure, do not alter either cache. Preserve the old screen and error
  state; retry sends the same one-field request.
- An uncertain timeout may have reached the provider. Retrying the same metric
  is safe; a later normal detail/calendar fetch reconciles server state.

## Tests

Web integration coverage must verify each metric, exact request validation,
past/completed/race/paired rejection, HR-unavailable rejection, full response
fields, one provider update, and no global-setting or Google-sync mutation.
Existing re-emission tests continue to cover name/description conversion.

Native MSW/integration coverage must verify detail parsing of both new fields,
the exact `PUT` body, picker placement/options and HR availability behavior,
pending action locking, atomic detail/calendar cache updates, retryable errors,
and absence of the picker for completed, missed/past, and race events. Use the
network boundary; do not mock `fetch` or assert implementation call counts.

## Explicit non-goals

The PWA remains on its current cookie request with generated `name` and
`description`, including its existing Google Calendar behavior. No global
effort-metric setting, completed-workout edit, race edit, new provider client,
or new native persistence is part of this change.
