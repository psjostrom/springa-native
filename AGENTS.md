# springa-native

## Docs

Read https://docs.expo.dev/versions/v57.0.0/ before Expo/Router changes.
Native tabs: https://docs.expo.dev/router/advanced/native-tabs/

Expo SDK 57 / React Native app that is replacing the Springa web PWA ([psjostrom/springa](https://github.com/psjostrom/springa)). Same product domain: workout agenda, BG/diabetes tooling, coach, planner — but native. Both repos are open source; clone them wherever is convenient locally.

Web Springa will not keep evolving after native is ready. Prefer stock platform patterns over pixel-perfect PWA porting. Brand lives in content (colors, Agenda cards, header), not in a custom JS tab bar.

## Product context

Part of the T1D + running stack: CGM → Strimma → Scout → Springa → Intervals.icu / Garmin. This repo is the Springa client on phone.

Diabetes mode is assumed on for shell chrome (BG pill in header, Simulate tab present).

## Stack and conventions

| Item | Choice |
|------|--------|
| SDK | Expo 57, React Native 0.86, Expo Router |
| Tabs | `NativeTabs` from `expo-router/unstable-native-tabs` (alpha — keep tab config thin) |
| App id | `com.springa.app` (`app.json` → `expo.android.package`) |
| Dev binary | `expo-dev-client` — **not Expo Go** for day-to-day device work |
| Theme | Dark-only shell for now (`SpringaColors` in `src/theme/colors.ts`); theme toggle may be visible but inert until light theme ships |
| Icons | Lucide (`lucide-react-native`) in header; SF/`md` glyphs on NativeTabs; emoji for agenda event types |
| Native dirs | `android/` / `ios/` are generated via prebuild and gitignored — do not commit them |
| Specs/plans | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| SDD ledger | `.superpowers/` is local-exclude only — never commit |

Architecture must stay iOS-safe (safe areas, cross-platform APIs) even when QA is Android-only.

## Current app shape

```
src/app/_layout.tsx              # splash, dark StatusBar, Stack
src/app/(tabs)/_layout.tsx       # NativeTabs
src/app/(tabs)/index.tsx         # Calendar = Agenda mock (default route)
src/app/(tabs)/intel|coach|planner|simulate.tsx  # placeholders
src/components/shell/            # TopBar, BgPill, ScreenShell
src/components/agenda/           # switcher, list, cards, structure bar
src/theme/colors.ts              # Springa dark tokens + HR zones
src/fixtures/agenda.ts           # static MOCK_TODAY fixtures
```

Bottom tabs (order): Calendar, Intel, Coach, Planner, Simulate.  
Calendar route file is `index` so cold start hits Agenda; label remains "Calendar".

Agenda is a **static mock**: fixtures with fixed `MOCK_TODAY`, full visual cards (planned/completed/missed, structure bars, fuel chips). Tab switches work; other controls are inert (no real data, auth, or networking yet).

## What is done

- Skeleton mockup shipped (branch / PR for Agenda shell)
- Design + plan docs for that slice
- Dark tokens, fixtures + Node fixture tests (`tsx`)
- Shared header with static BG pill
- NativeTabs + placeholders
- Agenda mock UI on Calendar
- Splash `#13101c`; Expo template demo chrome removed
- `expo-dev-client` + `com.springa.app`; local debug APK install path proven on physical Android

## What is not done (next migration slices)

Migrate features from web Springa one by one. Rough order of need (not a locked roadmap):

1. Real data / API (Scout, Springa backend) — replace fixtures
2. Auth / session
3. Working theme toggle + light tokens (if wanted)
4. Month / Week calendar bodies
5. Workout detail, generate workout, settings
6. Intel, Coach, Planner, Simulate real screens
7. iOS QA / App Store path when Android is solid
8. Branding polish (adaptive icon still Expo defaults)

Do not add networking, stores, or auth in drive-by PRs — land them as intentional slices with specs when non-trivial.

## How to run (Android)

**Prefer a development build, not Expo Go.**

```bash
# First time / after native dep or config plugin changes:
npx expo run:android --device

# Day-to-day JS only (app already installed):
npx expo start
# open the installed "springa" app and connect to Metro
```

Wireless debugging: pair with `adb pair <ip>:<pairing-port> <code>`, keep device in `adb devices`, then `adb reverse tcp:8081 tcp:8081` so the phone can reach Metro via `127.0.0.1:8081`. Emulator LAN IPs often fail; use reverse or `10.0.2.2` for emulators.

Physical device installs and data wipes need explicit user consent beyond normal debug install.

## Verification

- Fixture tests: `node --import tsx --test src/fixtures/agenda.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- Android smoke: cold start → Agenda; switch all five tabs; no crash on inert controls

## Source of truth for visuals / domain

When matching Springa UI or domain behavior, read the web app ([psjostrom/springa](https://github.com/psjostrom/springa) — any local clone) e.g. `app/components/AgendaView.tsx`, `app/globals.css`, `TabNavigation.tsx`. Native should follow product behavior and tokens; tab chrome follows platform NativeTabs, not a cloned web bottom bar.
