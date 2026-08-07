# Workout navigation shell (milestone 3)

Date: 2026-08-08  
Status: approved for implementation  
Repo: `springa-native` (Expo SDK 57)  
Parent: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`  
Depends on: milestone 2 (`2026-08-07-live-agenda-design.md`)  
Test harness: `2026-08-07-vitest-msw-design.md`

## Goal

Tap an Agenda card to open a native bottom sheet over Calendar. Establish planned vs completed detail branches (shell only) so milestones 4 and 5 can fill bodies without reshaping navigation. System back and sheet dismiss both close the sheet.

## Decisions

| Topic | Choice |
|-------|--------|
| Presentation | `@expo/ui` `BottomSheet` over Calendar (PWA-like sheet) |
| Sheet content host | RN trees via `RNHostView` inside `Host` + `BottomSheet` |
| Identity | Calendar route search param `workout=<eventId>` |
| Data | Resolve from merged calendar TanStack Query cache by id; no event snapshot in Zustand |
| Cache miss | Not-found state in sheet, then clear param / dismiss (tap path always hits cache) |
| Branches | `type === 'completed'` → completed shell; else → planned shell |
| Missed | Mode of planned (`isMissedEvent`) — Missed badge; not its own route; not completed |
| Race | Planned branch (`type === 'race'` or card status race) |
| Snap points | `['half', 'full']` |
| External deep links | Out of scope (no WhatsApp / universal links) |
| Back | Android/system back must dismiss the sheet (BackHandler if same-route params do not push history) |
| M2 Zustand | Remove `selectedEventId` from `useUiStore` — route param is the only owner |
| Backend | No new Springa endpoints |
| Native modules | Use existing `@expo/ui` (already depended); rebuild dev client if the binary lacks current Expo UI |

Rationale: Branch on data shape (activity-backed completed vs plan-backed), not calendar emotion. Route owns identity; Query owns data. Expo BottomSheet gives Material/iOS sheet chrome without inventing a custom modal.

## Flow

```text
Agenda card tap
  → set Calendar search param workout=<id>
  → BottomSheet isPresented=true
  → look up id in merged calendar Query pages
       hit  → shared chrome + PlannedWorkoutSheet | CompletedWorkoutSheet
       miss → not-found chrome → clear workout param
  → dismiss (swipe / overlay / close / system back)
  → clear workout param → isPresented=false
```

## Module layout

- `src/components/workout/WorkoutSheet.tsx` — Host + BottomSheet; resolves event; shared chrome; branches bodies
- `src/components/workout/PlannedWorkoutSheet.tsx` — planned placeholder body (m4 later)
- `src/components/workout/CompletedWorkoutSheet.tsx` — completed placeholder body (m5 later)
- `src/components/workout/workoutStatusBadge.ts` — Planned / Missed / Completed / Race labels for chrome
- `src/domain/eventStatus.ts` — existing `isMissedEvent` / `getCardStatus` (reuse)
- Calendar / Agenda: wire card `onPress` → set `workout` param; mount `WorkoutSheet` on Calendar
- `src/store/ui.ts` — drop `selectedEventId`

## UI behavior

### Shared chrome

- Formatted date (en-GB, readable)
- Event name as title
- Status badge: Planned | Missed | Completed | Race
- Close control that clears `workout`

### Bodies (m3)

- Planned: short placeholder copy (e.g. “Planned workout”) — no structure, fuel, actions
- Completed: short placeholder copy (e.g. “Completed workout”) — no Overview widgets
- Missed: planned body + Missed badge in chrome

### Sheet

- `snapPoints={['half', 'full']}`
- `onDismiss` clears `workout`
- Drag indicator on

## Out of scope

- Planned detail content / mutations (m4)
- Completed Overview widgets (m5)
- External deep links / universal links
- GET-by-id Springa API
- Month/Week; Intel / Coach / Planner / Simulate
- Structure bars on Agenda cards

## Testing

- RNTL + MSW calendar fixtures (no `vi.mock`)
- Tap planned → sheet shows title + Planned badge + planned placeholder
- Tap completed → completed placeholder
- Tap missed → Missed badge + planned placeholder
- Dismiss / clear param → sheet gone, Agenda visible
- Unknown `workout` id → not-found then cleared
- `npm test`, `npx tsc --noEmit`, `npm run lint`
- Android smoke: open sheet, system back closes

## Success criteria

- Agenda cards open a bottom sheet over Calendar
- Correct branch for planned / completed; missed is planned mode
- System back dismisses the sheet
- Route param is sole selected-workout owner; Query remains sole event data owner
- Placeholders only — ready for m4/m5 drop-in

## Follow-up

Milestone 4 — Planned detail (full). Milestone 5 — Completed Overview.
