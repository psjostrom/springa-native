# Native Planner (milestone 6)

Date: 2026-08-23
Status: approved, ready for implementation
Repo: `springa-native` (Expo SDK 57)
Backend: Springa (`psjostrom/springa`)
Parent: `2026-08-06-native-core-parity-roadmap-design.md`

## Goal

Replace the native Planner placeholder with the useful program-management flow from the Springa PWA while keeping plan generation, validation, provider writes, and training-domain logic on the Springa backend.

A returning runner can:

- See the current schedule and race summary.
- Edit schedule, club-run, effort-metric, and race-goal settings.
- Keep existing future workouts or preview an update after configuration changes.
- Start a new program from race goal, current fitness, schedule, and plan options.
- Review weekly volume and generated workouts before changing external calendars.
- Start or update the program without deleting completed runs or unrelated calendar items.
- See current learned or default fuel rates when diabetes mode is enabled.

## Decision summary

| Topic | Decision |
|---|---|
| Product scope | Planner configuration, new-program preview/start, current-plan update, and fuel-rate summary |
| Deferred | Adapt Upcoming and all AI adaptation UI/contracts |
| Visual source | Current PWA Planner screenshots and source components |
| Domain owner | Springa backend |
| Native state | TanStack Query for server state; component-local controlled drafts |
| Configuration save | One request when Done is pressed; no save-on-change |
| Plan update | Settings save first; runner may keep workouts or preview an update |
| Preview | Server-generated, read-only, and required before start/update apply |
| Cross-device state | Server-owned generated-config snapshot and dirty flag |
| Race distance | 1–100 km |
| Starting distance | 2–42 km |
| Minimum plan | 8 training weeks; warn below 12 |
| Adaptation | Not rendered, fetched, or implemented in milestone 6 |

## Source of truth

### PWA product behavior

- `app/screens/PlannerScreen.tsx`
- `app/components/PlannerSummaryBar.tsx`
- `app/components/PlannerConfigPanel.tsx`
- `app/components/NewProgramWizard.tsx`
- `app/components/PlanConfigConfirmModal.tsx`
- `app/components/WeeklyVolumeChart.tsx`
- `app/components/WorkoutList.tsx`
- `lib/programs.ts`
- `lib/workoutGenerators.ts`
- `lib/applyEffortMetricToEvents.ts`
- `lib/effortMetric.ts`
- `lib/reemitWorkout.ts`
- `lib/workoutEstimationContext.ts`
- `lib/fuelRate.ts`
- `lib/workoutReplacement.ts`
- `lib/intervalsApi.ts`
- `app/api/intervals/events/[id]/route.ts`

Use current `origin/main`, not a stale local branch, when implementation starts.
Backend `origin/main` must include merged PRs #254 and #255 so Planner reuses the
per-run effort-metric contract and corrected persisted-Feel re-emission behavior.

### Supplied visual references

The four supplied screenshots are the visual target for:

1. Expanded current-program configuration.
2. Lower new-program form and Preview plan action.
3. Upper new-program form and current-fitness controls.
4. Collapsed active-program overview and fuel rates.

Reference filenames:

- `cb3d28e9-4bab-41cf-8710-f7adcf1c04c3.jpeg`
- `c27a976a-2c1b-4cfe-8e05-3a1425b3c757.jpeg`
- `9902f545-3674-4b53-b9fe-21fcfa05d3a2.jpeg`
- `85536e8b-64a1-4cef-917a-8f060052089b.jpeg`

Screenshots define hierarchy, density, colors, copy, selected states, and card treatment. Native controls retain platform behavior instead of reproducing browser controls pixel-for-pixel.

### Native foundations to reuse

- `src/app/(tabs)/planner.tsx`
- `src/components/shell/ScreenShell.tsx`
- `src/components/ui/`
- `src/api/client.ts`
- `src/api/plannedWorkout.ts`
- `src/api/types.ts`
- `src/query/keys.ts`
- `src/query/queryClient.ts`
- `src/query/useSettingsQuery.ts`
- `src/query/useCalendarEvents.ts`
- `src/query/usePlannedWorkout.ts`
- `src/test/ExpoUiTestDouble.tsx`
- `src/test/msw/`
- `src/theme/colors.ts`
- `src/theme/tokens.ts`

Do not introduce another network client, global store, form library, chart library, or native module.
Native implementation must start from `origin/main` after PR #16 is merged. Reuse
its exported `EffortMetric`, planned-workout response parsing/client conventions,
query cache publication behavior, finite-width Expo `Host`, and Picker test double.
Planner remains a separate server-owned flow; it must not call the per-workout
mutation once per event from native.

## Scope

### Included

