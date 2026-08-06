# App skeleton mockup (Agenda shell)

Date: 2026-08-06  
Status: approved for planning  
Repo: `springa-native` (Expo SDK 57)

## Goal

Stand up a non-interactive Springa native shell: bottom tabs, top bar, and a full-fidelity Agenda mock on the Calendar tab. This is the first slice of migrating Springa off the web PWA. Architecture must support Android and iOS; this slice is verified on Android only.

## Decisions

| Topic | Choice |
|-------|--------|
| Navigation | Expo Router + `NativeTabs` (`expo-router/unstable-native-tabs`) |
| Visual priority | Stock platform standards over pixel-perfect PWA chrome |
| Brand in content | Springa dark tokens, Agenda card layout, header branding |
| Diabetes chrome | On — BG pill in header + Simulate tab |
| Theme | Dark only; theme toggle visible and inert |
| Other tabs | Empty placeholders with shared header |
| Agenda richness | Full visual mock (planned / completed / missed, bars, chips, switcher) |
| Interaction | Tab switching only; all other controls inert |
| Platform QA | Android emulator this slice; keep iOS-safe APIs |

Rationale: web Springa will not keep evolving after native is ready. Maintaining a custom JS tab bar for PWA parity is the wrong long-term cost. `NativeTabs` is alpha (`unstable-native-tabs`) but matches stock Android/iOS tab patterns; keep tab config thin to absorb API churn.

## Out of scope

- Real data, auth, networking, stores
- Light theme behavior / working theme toggle
- Month and Week calendar bodies
- Workout detail, generation, settings
- iOS device/simulator QA for this slice
- Performance work beyond removing Expo template splash demo chrome

## Architecture

```
src/app/
  _layout.tsx                 # root: dark theme, splash, fonts as needed
  (tabs)/
    _layout.tsx               # NativeTabs: calendar, intel, coach, planner, simulate
    calendar.tsx              # Agenda mock + shared header content area
    intel.tsx
    coach.tsx
    planner.tsx
    simulate.tsx
src/components/shell/         # TopBar, BGPill (static)
src/components/agenda/        # ViewModeSwitcher, AgendaList, AgendaEventCard, structure bar
src/theme/                    # Springa dark color tokens (+ HR zones)
src/fixtures/agenda.ts        # Hardcoded workouts (fixed calendar dates)
```

Shared header can live in each tab screen or a thin wrapper used by all five routes — prefer one wrapper so placeholders stay one-liners.

Replace scaffold Home/Explore `NativeTabs` triggers and delete unused Expo template screens/assets that this shell does not need (animated splash demo overlay, explore tab, etc.). Align splash background to Springa `bg` (`#13101c`).

### Cross-platform rules

- Use `SafeAreaView` / safe-area insets for header and content.
- Prefer Lucide (or Expo-compatible vector icons) that render on both platforms; NativeTabs icon wiring must follow current Expo SDK 57 docs.
- No Android-only navigation APIs. Do not block iOS builds even if we only smoke-test Android.

## Visual system

### Dark tokens (from Springa web)

| Token | Hex |
|-------|-----|
| bg | `#13101c` |
| surface | `#1d1828` |
| surface-alt | `#241e30` |
| border | `#2e293c` |
| border-subtle | `#4a4358` |
| text | `#ffffff` |
| muted | `#af9ece` |
| brand | `#f23b94` |
| success / warning / error | `#4ade80` / `#ffb800` / `#ff4d6a` |
| tint-* | match web (`#1a3d25`, `#3d2b1a`, `#3d1525`, `#2d1a35`) |

HR zones for structure bars: Z1–Z5 as in Springa (`#6ee7b7`, `#06b6d4`, `#fbbf24`, `#fb923c`, `#ef4444`).

NativeTabs active tint: brand pink when the API allows; otherwise accept platform defaults.

### Top bar

- Left: Springa mark + wordmark “springa” (brand color)
- Right: static BG pill (hardcoded in-range sample, e.g. `6.2` + trend + relative time) · Sun icon · Settings icon
- Chrome: `surface` background, bottom `border`
- Theme and Settings presses: no-ops

### Bottom tabs (order)

1. Calendar  
2. Intel  
3. Coach  
4. Planner  
5. Simulate  

Labels match web. Icons: closest Lucide/platform equivalents to Monitor / Activity / Bot / Layers / Beaker (exact asset form depends on NativeTabs SDK 57 requirements).

### Agenda (Calendar tab)

1. Segmented control: Month | Week | **Agenda** (Agenda selected; Month/Week inert)
2. Optional “N earlier workouts” row (inert)
3. Dashed “Generate workout for today” row (inert) when no fixture falls on `MOCK_TODAY`
4. Event cards from fixtures:
   - Date column (weekday, day, month)
   - Type emoji (race / long / interval / club / default)
   - Title; left border by status (brand / success / error)
   - Planned: structure bar, duration/distance chip, fuel chip when present
   - Completed: duration / distance / pace / avg HR row
   - Missed: muted/struck styling as on web

### Other tabs

Centered muted title only (“Intel”, …), same top bar.

## Fixtures & interaction

- Single static fixture module with a fixed `MOCK_TODAY` constant and fixed event dates relative to that constant (not wall-clock “today”), so the mock does not drift.
- Cover at least: one planned (with structure + fuel), one completed, one missed; plus enough past events that an “earlier workouts” row can appear.
- No fetch, Jotai/stores, or MSW in this slice.
- Only NativeTabs changes visible route. Cards and header controls must not navigate, alert, or mutate fixture state.

## Verification

1. Typecheck / `expo lint` as available in the repo.
2. Android emulator smoke (Argent): app boots → Calendar shows Agenda mock → each tab shows placeholder + shared header → inert controls do nothing harmful.
3. Confirm iOS project still typechecks/builds if trivial; no requirement to run Simulator this slice.

## Definition of done

Android shows: dark Springa shell, five NativeTabs, shared header with BG pill, full Agenda mock on Calendar, empty other tabs, tab switching only.
