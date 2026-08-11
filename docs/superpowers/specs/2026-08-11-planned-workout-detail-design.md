# Planned workout detail (native M4)

Date: 2026-08-11
Status: approved for implementation
Repo: `springa-native`
Backend contract: Springa PR #246

## Goal

Replace the planned-workout sheet placeholder with a usable native detail flow. The
screen reads server-derived workout data and lets the user save pre-run carbs,
move, replace, or delete a planned workout. The native flow ends with Android
E2E validation through Argent.

M5 completed Overview remains out of scope.

## Decisions

| Area | Decision |
| --- | --- |
| Data owner | Springa API remains source of truth for detail and mutations |
| Client path | Existing `ApiClient` and TanStack Query; no new store or networking layer |
| Detail identity | Existing calendar event id, sent as canonical `event-{number}` |
| Route | Existing `/workout/[id]` formSheet and planned branch |
| Move input | Cross-platform local ISO date/time `TextInput`; no new native date-picker dependency |
| Replace | Inline native choices: `easy`, `quality`, `long`, `club` |
| Delete | Native confirmation alert, then server mutation |
| Refresh | Successful mutation invalidates detail and Calendar queries; no optimistic workout data |
| QA | Android Argent flow after automated verification |

## API client and query flow

Extend the existing typed client with:

- `getPlannedWorkoutDetail(eventId)` → `GET /api/intervals/events/{id}`
- `moveWorkout(eventId, startDateLocal)` → `PUT /api/intervals/events/{id}`
- `replaceWorkout(eventId, category)` → `POST /api/intervals/events/replace`
- `deleteWorkout(eventId)` → `DELETE /api/intervals/events/{id}`
- `getPreRunCarbs`, `savePreRunCarbs`, and `deletePreRunCarbs` for the existing carb routes

Types mirror the merged backend contract: event identity, parsed sections and
steps, timeline segments, estimated duration/distance, fuel rate, prescribed
carbs, pre-run carbs, and clothing availability/recommendation. Parsers reject
invalid top-level shapes at the HTTP boundary.

The planned sheet uses a detail query keyed by signed-in identity and event id.
The detail response already contains `preRunCarbsG`, so carb editing refreshes
the detail query after success. Mutation hooks invalidate both the detail query
and the Calendar query for the current user. The sheet stays open after move or
replace so the refreshed server result is visible; successful delete closes it.

## UI flow

`WorkoutSheetContent` passes planned events to `PlannedWorkoutSheet`.

While loading, the planned body shows a loading state. A failed request shows a
retry action and keeps the existing sheet chrome. A successful response renders:

1. Metric summary: duration, distance, fuel rate, and prescribed total carbs;
2. Workout structure sections with repeats, step labels, durations, zones, and details;
3. A compact timeline using server segment durations and HR/pace zones;
4. Pre-run carbs input with save and clear actions;
5. Clothing recommendation or the server's unavailable reason;
6. Move, replace, and delete actions.

All displayed derived values come from the response. Native only formats values
for readability and validates the carb input before sending it.

Move accepts a timezone-naive `YYYY-MM-DDTHH:mm:ss` value. The input displays a
short format hint and sends the exact local value to the server; server validation
remains authoritative. Replace sends only the selected category and lets Springa
generate the workout. Delete confirms before calling the server and preserves
local carb data when the upstream delete fails because the backend owns cleanup
ordering.

Mutation failures remain in the sheet with an actionable message. In-flight
buttons are disabled to prevent duplicate requests.

## Testing

Tests intercept HTTP with MSW and exercise rendered behavior with RNTL. No fetch
mocks or mutation call-count assertions.

Coverage:

- detail success with sections, timeline, metrics, carbs, and clothing;
- loading, malformed/empty derived fields, unavailable clothing, retry, and API failure;
- pre-run carb save, clear, invalid input, and refresh from the server;
- valid move payload and validation failure;
- replace category selection, server response, and refresh;
- delete confirmation, success/close, and failure/retained sheet;
- Calendar query refresh after successful mutations.

Existing shell tests remain unchanged except where they assert the planned
placeholder.

## Verification and E2E

Run focused integration tests, then `npm test`, `npm run typecheck`, and
`npm run lint`. Read the versioned Expo SDK 57 and NativeTabs documentation before
any Router/native changes.

Finish with Argent Android validation against the merged backend:

- sign in through the existing dev QA flow without exposing the token;
- open a planned workout from Calendar;
- verify detail, structure, metrics, clothing, and pre-run carbs;
- save and clear pre-run carbs;
- move and replace the workout;
- delete a disposable planned workout and verify Calendar refresh;
- capture failures if backend/device environment prevents a step.

No production deployment, release build, device data wipe, new native module,
completed Overview, or QA token is added to the repository.