- Planner state loading, retry, and empty states.
- Collapsed current-program summary.
- Controlled configuration editor.
- Run-day and long-run-day rules.
- Club-run day/type rules.
- Effort metric selection.
- Race goal name, distance, and date.
- Start New Program flow.
- Current fitness distance and time selection.
- Starting weekly distance and base-phase option.
- Server validation and compressed-plan warning.
- Server-generated preview with weekly volume and workout list.
- Start/update confirmation and apply.
- Persistent generated-config synchronization state.
- Read-only fuel-rate card in diabetes mode.
- Calendar, Settings, and Planner query invalidation after mutations.
- Android device QA and iOS-safe implementation.

### Explicitly excluded

- Adapt Upcoming.
- AI notes, recovery swaps, adaptation opt-ins, or adaptation sync.
- Direct Intervals.icu, Nightscout, or Google calls from native.
- Native onboarding or credential entry.
- General Settings screen.
- Program history or a `programs` table.
- Offline program editing or queued writes.
- Background generation.
- Month/Week calendar work.
- PWA Planner refactor to consume the new endpoints.

## Product states

Planner has one server-state axis and one local-mode axis.

### Server state

| State | Definition | Visible result |
|---|---|---|
| Loading | Planner query has no data yet | Summary-card skeleton |
| Error | Planner query failed | Error state with Retry |
| No plan | No future owned workouts and race is not a completed program | Summary when config exists, then Start New Program |
| Active | Future Springa-owned workouts exist | Summary, Start New Program, optional dirty banner, fuel rates |
| Complete | Race date is past and no future owned workouts exist | Completion card and primary Start New Program |

### Local mode

| Mode | Entry | Exit |
|---|---|---|
| Collapsed | Default | Edit or Start New Program |
| Edit config | Edit | Done, tab change, or screen unmount |
| New program | Start New Program | Cancel or Preview plan |
| Preview | Successful preview | Edit, Cancel, Start Program, or Update Workouts |

Only one local mode is active. Opening a new-program draft collapses configuration editing. Switching tabs or unmounting before Done discards unsaved local edits.

## UX specification

### Screen shell

- Keep existing `ScreenShell`, `TopBar`, and `NativeTabs` configuration unchanged.
- Planner content begins below `TopBar` and respects native tab safe-area insets.
- Use one vertical scrolling surface.
- Forms use keyboard avoidance and allow focused fields to scroll above the keyboard.
- Default horizontal page padding is `Spacing.lg`.
- Default vertical gap between top-level cards is `Spacing.lg`.

### Collapsed summary

Use a subtle card matching the PWA summary bar.

Display segments in this order:

1. `{count} days/wk`
2. `Long: {weekday}` or `Long: auto`
3. Race name and distance when available
4. Countdown when plan is active

Countdown rules:

- More than zero weeks: green `{n} wks to go`.
- Race week: brand `Race week!`.
- Omit when no active plan or no race date.

Edit is a trailing brand text action. It is hidden during new-program editing or preview.

### Active-plan body

Below summary:

1. Full-width secondary/outlined Start New Program button.
2. Dirty configuration banner when `sync.status === "dirty"`.
3. Fuel-rate card when `fuelRates !== null`.

Dirty banner copy:

- Target-only: `Targets changed` with `Preview update`.
- Structural or unknown: `Schedule changed` with `Preview update`.

There is no Adapt Upcoming card or placeholder.

### Completed-program body

Show a success-tinted card:

- `{raceName} is complete.` when a name exists; otherwise `Your program is complete.`
- `Start a fresh plan for the next race without repeating account setup.`
- Primary Start New Program button.

### Configuration editor

The expanded editor replaces the collapsed summary card. Use brand border and the same visual order as the first screenshot.

All values are copied from server state into one local `PlannerConfig` draft. No request occurs until Done.

Sections:

1. Run Days
2. Long Run Day
3. Club Run
4. Effort Metric
5. Race Goal
6. Done

Run-day rules:

- Monday-to-Sunday visual order.
- Multi-select.
- Do not allow fewer than two selected days.
- Removing the current long-run day selects Sunday if available, otherwise the last selected weekday in Monday-to-Sunday order.
- Removing the current club day disables the club run and clears its type.

Long-run rules:

- Choices are limited to selected run days.
- Hidden when club type is `long`; club day is then the effective long-run day.
- Show `Speed auto-assigned to {weekday}` when at least three usable days exist.
- Speed day uses the existing circular-distance rule from PWA `assignDayRoles` behavior.

Club-run rules:

- Use a native switch.
- Enabling selects the first run day that is not the long-run day; if none exists, use the first run day.
- Type defaults to `varies`.
- Non-long club day cannot equal long-run day.
- `long` makes club day the long-run day.
- Leaving `long` selects the first different run day as long-run day.
- `speed` shows `Springa skips its own speed session`.
- `long` shows `Club day ({weekday}) is the long run day`.

Effort metric:

