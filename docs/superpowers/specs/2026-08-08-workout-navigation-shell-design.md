# Workout navigation shell (milestone 3)

Date: 2026-08-08  
Status: approved for implementation  
Repo: `springa-native` (Expo SDK 57)  
Parent: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`  
Depends on: milestone 2 (`2026-08-07-live-agenda-design.md`)  
Test harness: `2026-08-07-vitest-msw-design.md`
Design system: `2026-08-12-native-design-system-design.md`

## Goal

Tap an Agenda card to open a native bottom sheet over Calendar. Establish planned vs completed detail branches (shell only) so milestones 4 and 5 can fill bodies without reshaping navigation. System back and sheet dismiss both close the sheet.

## Decisions

| Topic | Choice |
|-------|--------|
| Presentation | Expo Router `Stack` screen with `presentation: 'formSheet'` |
| Android / iOS | Same Router formSheet path (no `@expo/ui` Modal / Host overlay) |
| Sheet content host | React Native screen tree (`src/app/workout/[id].tsx`) |
| Sheet theme | Dark Springa surface (`#1d1828`) via `contentStyle` + screen root |
| Identity | Path param `/workout/[id]` |
| Data | Resolve from merged calendar TanStack Query cache by id; no event snapshot in Zustand |
| Cache miss | Not-found state in sheet, then `router.back()` (tap path always hits cache) |
| Branches | `type === 'completed'` → completed shell; else → planned shell |
| Missed | Mode of planned (`isMissedEvent`) — Missed badge; not its own route; not completed |
| Race | Planned branch (`type === 'race'` or card status race) |
| Snap points | `sheetAllowedDetents: [0.5, 1]`, grabber on |
| External deep links | Out of scope (no WhatsApp / universal links) |
| Back | System back / sheet dismiss / close → `router.back()` |
| M2 Zustand | Remove `selectedEventId` from `useUiStore` — route is the only owner |
| Backend | No new Springa endpoints |

Rationale: Branch on data shape (activity-backed completed vs plan-backed), not calendar emotion. Route owns identity; Query owns data. FormSheet scales to more sheets (push / nested back) without Compose `Host` / Material Dialog lifecycle over Calendar.

## Flow

```text
Agenda card tap
  → router.push(`/workout/${id}`)
  → formSheet presented over tabs
  → look up id in merged calendar Query pages
       hit  → shared chrome + PlannedWorkoutSheet | CompletedWorkoutSheet
       miss → not-found chrome → router.back()
  → dismiss (swipe / grabber / close / system back)
  → pop workout route → Calendar visible
```

## Module layout

- `src/app/workout/[id].tsx` — formSheet screen; Query resolve + dismiss
- `src/app/_layout.tsx` — Stack `workout/[id]` with `presentation: 'formSheet'`
- `src/components/workout/WorkoutSheetContent.tsx` — shared chrome + branch bodies
- `src/components/workout/PlannedWorkoutSheet.tsx` / `CompletedWorkoutSheet.tsx` — placeholders
- `src/components/workout/workoutStatusBadge.ts` — Planned / Missed / Completed / Race labels
- Calendar / Agenda: card `onPress` → `router.push(\`/workout/${id}\`)`
- `src/store/ui.ts` — drop `selectedEventId`

## UI behavior

### Shared chrome

- Formatted date (en-GB, readable)
- Event name as title
- Status badge: Planned | Missed | Completed | Race
- Close control that pops the workout route

### Bodies (m3)

- Planned: short placeholder copy (e.g. “Planned workout”) — no structure, fuel, actions
- Completed: short placeholder copy (e.g. “Completed workout”) — no Overview widgets
- Missed: planned body + Missed badge in chrome

Milestones 4 and 5 replace these bodies by composing `src/components/ui/` primitives. Shared visual structure belongs in general components such as `Card`, `Grid`, `Section`, `AppText`, `Badge`, `StateView`, `Button`, `TextField`, and `AppBottomSheet`; planned-workout, report-card, stats, splits, carbs, feedback, and glucose semantics stay in feature components.

### Sheet

- Dark Springa surface
- Half / full detents + grabber
- Dismiss pops `/workout/[id]`

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
- Dismiss → sheet gone, Agenda visible
- Unknown workout id → not-found then dismissed
- `npm test`, `npx tsc --noEmit`, `npm run lint`
- Android smoke: open sheet (dark readable chrome), system back closes

## Success criteria

- Agenda cards open a Router formSheet over Calendar
- Sheet chrome is readable on Springa dark surface
- Correct branch for planned / completed; missed is planned mode
- System back dismisses the sheet
- Route is sole selected-workout owner; Query remains sole event data owner
- Placeholders only — ready for m4/m5 drop-in

## Follow-up

Milestone 4 — Planned detail (full). Milestone 5 — Completed Overview. Both use the native design system and add no screen-named global primitives.
