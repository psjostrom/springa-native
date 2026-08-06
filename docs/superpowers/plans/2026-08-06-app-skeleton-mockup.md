# App Skeleton Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a non-interactive Springa Expo shell — NativeTabs (5 tabs), shared dark header with BG pill, and a full-fidelity static Agenda mock on Calendar — verified on Android.

**Architecture:** Expo Router file routes under `src/app/(tabs)/` with `NativeTabs` from `expo-router/unstable-native-tabs`. Brand lives in theme tokens, header, and Agenda content — not a custom JS tab bar. Fixtures use a fixed `MOCK_TODAY` so the mock does not drift with wall-clock time.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript, `lucide-react-native` (header icons), Node built-in test runner for pure fixture helpers.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-app-skeleton-mockup-design.md`
- Expo SDK 57 — read https://docs.expo.dev/versions/v57.0.0/ and https://docs.expo.dev/router/advanced/native-tabs/ before NativeTabs work
- Cross-platform APIs only; Android QA only this slice
- Dark theme only; theme toggle visible and inert
- Presses except NativeTabs tab switches are no-ops
- Exactly five tabs (Android NativeTabs limit)
- Do not reintroduce Expo template Home/Explore content
- No real networking, auth, or stores
- Prefer stock NativeTabs chrome; brand pink tint when API allows, else platform default

## File structure

| Path | Responsibility |
|------|----------------|
| `src/theme/colors.ts` | Springa dark palette + HR zone colors |
| `src/fixtures/agenda.ts` | `MOCK_TODAY`, event types, fixture array, pure selectors |
| `src/fixtures/agenda.test.ts` | Node tests for selectors |
| `src/components/shell/BgPill.tsx` | Static BG pill |
| `src/components/shell/TopBar.tsx` | Logo, wordmark, pill, inert Sun/Settings |
| `src/components/shell/ScreenShell.tsx` | TopBar + children + bg |
| `src/components/agenda/ViewModeSwitcher.tsx` | Month/Week/Agenda segments (Agenda selected) |
| `src/components/agenda/WorkoutStructureBar.tsx` | Hardcoded zone segment bars |
| `src/components/agenda/AgendaEventCard.tsx` | One event row |
| `src/components/agenda/AgendaList.tsx` | Earlier row, generate-today, cards |
| `src/app/_layout.tsx` | Root providers, splash, no template overlay |
| `src/app/(tabs)/_layout.tsx` | NativeTabs triggers |
| `src/app/(tabs)/calendar.tsx` | Agenda mock |
| `src/app/(tabs)/intel.tsx` etc. | Placeholder screens |
| `app.json` | Splash bg `#13101c` |

Delete after migration: `src/app/index.tsx`, `src/app/explore.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `src/components/animated-icon.tsx`, `src/components/animated-icon.web.tsx`, `src/components/animated-icon.module.css`, and other unused template-only components if nothing imports them.

---

### Task 1: Theme tokens + agenda fixtures

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/fixtures/agenda.ts`
- Create: `src/fixtures/agenda.test.ts`
- Modify: `src/constants/theme.ts` (re-export or point Spacing/Fonts at new colors if still used; do not leave conflicting light-default shell colors as the app source of truth)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Colors` / `HrZones` from `src/theme/colors.ts`
  - Types and helpers from `src/fixtures/agenda.ts`:

```ts
export type AgendaStatus = 'planned' | 'completed' | 'missed';
export type AgendaCategory = 'easy' | 'long' | 'interval' | 'race' | 'club';

export type StructureSegment = {
  zone: 1 | 2 | 3 | 4 | 5;
  /** Relative width weight */
  weight: number;
  /** Relative height 0–1 */
  intensity: number;
};

export type AgendaEvent = {
  id: string;
  /** ISO date `YYYY-MM-DD` interpreted as local calendar day */
  date: string;
  name: string;
  status: AgendaStatus;
  category: AgendaCategory;
  durationMin?: number;
  distanceKm?: number;
  fuelGPerH?: number;
  fuelTotalG?: number;
  structure?: StructureSegment[];
  /** Completed-only */
  paceSecPerKm?: number;
  avgHr?: number;
};

export const MOCK_TODAY = '2026-08-06';