- Platform-native menu picker.
- Options: pace, heart rate, feel.
- Heart rate is disabled or rejected when valid HR zones are unavailable.

Race goal:

- Race name text input; empty name is allowed.
- Race distance decimal input; 1–100 km.
- Date-only native picker.
- Store and send `YYYY-MM-DD`; do not convert the selected date through UTC.

Done behavior:

1. Validate local draft.
2. Send one `PUT /api/settings` with the complete Planner-owned config fields.
3. Keep editor open with values intact on failure.
4. On success, collapse editor and invalidate Settings and Planner queries.
5. If a future active plan exists, show the update-choice sheet.

Update-choice sheet:

- Title: `Update future workouts to match your new settings?`
- Body: `Your settings are already saved. Updating rewrites future planned workouts; keeping leaves them as they are.`
- Actions: `Keep workouts` and `Preview update`.
- Keep performs no second mutation; dirty state remains server-owned.
- Preview update opens server-generated preview with intent `update`.

### New-program editor

Start New Program opens an inline brand-bordered card. Existing summary remains above it and temporarily reflects the draft as values change. Edit is hidden.

Header:

- `Start new program`
- `Set the next race, check your current fitness, preview the plan, then choose when to replace future workouts.`
- Trailing Cancel text action.

Sections:

#### Race goal

- Race name.
- Race distance, 1–100 km.
- Race date.
- Default name is empty.
- Default distance uses current race distance, then 16 km.
- Default plan length uses current configured length, then 18 weeks, clamped to at least eight.
- Default date is current date plus that plan length.

#### Current fitness

- Four distance choices from server-provided fitness options: 5K, 10K, Half, Marathon.
- Selecting a distance applies its server-provided intermediate default time.
- Show formatted time above a native slider.
- Slider min/max/step come from Planner state; native does not port pace-table calculations.

#### Schedule

- Same run-day, long-run-day, and club-run controls as configuration editor.
- Reuse one feature-local schedule editor component.

#### Plan options

- Effort metric picker.
- Starting distance numeric input, 2–42 km.
- Starting distance defaults to current configured value, then 8 km.
- Include base phase checkbox.
- Checkbox is disabled and false when draft `totalWeeks` is below the server-provided base-phase minimum.
- Helper copy: `Adds easy-only weeks before the build phase.`

#### Feedback and actions

- Field errors render beside their fields.
- Timeline warning renders above actions.
- Bottom actions: Cancel and primary Preview plan.
- Preview plan does not save settings or write any external provider.

### Preview

Preview replaces the editor, not the whole tab.

Header content:

- Summary card reflecting normalized preview config.
- `Reviewing new program preview` or `Reviewing workout update` banner.
- Edit and Cancel actions.
- Weekly volume chart.
- Ready card with workout count and replacement warning.
- Primary Start Program or Update Workouts action.
- Grouped workout list.

The replacement warning states that future Springa workouts are replaced, completed runs are kept, and unrelated calendar items are kept.

Weekly chart:

- Use existing `react-native-svg`; add no chart dependency.
- X-axis is plan week; Y value is total weekly kilometres.
- Brand bars for upcoming weeks.
- Keep chart presentation feature-local.
- Accessibility summary announces plan length, minimum, maximum, and total kilometres.

Workout list:

- Use `LegendList`, already installed, for long previews.
- Group visually by week without nesting a virtualized list inside a `ScrollView`.
- In preview mode the list is the root scrolling surface and the summary/chart/actions are `ListHeaderComponent` content.
- Each row displays date, name, category, distance/duration when available, and fuel rate when available.
- Preview rows are read-only and do not open workout detail routes.

### Fuel-rate card

- Hide when diabetes mode is false.
- Show Easy, Long, and Interval values in that order.
- Learned values use brand text.
- Default values use muted text and append `(default)`.
- Do not expose BG observations, confidence internals, or model payloads.

## Native control choices

Use installed dependencies only:

- `@expo/ui` universal Switch, Picker, Checkbox, and Slider.
- `@react-native-community/datetimepicker` for date selection.
- `react-native-svg` for weekly volume chart.
- `LegendList` for preview workouts.
- React Native `Pressable` for feature-local option chips.

Universal Expo UI components must be wrapped in a finite-width `Host`. Keep the surrounding layout in React Native so the existing design system and test harness remain the owner of cards, typography, spacing, and error states.

Do not add global `OptionChip`, `PlannerCard`, `FormSection`, or chart primitives. Repeated Planner-only structure belongs under `src/components/planner/`.

## Architecture

```text
Planner tab
  -> usePlannerQuery                         GET /api/planner
  -> local controlled PlannerConfig draft
  -> save config                            PUT /api/settings
  -> usePlannerPreviewMutation              POST /api/planner/preview
  -> usePlannerApplyMutation                POST /api/planner/apply

Springa Planner routes
  -> planner service
     -> settings + planner metadata
     -> Intervals credentials/profile/events
     -> cached activity streams -> BG model
     -> programs/workoutGenerators helpers
     -> effort-target re-emission helpers
     -> upload/update Intervals events
     -> Google Calendar sync best-effort
```

