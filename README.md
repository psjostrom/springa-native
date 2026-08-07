# springa-native

Expo SDK 57 / React Native client for Springa (workout agenda, BG tooling, coach, planner). Companion to the web PWA at [psjostrom/springa](https://github.com/psjostrom/springa).

Use a **development build** (`expo-dev-client`) — not Expo Go.

## Test on a phone (Android)

**First install / after native dep or config plugin changes**

1. Enable USB debugging (or wireless debugging via `adb pair …`).
2. From the repo:

```bash
npm install
npx expo run:android --device
```

That builds, installs `com.springa.app`, and starts Metro.

**Day-to-day JS changes** (app already installed)

```bash
npx expo start
```

Open the Springa dev client on the phone; it loads from Metro.

**Metro reachability**

```bash
adb reverse tcp:8081 tcp:8081
```

So the phone talks to Metro at `http://127.0.0.1:8081`. Re-run reverse if adb drops or the phone reconnects. Prefer reverse (or `10.0.2.2` on emulators) — not the host LAN IP.

## Tests

```bash
npm test          # vitest run
npm run test:watch
npx tsc --noEmit
npm run lint
```

Stack: Vitest, vitest-native, React Native Testing Library, MSW (`msw/node`). See [`AGENTS.md`](./AGENTS.md) and `docs/superpowers/specs/2026-08-07-vitest-msw-design.md`.