export function parseAgendaDate(isoDay: string): Date;
export function getEventIcon(event: AgendaEvent): string;
export function splitAgendaEvents(
  events: AgendaEvent[],
  mockToday: string,
): { earlier: AgendaEvent[]; upcoming: AgendaEvent[] };
export function hasEventOnDay(events: AgendaEvent[], isoDay: string): boolean;
export const AGENDA_EVENTS: AgendaEvent[];
```

- [ ] **Step 1: Write failing fixture tests**

Create `src/fixtures/agenda.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AGENDA_EVENTS,
  MOCK_TODAY,
  getEventIcon,
  hasEventOnDay,
  splitAgendaEvents,
} from './agenda';

describe('splitAgendaEvents', () => {
  it('puts dates before MOCK_TODAY in earlier and today+future in upcoming', () => {
    const { earlier, upcoming } = splitAgendaEvents(AGENDA_EVENTS, MOCK_TODAY);
    assert.ok(earlier.length >= 1);
    assert.ok(upcoming.length >= 1);
    for (const e of earlier) assert.ok(e.date < MOCK_TODAY);
    for (const e of upcoming) assert.ok(e.date >= MOCK_TODAY);
  });
});

describe('hasEventOnDay', () => {
  it('detects whether MOCK_TODAY has an event', () => {
    const result = hasEventOnDay(AGENDA_EVENTS, MOCK_TODAY);
    assert.equal(typeof result, 'boolean');
  });
});

describe('getEventIcon', () => {
  it('returns race flag for race category', () => {
    assert.equal(
      getEventIcon({
        id: 'x',
        date: MOCK_TODAY,
        name: 'Race',
        status: 'planned',
        category: 'race',
      }),
      '🏁',
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
node --import tsx --test src/fixtures/agenda.test.ts
```

Expected: FAIL (module missing) or install `tsx` as a devDependency first if the import loader is missing:

```bash
npx expo install --dev tsx
node --import tsx --test src/fixtures/agenda.test.ts
```

- [ ] **Step 3: Implement theme + fixtures**

`src/theme/colors.ts`:

```ts
export const SpringaColors = {
  bg: '#13101c',
  surface: '#1d1828',
  surfaceAlt: '#241e30',
  border: '#2e293c',
  borderSubtle: '#4a4358',
  text: '#ffffff',
  muted: '#af9ece',
  brand: '#f23b94',
  success: '#4ade80',
  warning: '#ffb800',
  error: '#ff4d6a',
  tintSuccess: '#1a3d25',
  tintWarning: '#3d2b1a',
  tintError: '#3d1525',
  tintBrand: '#2d1a35',
} as const;

export const HrZoneColors = {
  1: '#6ee7b7',
  2: '#06b6d4',
  3: '#fbbf24',
  4: '#fb923c',
  5: '#ef4444',
} as const;
```

`src/fixtures/agenda.ts`: implement types, `MOCK_TODAY = '2026-08-06'`, icon helper (race→🏁, long→🏃, interval→⚡, club→👥, else→✓), `splitAgendaEvents` / `hasEventOnDay`, and `AGENDA_EVENTS` covering:

1. At least one event with `date < MOCK_TODAY` (for earlier row)
2. One `missed` before or on a past day
3. One `completed` with duration/distance/pace/avgHr
4. One `planned` on/after `MOCK_TODAY` with `structure` (3+ segments) + fuel fields
5. Choose fixture dates so either today is empty (generate-today row shows) **or** today has a planned event — either is fine; `AgendaList` will branch on `hasEventOnDay`

Keep event names realistic (e.g. “Easy Run”, “Threshold intervals”, “Long run”).

- [ ] **Step 4: Re-run tests — expect PASS**

```bash
node --import tsx --test src/fixtures/agenda.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/theme/colors.ts src/fixtures/agenda.ts src/fixtures/agenda.test.ts src/constants/theme.ts package.json package-lock.json
git commit -m "Add Springa dark tokens and static agenda fixtures."
```

---

### Task 2: Screen shell (TopBar + BG pill)

**Files:**
- Create: `src/components/shell/BgPill.tsx`
- Create: `src/components/shell/TopBar.tsx`
- Create: `src/components/shell/ScreenShell.tsx`
- Modify: `package.json` (add `lucide-react-native` + peer `react-native-svg` via `npx expo install`)

**Interfaces:**
- Consumes: `SpringaColors` from `@/theme/colors`
- Produces:
  - `BgPill` — no props (hardcoded `6.2`, flat/up arrow text, `2m ago`, success styling)
  - `TopBar` — no required props
  - `ScreenShell({ children, title? }: { children: React.ReactNode; title?: string })` — renders TopBar, then children; if `title` set (placeholder tabs), show centered muted title under header when children empty pattern is used by placeholders

- [ ] **Step 1: Install icons**

```bash
npx expo install lucide-react-native react-native-svg
```

- [ ] **Step 2: Implement BgPill**

Hardcoded in-range pill matching web intent:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';

export function BgPill() {
  const color = SpringaColors.success;
  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: color + '40',
          backgroundColor: color + '15',
        },
      ]}>
      <Text style={[styles.text, { color }]}>6.2 → 2m ago</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 3: Implement TopBar + ScreenShell**

`TopBar`: row — left brand mark (simple `View` chevron/block or Text “◆”) + Text `springa` (`fontWeight: '800'`, `color: brand`, `fontSize: 20`); right: `BgPill`, `Sun`, `Settings` from lucide (size 20, color muted). Sun/Settings wrapped in `Pressable` with empty `onPress`. Background `surface`, bottom border `border`, horizontal padding 16, vertical 12. Use `useSafeAreaInsets().top` padding.

`ScreenShell`: `View` flex 1 `backgroundColor: bg` → `TopBar` → `View` flex 1 children. Placeholder screens pass a single centered `Text` as children.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (or only pre-existing template errors unrelated to new files — fix any errors in new files).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell package.json package-lock.json
git commit -m "Add shared TopBar shell with static BG pill."
```

---

### Task 3: NativeTabs routes + placeholders

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/calendar.tsx` (temporary placeholder ok until Task 4)
- Create: `src/app/(tabs)/intel.tsx`
- Create: `src/app/(tabs)/coach.tsx`
- Create: `src/app/(tabs)/planner.tsx`
- Create: `src/app/(tabs)/simulate.tsx`
- Modify: `src/app/_layout.tsx`
- Delete: `src/app/index.tsx`, `src/app/explore.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`

**Interfaces:**
- Consumes: `ScreenShell`, `SpringaColors`
- Produces: five tab routes named `calendar`, `intel`, `coach`, `planner`, `simulate`

- [ ] **Step 1: Rewrite root layout**

`src/app/_layout.tsx` must:

- Call `SplashScreen.preventAutoHideAsync()` once
- Hide splash on layout ready (`SplashScreen.hideAsync()`)
- Force dark UI (`StatusBar` style `light`, no light theme provider for shell)
- Render `<Stack>` or slot that mounts `(tabs)` — prefer:

```tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SpringaColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: SpringaColors.bg },
        }}
      />
    </>
  );
}
```

Remove `AnimatedSplashOverlay` and template `ThemeProvider` light/dark switching for this slice.

- [ ] **Step 2: NativeTabs layout**

`src/app/(tabs)/_layout.tsx` — follow SDK 57 compound API (verify against current docs if API drifted):

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SpringaColors } from '@/theme/colors';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={SpringaColors.brand}
      labelStyle={{ color: SpringaColors.muted }}
      backgroundColor={SpringaColors.surface}
      indicatorColor={SpringaColors.surfaceAlt}>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="intel">
        <NativeTabs.Trigger.Label>Intel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="brain.head.profile" md="smart_toy" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner">
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="layers" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="simulate">
        <NativeTabs.Trigger.Label>Simulate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask" md="science" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

If a `sf` / `md` glyph is rejected at runtime, swap to the closest valid SF Symbol / Material Symbol — do not fall back to a custom JS tab bar.

- [ ] **Step 3: Placeholder screens**

Each of intel/coach/planner/simulate:

```tsx
import { StyleSheet, Text } from 'react-native';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { SpringaColors } from '@/theme/colors';