### Ownership

| Concern | Owner |
|---|---|
| Form draft and open/closed mode | Native Planner components |
| Server state, preview, apply result | TanStack Query |
| Validation | Springa Planner service; mirrored in native for immediate feedback |
| Program defaults | Springa Planner service |
| Fitness slider bounds | Springa Planner service |
| Plan generation | Springa `workoutGenerators` |
| BG model and fuel rates | Springa backend |
| Generated-config snapshot | Springa database |
| Intervals mutations | Springa backend |
| Google Calendar sync | Springa backend |
| Calendar display | Existing native Calendar query |

No Planner server data is copied into Zustand.

## Backend service design

Add a focused Planner service in Springa. Routes parse/authenticate HTTP; the service owns behavior and can be tested without React.

Responsibilities:

- Normalize complete Planner config.
- Validate config and return field-addressable errors.
- Build current state and new-program defaults.
- Resolve server-owned generation context.
- Generate replace-plan previews.
- Generate target-update previews.
- Canonically hash previews.
- Apply previews after re-generation/hash verification.
- Persist generated-config metadata.
- Report partial provider warnings without pretending full synchronization.

### Shared generation context

The existing replacement flow already resolves settings, athlete profile, HR zones, cached activity streams, BG model, effort metric, and threshold pace. Extract one shared server helper rather than duplicating this resolution for Planner.

The helper accepts an optional validated Planner config override. Replacement uses stored settings; Planner preview/apply uses the request config.

It returns the existing `PlanConfig` shape required by `generatePlan()`.

### PWA compatibility

- Do not rewrite PWA Planner UI in milestone 6.
- Do not change existing client-side PWA behavior unless a shared helper extraction requires an internal import update.
- Existing PWA tests must stay green.
- New routes use `requireAuth()` so Auth.js cookies and native Bearer sessions both work.

## Database model

Add nullable Planner metadata columns to `user_settings`:

```sql
generated_plan_config TEXT NULL,
planner_config_dirty INTEGER NOT NULL DEFAULT 0
```

Requirements:

- Add columns to `SCHEMA_DDL` for new databases.
- Add idempotent existing-database migration using the repository's current schema-upgrade pattern.
- Do not create a `programs` or preview table.
- Do not backfill or infer generated config for existing plans.
- Existing active plans without a snapshot report sync status `unknown`.
- Any successful external write from Planner records a versioned canonical snapshot and clears dirty.
- Any plan-affecting settings write sets dirty.
- When there is no active future plan, dirty metadata is ignored in the UI.

Canonical snapshot contains only generation-affecting values:

- race distance and date
- current ability distance and seconds
- run days
- long-run day
- club day/type
- total weeks
- starting kilometres
- include-base-phase
- effort metric
- schema version

Race name is not included because it does not affect generated workout content.

## API contracts

All endpoints require existing Springa authentication. Native attaches the current Bearer token through `createApiClient`.

### Shared types

```ts
type PlannerWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type EffortMetric = 'pace' | 'hr' | 'feel';
type PlannerClubType = 'long' | 'speed' | 'varies';

type PlannerConfig = {
  raceName: string;
  raceDist: number;
  raceDate: string;
  currentAbilityDist: number;
  currentAbilitySecs: number;
  runDays: PlannerWeekday[];
  longRunDay: PlannerWeekday;
  clubDay: PlannerWeekday | null;
  clubType: PlannerClubType | null;
  totalWeeks: number;
  startKm: number;
  includeBasePhase: boolean;
  effortMetric: EffortMetric;
};

type PlannerFitnessOption = {
  label: '5K' | '10K' | 'Half' | 'Marathon';
  distanceKm: number;
  defaultSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  stepSeconds: number;
};

type PlannerSync = {
  status: 'unknown' | 'synced' | 'dirty';
  dirtyKind: 'target-only' | 'structural' | null;
} | null;

type PlannerFuelRate = {
  gramsPerHour: number;
  source: 'learned' | 'default';
};
```

Weekday wire values retain the existing PWA/JavaScript mapping: Sunday `0`, Monday `1`, through Saturday `6`. UI display order remains Monday through Sunday.

### `GET /api/planner`

Response:

```ts
type PlannerState = {
  currentConfig: PlannerConfig | null;
  newProgramDraft: PlannerConfig;
  fitnessOptions: PlannerFitnessOption[];
  constraints: {
    raceDistanceKm: { min: 1; max: 100 };
    startDistanceKm: { min: 2; max: 42 };
    minimumWeeks: 8;
    minimumNormalWeeks: 10;
    recommendedWeeks: 12;
    basePhaseMinimumWeeks: 11;
  };
  plan: {
    status: 'none' | 'active' | 'complete';
    sync: PlannerSync;
    weeksToGo: number | null;
    futureWorkoutCount: number;
  };
  fuelRates: null | {
    easy: PlannerFuelRate;
    long: PlannerFuelRate;
    interval: PlannerFuelRate;
  };
};
```

