# springa-native

Expo SDK 57 / React Native client replacing the Springa web PWA ([psjostrom/springa](https://github.com/psjostrom/springa)). Same product (workout agenda, BG tooling, coach, planner); native. Both repos are open source — clone wherever is convenient.

Prefer stock platform UI over pixel-perfect PWA porting. Brand lives in content (tokens, Agenda cards, header), not a custom JS tab bar. Keep APIs iOS-safe even when QA is Android-only.

## Docs

Before Expo / Expo Router changes, read https://docs.expo.dev/versions/v57.0.0/  
Native tabs: https://docs.expo.dev/router/advanced/native-tabs/

## Hard rules

- **Dev binary:** `expo-dev-client` + `npx expo run:android` — not Expo Go for device work.
- **Tabs:** `NativeTabs` from `expo-router/unstable-native-tabs` (alpha). Keep tab config thin; do not replace with a custom bottom bar.
- **Default route:** `(tabs)/index` is Calendar/Agenda. Label stays "Calendar".
- **Shell today:** dark tokens only (`src/theme/colors.ts`); Calendar Agenda is live via windowed `GET /api/intervals/calendar` (LegendList); Calendar gates on settings Query (`intervalsConnected`).
- **Auth + API client:** Google session + Bearer `createApiClient` + TanStack Query (settings / calendar / BG) + Zustand (UI only). Do not add further networking/stores without an approved design spec. Do not invent a migration roadmap here.
- **Dev QA login:** `__DEV__` only — deep link `springa://qa-login?token=…` (from Springa `npm run qa:native-deep-link`) → `POST /api/qa/mobile` → same SecureStore session as Google. Never paste the token or deep link into chat.
- **Diabetes chrome:** shell assumes BG pill (live when `diabetesMode`) + Simulate tab present.
- **Native dirs:** `android/` and `ios/` are prebuild output and gitignored — never commit them. App id: `com.springa.app`.
- **Specs vs plans:** commit approved designs under `docs/superpowers/specs/`. Implementation plans under `docs/superpowers/plans/` are gitignored — do not commit. `.superpowers/` SDD runs are local-exclude only.
- **PR titles:** use Conventional Commits format (`<type>(optional-scope): description`) before opening or updating a PR; CI enforces it.

## Commands

```bash
npm install
npx expo run:android --device          # first build / after native dep or config plugin changes
npx expo start                          # JS-only iteration once the app is installed
npm test                                # vitest run (vitest-native + MSW + RNTL)
npx tsc --noEmit
npm run lint
```

Wireless device: `adb pair …`, then `adb reverse tcp:8081 tcp:8081` (or your Metro port) and `adb reverse tcp:3000 tcp:3000` when the API URL is `http://127.0.0.1:3000`. Emulators: same reverse, or `10.0.2.2` for host services — not the host LAN IP on a physical phone.

## Boundaries

**Always**
- Read versioned Expo docs for Router / NativeTabs / prebuild behavior.
- Match product behavior and tokens from web Springa when implementing UI/domain (any local clone of that repo).
- Run the relevant verify commands above before claiming done.

**Ask first**
- Physical-device installs beyond normal debug deploy; any wipe/reset of personal app data.
- Adding auth, networking, persistence, or new native modules/config plugins.
- Push, PR, release signing, EAS cloud builds, production URLs.

**Never**
- Commit `android/`, `ios/`, `.env*`, credentials, or `.superpowers/` run artifacts.
- Commit implementation plans under `docs/superpowers/plans/`.
- Mock HTTP clients or invent a feature roadmap in this file.

## Layout (non-obvious)

```
src/app/(tabs)/_layout.tsx   # NativeTabs: Calendar, Intel, Coach, Planner, Simulate
src/app/(tabs)/index.tsx     # Calendar (settings-gated live Agenda)
src/api/                     # createApiClient, ApiClientProvider, types
src/query/                   # TanStack Query provider + settings/calendar/bg hooks
src/store/                   # Zustand UI store (no Query mirrors)
src/auth/                    # Google + SecureStore; exchangeQaToken / qa-login (__DEV__)
src/app/qa-login.tsx         # Dev deep-link target for agent QA Bearer sign-in
src/components/shell/        # TopBar, BgPill, ScreenShell
src/components/agenda/       # LegendList + cards + AgendaGate
src/theme/colors.ts          # Springa dark + HR zones
src/test/msw/                # Vitest MSW server + handlers
```

Intel / Coach / Simulate are placeholders with the shared shell; Planner is live.

## Testing

Vitest + `vitest-native` (real RN JS by default) + `@testing-library/react-native` + MSW (`msw/node` under Vitest). Happy-path handlers live in `src/test/msw/handlers/`; overrides via `server.use`. Integration over isolation: intercept at the network boundary (not `fetch` mocks), prefer in-memory persistence, assert user-visible behavior — not mock call counts.

## Domain reference

Web Springa source of truth for UI/domain: [psjostrom/springa](https://github.com/psjostrom/springa) — e.g. `AgendaView`, `globals.css`, `TabNavigation`. Native tab chrome follows platform NativeTabs, not the web bottom bar.