export default function IntelScreen() {
  return (
    <ScreenShell>
      <Text style={styles.title}>Intel</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 48,
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 18,
  },
});
```

`calendar.tsx` temporarily same pattern with title `Calendar` until Task 4.

Delete old `index` / `explore` / `app-tabs*` files.

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app src/components/shell
git add -u src/app/index.tsx src/app/explore.tsx src/components/app-tabs.tsx src/components/app-tabs.web.tsx
git commit -m "Replace template tabs with Springa NativeTabs shell."
```

---

### Task 4: Agenda mock UI on Calendar

**Files:**
- Create: `src/components/agenda/ViewModeSwitcher.tsx`
- Create: `src/components/agenda/WorkoutStructureBar.tsx`
- Create: `src/components/agenda/AgendaEventCard.tsx`
- Create: `src/components/agenda/AgendaList.tsx`
- Modify: `src/app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `AGENDA_EVENTS`, `MOCK_TODAY`, `splitAgendaEvents`, `hasEventOnDay`, `getEventIcon`, `SpringaColors`, `HrZoneColors`, `ScreenShell`
- Produces: Calendar tab renders full Agenda mock; all presses no-ops

- [ ] **Step 1: ViewModeSwitcher**

Three equal pills: Month, Week, Agenda. Agenda uses `backgroundColor: brand`, `color: #fff`. Others `surfaceAlt` + `muted`. Wrap non-Agenda in `Pressable` with empty `onPress`. Container: surface card, border, padding, margin.