Behavior:

- Future plan detection uses only future Intervals WORKOUT events with recognized Springa-owned `external_id` values.
- Completed status requires a past race date and no future owned workouts.
- `currentConfig` is null only when stored settings cannot form a complete Planner config; `newProgramDraft` is always complete.
- Unknown snapshot is never silently treated as synced.
- Fuel rates are null outside diabetes mode.
- Cached activity streams build the BG model server-side.
- Missing/insufficient model data returns existing default fuel values with source `default`.

### `POST /api/planner/preview`

Request:

```ts
type PlannerPreviewRequest = {
  intent: 'start' | 'update';
  config: PlannerConfig;
};
```

Response:

```ts
type PlannerPreview = {
  intent: 'start' | 'update';
  action: 'replace-plan' | 'update-targets';
  config: PlannerConfig;
  previewHash: string;
  warning: null | {
    kind: 'compressed' | 'very-compressed';
    title: string;
    message: string;
  };
  summary: {
    workoutCount: number;
    planWeeks: number;
    firstWorkoutDate: string | null;
    raceDate: string;
    totalDistanceKm: number;
  };
  weeks: Array<{
    week: number;
    startsOn: string;
    distanceKm: number;
    workoutCount: number;
  }>;
  workouts: Array<{
    key: string;
    week: number;
    date: string;
    name: string;
    category: 'easy' | 'long' | 'interval' | 'race' | 'other';
    distanceKm: number | null;
    durationMinutes: number | null;
    fuelRateGPerHour: number | null;
  }>;
};
```

Action selection:

- `start` always yields `replace-plan`.
- `update` where every changed canonical field is `effortMetric`, `currentAbilityDist`, or `currentAbilitySecs` yields `update-targets`.
- `update` with structural drift yields `replace-plan`.
- `update` with unknown generated baseline yields `replace-plan`.
- Race-name-only drift yields no plan drift because race name is not part of the canonical snapshot.
- When target-only and structural fields both changed, structural wins.

Preview performs no database, Intervals, or Google Calendar writes.

`previewHash` is a stable SHA-256 hash over normalized config, action, canonical generated upload/update operations, sorted stale-deletion candidates, and the generated-config baseline. Use Node standard library crypto. A provider or settings change between preview and apply therefore makes the preview stale before any write. No preview persistence or signing service is needed.

### `POST /api/planner/apply`

Request:

```ts
type PlannerApplyRequest = {
  intent: 'start' | 'update';
  config: PlannerConfig;
  previewHash: string;
};
```

The server regenerates the preview. A hash mismatch returns `409 PLAN_PREVIEW_STALE` before writes.

Response:

```ts
type PlannerApplyResponse = {
  action: 'replace-plan' | 'update-targets';
  appliedWorkoutCount: number;
  warnings: Array<{
    code: 'STALE_WORKOUTS_NOT_REMOVED' | 'GOOGLE_CALENDAR_SYNC_FAILED';
    message: string;
  }>;
  state: PlannerState;
};
```

The response never returns Intervals credentials, Google tokens, raw BG model data, or database metadata.

### `PUT /api/settings`

Native configuration Done sends every Planner-owned field in one request. Existing request semantics remain partial for other callers.

When any Planner-owned generation-affecting field is present and changes:

- Validate the merged Planner config.
- Save allowed fields.
- Set `planner_config_dirty = 1`.
- Preserve `generated_plan_config`.

Race-name-only changes do not dirty generated workouts.

Dirty kind is computed from the current canonical config versus `generated_plan_config`; it does not need another database column. Target-only keys are `effortMetric`, `currentAbilityDist`, and `currentAbilitySecs`. Every other canonical key is structural. `planner_config_dirty` records that an unapplied Planner change exists; the snapshot diff classifies it.

## Validation

Server validation is authoritative. Native mirrors rules for immediate feedback.

| Field/rule | Requirement | Error field |
|---|---|---|
| Race distance | Finite, 1–100 km | `raceDist` |
| Race date | Valid `YYYY-MM-DD` | `raceDate` |
| Plan horizon | At least 8 training weeks | `raceDate` |
| Current fitness distance | One supported option | `currentAbilityDist` |
| Current fitness time | Positive and within option range | `currentAbilitySecs` |
| Run days | Unique valid weekdays, minimum 2 | `runDays` |
| Long-run day | Included in run days | `longRunDay` |
| Club day | Included in run days | `clubDay` |
| Club collision | Different from long day unless type is `long` | `clubDay` |
| Club fields | Both null or both valid | `clubType` |
| Total weeks | Derived from race date, minimum 8 | `totalWeeks` |
| Start distance | Finite, 2–42 km | `startKm` |
| Base phase | False when unsupported | `includeBasePhase` |
| Effort metric | pace, hr, or feel | `effortMetric` |
| HR context | HR requires valid server-resolved zones | `effortMetric` |

