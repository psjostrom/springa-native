# Live Agenda (milestone 2)

Date: 2026-08-07  
Status: approved for implementation  
Repo: `springa-native` (Expo SDK 57)  
Parent: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`  
Depends on: milestone 1 (`2026-08-07-api-client-settings-gate-design.md`)  
Test harness: `2026-08-07-vitest-msw-design.md`

## Goal

Replace fixture Agenda with real Intervals data via Springa `GET /api/intervals/calendar`, with a snappy first paint: virtualized continuous list, bidirectional lazy pages, no offline mode. Establish the long-term client stack (TanStack Query + Zustand + LegendList), fold settings into Query, and make diabetes/BG a first-class early consumer (live pill).

## Decisions

| Topic | Choice |
|-------|--------|
| Server state | TanStack Query |
| Client/UI state | Zustand (never mirror Query results into the store) |
| List | `@legendapp/list` (`LegendList`, `recycleItems`) |
| Fetch model | Small initial window; load older near top, newer near bottom |
| List UX | One continuous chronological list (no upcoming/history toggle) |
| Structure bars | Omit until planned-detail / on-device parsing later |
| Generate workout CTA | Hide (Coach later) |
| Fixtures | Remove from Calendar path |
| Types | Native `CalendarEvent` aligned with web JSON (`date` ISO → `Date` at parse) |
| Offline | Not supported |
| Settings | Migrate off `SettingsProvider` Context into Query |
| BG | Query + ~60s poll when `diabetesMode`; wire `BgPill`; hide when off / missing / stale (>15 min) |
| Server compute | No new heavy Vercel routes; windowed calendar only; Scout stays the heavy CGM path |
| Tests | MSW `apiUrl` + happy-path defaults + `server.use`; RNTL behavior; no `vi.mock` |

## Architecture

```text
AuthProvider
  → ApiClientProvider (DI only — memoized createApiClient)
  → QueryClientProvider
       → useSettingsQuery  GET /api/settings
       → useCalendarEvents windowed GET /api/intervals/calendar
       → useBgQuery        GET /api/bg (poll when diabetesMode)
  → Zustand (ephemeral UI only; may be empty scaffold in M2)
  → AgendaGate (intervalsConnected) → LegendList Agenda
  → BgPill (diabetes-gated)
```

**One owner per value:** Query owns remote cache. Zustand owns ephemeral UI only. Never copy query data into Zustand.

## Data flow

1. Signed in → queries enabled; keys include session identity (email) so caches do not flash across accounts.
2. Settings query gates Calendar on `intervalsConnected`.
3. When connected → initial calendar page **today − 14d → today + 28d**.
4. Merge pages into a sorted unique-by-id list for LegendList.
5. Near the top → older contiguous page (same span length); near the bottom → newer page. Dedupe overlaps. Edge-page failures must not wipe existing items.
6. Card status uses web `isMissedEvent` (planned + local date &lt; today → missed). Metrics from API fields; no structure segments.
7. BG: if `diabetesMode`, poll `/api/bg`; hide pill when mode off, or when `current` / timestamp missing, or reading older than 15 minutes.

## API client

Extend `createApiClient`:

- `getCalendar(oldest, newest)` → `GET /api/intervals/calendar?oldest=&newest=`
- `getBg()` → `GET /api/bg` (minimal pill fields: `current.mmol`, `current.ts`, `trend.arrow`)

Keep `getSettings` / `parseUserSettings`.

## Module layout

- `src/api/types.ts` — `CalendarEvent`, `BgPayload`
- `src/api/calendar.ts` / `src/api/bg.ts` — parse helpers
- `src/api/ApiClientProvider.tsx` — DI bridge from auth
- `src/query/` — client, keys, settings / calendar / bg hooks
- `src/store/` — minimal Zustand scaffold
- `src/domain/eventStatus.ts` — `isMissedEvent`
- Agenda components rewritten onto `CalendarEvent` + LegendList
- Root layout: Auth → ApiClient → Query → tabs (no SettingsProvider)
- MSW handlers: `calendar.ts`, `bg.ts`; settings remains

## UI behavior

- Settings loading / error + Retry unchanged in spirit (via Query).
- Calendar initial load / error + Retry inside the gate when connected.
- Empty connected calendar: “No workouts scheduled”.
- Month/Week switcher stays inert; card tap still no-op (milestone 3).
- History button and “Generate workout for today” removed.
- Calendar screen: LegendList is the scroller (no wrapping `ScrollView` of all cards).

## Out of scope

- Workout detail routes (M3+)
- Structure bars, clothing, pace table on cards
- Month/Week bodies; Intel / Coach / Planner / Simulate
- PUT settings, native onboarding
- Offline / disk calendar cache
- New heavy Springa compute endpoints
- Jotai / SWR

## Testing

- Default MSW: settings connected; calendar happy-path window; BG happy-path
- Client parse/error/401 tests for calendar (and bg as needed)
- Agenda RNTL: live names from MSW; disconnected empty state; calendar error + Retry
- Pagination/merge covered by unit tests (not fragile scroll coordinates)
- BgPill: diabetes off → hidden; on → value; stale/missing → hidden
- `npm test`, `npx tsc --noEmit`, `npm run lint`

## Success criteria

- Cold path: settings + one small calendar window; virtualized list; no fixture Agenda
- Edge scroll loads adjacent windows without full reload
- Settings Context gone; gate and BG driven by Query
- Diabetes on → live pill; off → not shown
- Android smoke: Agenda + pill against real or MSW-backed behavior as available

## Follow-up

Next roadmap milestone: **3 — Workout navigation shell**.