- [ ] **Step 2: WorkoutStructureBar**

Props: `{ segments: StructureSegment[]; height?: number }`.

Row of Views; width from `weight / sum(weights)`; height from `intensity`; color from `HrZoneColors[zone]`. Default height 40.

- [ ] **Step 3: AgendaEventCard**

Layout: left date column (weekday short upper, day number bold, month short) via `en-GB` `toLocaleDateString` on `parseAgendaDate(date)`; right column icon emoji + title; status left border 3px (`brand` planned, `success` completed, `error` missed); missed title line-through + opacity ~0.6.

Planned extras: `WorkoutStructureBar` if `structure`; chip `~{durationMin} min · {distanceKm} km` when present; fuel chip with `tintWarning` border when fuel fields present.

Completed extras: row of duration, distance, pace (`mm:ss` from `paceSecPerKm`), avg HR.

Whole card may be `Pressable` with empty `onPress`.

- [ ] **Step 4: AgendaList**

```tsx
const { earlier, upcoming } = splitAgendaEvents(AGENDA_EVENTS, MOCK_TODAY);
```

- If `earlier.length > 0`: inert row with History icon + `"{n} earlier workout(s)"`
- If `!hasEventOnDay(AGENDA_EVENTS, MOCK_TODAY)`: dashed generate-today row with Plus icon
- Map `upcoming` to `AgendaEventCard`
- ScrollView with padding; background transparent over shell `bg`

- [ ] **Step 5: Wire calendar.tsx**

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';
import { AgendaList } from '@/components/agenda/AgendaList';
import { ViewModeSwitcher } from '@/components/agenda/ViewModeSwitcher';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { SpringaColors } from '@/theme/colors';

export default function CalendarScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ViewModeSwitcher />
        </View>
        <View style={styles.card}>
          <AgendaList />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 4, paddingBottom: 24, gap: 6 },
  card: {
    backgroundColor: SpringaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    padding: 8,
  },
});
```

- [ ] **Step 6: Typecheck + fixture tests**

```bash
node --import tsx --test src/fixtures/agenda.test.ts
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/agenda src/app/\(tabs\)/calendar.tsx
git commit -m "Add static Agenda mock on Calendar tab."
```

---

### Task 5: Scaffold cleanup + splash + verify

**Files:**
- Modify: `app.json` splash `backgroundColor` → `#13101c`
- Delete unused template components only if no remaining imports: `animated-icon*`, `hint-row`, `web-badge`, `external-link`, `ui/collapsible`, unused assets optional
- Modify: `src/constants/theme.ts` / `global.css` only as needed so nothing still paints Expo template blue/white as the shell

**Interfaces:**
- Consumes: completed Tasks 1–4
- Produces: clean boot into Calendar/Agenda on Android

- [ ] **Step 1: Splash + dead code**

Update `app.json` expo-splash-screen plugin `backgroundColor` to `#13101c`. Remove template-only files that are unreferenced (confirm with repo search before delete).

- [ ] **Step 2: Lint + typecheck + fixture tests**

```bash
node --import tsx --test src/fixtures/agenda.test.ts
npx tsc --noEmit
npm run lint
```

- [ ] **Step 3: Android smoke (Argent)**

Boot local Android emulator, install/start the Expo app (or `npx expo start --android`), then verify:

1. Splash/boot reaches Calendar with Agenda mock (cards, switcher, header with BG pill)
2. Each of Intel / Coach / Planner / Simulate shows placeholder + shared header
3. Month/Week, earlier row, generate-today, cards, Sun, Settings do not navigate or crash

Capture at least one screenshot of Calendar/Agenda under `.superpowers/sdd/qa/` only after ledger exclusion is set (controller owns QA paths during Shipwright QA phase — implementer may note manual results in the task report).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Clean Expo template chrome and align splash to Springa."
```

---

## Self-review checklist (author)

1. Spec coverage: NativeTabs, five tabs, diabetes chrome, dark-only, full Agenda mock, placeholders, fixed `MOCK_TODAY`, Android QA, inert controls — all tasked.
2. No TBD/placeholder steps.
3. Types aligned across tasks (`AgendaEvent`, `StructureSegment`, `ScreenShell`).