Normalization:

- Trim race name.
- Sort/deduplicate run days into canonical numeric order for persistence and hashing.
- Recompute `totalWeeks` from race date and user timezone; do not trust client total blindly.
- Force base phase false when unsupported.
- Normalize missing effort metric to `pace` only for legacy stored settings; new request payloads must be explicit.
- Date arithmetic uses stored user timezone and Monday-start calendar weeks.

Compressed-plan warning follows current PWA thresholds returned by Planner state:

- 8–9 weeks: very compressed.
- 10–11 weeks: compressed.
- 12 or more: no warning.

## Apply behavior and consistency

### Common pre-write phase

1. Authenticate.
2. Parse strict request shape.
3. Normalize and validate config.
4. Resolve credentials, athlete profile, HR zones, cached streams, BG model, and threshold pace.
5. Rebuild canonical preview action and payload.
6. Compare preview hash.
7. Snapshot old settings and Planner metadata.

No write occurs before these steps pass.

### Replace-plan action

1. Save new settings and mark dirty.
2. Upsert generated future events through the existing owned `external_id` path.
3. Remove stale future Springa-owned workouts only.
4. Persist generated config snapshot and clear dirty.
5. Attempt Google Calendar bulk sync.

Completed activities, non-workout events, and workout events without recognized Springa-owned external IDs remain untouched.

### Update-targets action

1. Save new settings and mark dirty.
2. Recompute target patches from future Springa-owned workouts using existing effort re-emission helpers.
3. Attempt every patch with bounded concurrency.
4. Persist generated config snapshot and clear dirty only when every target patch succeeds.
5. Attempt corresponding Google Calendar updates best-effort.

No event dates, external IDs, or plan structure change in target-only mode.

### Failure compensation

- Bulk upload failure: restore old settings and Planner metadata when possible; return upstream error and leave state dirty/unknown.
- Partial target update: return applied count and named failures, leave dirty, and allow retry.
- Partial stale cleanup: return successful apply with `STALE_WORKOUTS_NOT_REMOVED`, leave dirty, and allow retry.
- Generated metadata finalization failure after provider success: return `PLANNER_STATE_FINALIZE_FAILED`, mark dirty best-effort, and invalidate native Planner/Calendar state.
- Google Calendar failure: do not roll back Intervals; return warning.
- Never auto-retry an apply mutation. User controls retry.

Repeated apply is safe because generated events use stable owned external IDs and Intervals upload uses upsert. Do not add an idempotency table.

## Error contract

Error responses keep existing `{ error, code }` shape and may add `fields`.

```ts
type PlannerErrorResponse = {
  error: string;
  code:
    | 'PLANNER_CONFIG_INVALID'
    | 'INTERVALS_NOT_CONNECTED'
    | 'HR_ZONES_REQUIRED'
    | 'PLAN_PREVIEW_STALE'
    | 'INTERVALS_UPSTREAM_ERROR'
    | 'PLANNER_APPLY_PARTIAL'
    | 'PLANNER_STATE_FINALIZE_FAILED';
  fields?: Partial<Record<keyof PlannerConfig, string>>;
  appliedWorkoutCount?: number;
  failures?: Array<{ id: string; name: string; error: string }>;
};
```

Status mapping:

| Status | Code |
|---|---|
| 400 | `PLANNER_CONFIG_INVALID` |
| 409 | `INTERVALS_NOT_CONNECTED` |
| 409 | `HR_ZONES_REQUIRED` |
| 409 | `PLAN_PREVIEW_STALE` |
| 502 | `INTERVALS_UPSTREAM_ERROR` |
| 502 | `PLANNER_APPLY_PARTIAL` when no safe success response is possible |
| 500 | `PLANNER_STATE_FINALIZE_FAILED` |
| 401 | Existing unauthorized response and native sign-out behavior |

Native behavior:

- Loading failure: full Planner `StateView` with Retry.
- Config save failure: keep editor and values; show field errors or top-level error.
- Preview failure: keep editor and values.
- Stale preview: keep preview, show message, and offer Preview again.
- Apply failure: keep preview and allow explicit retry.
- Partial apply or finalization failure: also invalidate Planner and Calendar because provider state may have changed.
- Warning response: show success state plus warning; refresh Planner and Calendar.
- Disable duplicate action presses while mutation is pending.

## Native data design

### API parsing

Add strict Planner parsers under `src/api/`. Follow planned-workout parser behavior:

- Reject null, arrays, missing required objects, invalid enums, non-finite numbers, invalid weekdays, malformed dates, and invalid nested rows.
- Do not cast unknown JSON directly to Planner types.
- Optional display metrics may be null; required state may not silently degrade.
- Malformed Planner response throws `ApiError(200, "Planner response had unexpected shape")`.

### Query keys

```ts
planner: (identity: string) => ['planner', identity] as const,
```

Preview and apply are mutations, not persisted queries.

### Query behavior

- Planner query enabled only for a signed-in session.
- Default stale time: existing Query default is sufficient.
- No polling.
- Refetch when Planner tab regains focus only if query is stale; do not add custom focus infrastructure solely for Planner.
- Config save success invalidates Planner and Settings.
- Apply success invalidates Planner, Settings, and Calendar.
- Warning apply responses still invalidate all three.
- Partial apply and finalization errors invalidate Planner and Calendar before showing retry state.
- Mutation errors do not discard existing Planner state.

### Local state

Keep these values in `PlannerScreen` or a focused child hook:

- mode
- config draft
- preview result
- validation errors
- update-choice presentation

Do not put them in Zustand, SecureStore, AsyncStorage, or Query cache.

When race date changes, update draft `totalWeeks` with a feature-local date-only helper so minimum-week feedback and base-phase availability respond immediately. Server normalization remains authoritative and may return a corrected value.

## Native component design

Suggested feature structure:

```text
src/components/planner/
  PlannerContent.tsx
  PlannerSummaryCard.tsx
  PlannerConfigEditor.tsx
  PlannerScheduleEditor.tsx
  NewProgramEditor.tsx
  PlannerPreview.tsx
  PlannerWeeklyVolumeChart.tsx
  PlannerWorkoutPreviewList.tsx
  PlannerFuelRatesCard.tsx
  PlannerUpdateChoiceSheet.tsx
  PlannerOptionChip.tsx
```

Responsibilities:

- `PlannerContent`: server-state branching and local-mode ownership.
- `PlannerSummaryCard`: pure current/draft summary presentation.
- `PlannerConfigEditor`: current-program controlled form and Done.
- `PlannerScheduleEditor`: shared schedule/club controls for both forms.
- `NewProgramEditor`: new-program-only race, fitness, and plan options.
- `PlannerPreview`: preview header, chart, action state, and list assembly.
- `PlannerWeeklyVolumeChart`: accessible SVG chart.
- `PlannerWorkoutPreviewList`: LegendList row/group presentation.
- `PlannerFuelRatesCard`: pure fuel summary.
- `PlannerUpdateChoiceSheet`: controlled confirmation using existing `AppBottomSheet` only if sheet behavior is needed; no imperative ref.
- `PlannerOptionChip`: feature-local selected/unselected pressable used repeatedly across Planner.

This is a responsibility map, not a requirement to create every file. Combine components when the implementation remains readable and tests do not need separate seams.

Reuse existing global primitives:

- `AppText`
- `Button`
- `Card`
- `Section`
- `StateView`
- `TextField`
- `AppBottomSheet`

Extend a global primitive only when the required behavior is general and repeated outside Planner.

## Accessibility

- Every option chip exposes role `button`, selected state, and a complete label.
- Run-day group has an accessible label and selected-day summary.
- Club switch exposes label and checked state.
- Slider exposes current formatted time, minimum, maximum, and increment behavior.
- Picker exposes selected effort metric.
- Date control announces selected date in locale-readable form while keeping wire value date-only.
- Validation messages use alert semantics and identify their field.
- Loading buttons expose busy and disabled states.
- Chart has one textual accessibility summary and hides decorative SVG elements.
- Touch targets are at least `MinTouchTarget`.
- Layout supports font scaling without clipping or horizontal scrolling of body content.
- Tab bar remains platform NativeTabs.

## Testing strategy

### Springa backend

Prefer integration tests around service/routes and real test database. Mock only provider boundaries, clock, and AI-free external processes.

Unit coverage:

- Planner normalization.
- 1–100 km race validation.
- 2–42 km starting-distance validation.
- Schedule/club constraints.
- 8-week minimum and compressed warnings.
- Canonical generated config.
- Dirty classification.
- Stable preview hash.
- Weekly preview projection.

Route/service integration coverage:

- Cookie and Bearer auth.
- State: no plan, active, complete, unknown, synced, dirty target-only, dirty structural.
- Fuel: hidden, learned, and default.
- Preview performs no writes.
- Start preview and apply.
- Structural update preview and apply.
- Target-only update patches existing events without moving them.
- Target-only update uses the same effort detection, HR eligibility, and
  re-emission helpers as single-workout effort editing.
- Persisted unlabeled Feel steps convert back to pace and HR without losing an
  active-step prescription.
- Preview hash mismatch performs no writes.
- Only owned future workouts are removed.
- Completed and unrelated items remain.
- Upload failure rollback.
- Partial cleanup warning and dirty state.
- Partial target update and retryable dirty state.
- Google failure warning after Intervals success.
- Existing PWA Planner and workout-generation suites stay green.

### Springa Native

Parser coverage:

- Valid Planner state, preview, and apply responses.
- Every enum and nested collection.
- Malformed objects and non-finite numbers.
- Null display metrics where allowed.

MSW/RNTL integration coverage:

- Loading, load error, and Retry.
- Active collapsed summary.
- Completed program.
- Configuration editor initializes from server state.
- Editing causes no request before Done.
- Run/long/club dependent-selection behavior.
- Done sends one complete config request.
- Save error preserves values.
- Active-plan Done presents Keep/Preview update.
- Keep closes without apply and dirty banner remains after refetch.
- New-program defaults.
- Fitness distance updates slider bounds/default.
- Local validation.
- Server field errors.
- Compressed warning.
- Preview renders chart summary and workouts.
- Edit returns to draft.
- Cancel discards flow.
- Apply success and query invalidation.
- Stale preview and re-preview.
- Apply failure preserves preview.
- Warning success is visible.
- Fuel rates hidden/default/learned.
- No Adapt Upcoming text or request.
- Existing per-run effort editing, authoritative detail replacement, and
  planned-workout/calendar cache publication remain green.

Assert visible behavior and request/response contracts, not internal component state or mock call counts.

### Device QA

Android primary, using dev client and existing QA Bearer login:

1. Capture collapsed active-plan state.
2. Capture expanded configuration.
3. Capture upper new-program form.
4. Capture lower new-program form.
5. Compare each at matching viewport against supplied source screenshot.
6. Fix visible differences in spacing, text weight, borders, radii, selected states, clipping, and bottom-tab overlap.
7. Exercise keyboard, scroll-to-field, date picker, switch, picker, checkbox, slider, preview list, and system back.
8. Exercise offline/timeout and server validation without clearing app data.
9. Check TalkBack focus order, labels, selected states, and busy states.

Run `npx tsc --noEmit`, `npm run lint`, and `npm test` before completion. Keep iOS APIs valid; run an iOS smoke when a simulator is available.

## Delivery order

### Phase A — Springa backend prerequisite

Implement and validate first in the Springa repository:

- Database metadata columns/migration.
- Shared server plan-context resolver.
- Planner service.
- State, preview, and apply routes.
- Settings dirty integration.
- Provider-warning behavior.
- Backend tests.

Backend contract must land or be available at a stable commit before native integration. Native must not temporarily reproduce generation logic while waiting.

### Phase B — Springa Native

After backend contract is fixed:

- Wait for PR #16 to merge, refresh `origin/main`, and verify its effort type,
  planned-workout mutation/parser behavior, Host, and Picker test double are present.
- Types and strict parsers.
- API client methods.
- Query and mutation hooks.
- MSW handlers.
- Planner UI states and controls.
- Integration tests.
- Android visual/device QA.

### Phase C — completion verification

- Run narrow tests first in each repository.
- Run full repository checks.
- Perform Android end-to-end against the real local Springa backend.
- Verify no native call reaches Intervals, Nightscout, or Google directly.
- Verify Adapt Upcoming remains absent.

## Acceptance criteria

- Planner placeholder is gone.
- Active runner sees accurate summary, countdown, and fuel rates.
- Configuration changes remain local until Done.
- Done saves once and surfaces Keep/Preview update for active plans.
- Dirty state persists across app restart and devices.
- New program supports 1–100 km race distance and 2–42 km starting distance.
- Eight-week plans are allowed with correct warnings below twelve weeks.
- Preview makes no writes.
- Apply uses the exact reviewed preview or returns stale-preview error.
- Plan generation and all provider writes occur only on Springa backend.
- Only future Springa-owned workouts may be replaced.
- Completed and unrelated calendar items survive every path.
- Target-only updates preserve event dates and plan structure.
- Google Calendar failure does not undo a successful Intervals update.
- Native errors preserve drafts/previews and remain retryable.
- UI matches supplied PWA hierarchy and native Springa design tokens.
- Native controls remain platform-appropriate and accessible.
- No Adapt Upcoming UI, API request, or client code ships in milestone 6.

## References

- Parent roadmap: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`
- Native design system: `docs/superpowers/specs/2026-08-12-native-design-system-design.md`
- Expo UI SDK 57: <https://docs.expo.dev/versions/v57.0.0/sdk/ui/>
- Expo UI universal controls: <https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/>
- PWA Planner redesign: `docs/specs/2026-04-07-planner-redesign.md` in Springa
- PWA new-program plan: `docs/specs/2026-06-24-new-program-plan.md` in Springa
