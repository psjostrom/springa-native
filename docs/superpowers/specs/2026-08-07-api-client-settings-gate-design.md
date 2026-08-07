# API client + settings gate (milestone 1)

Date: 2026-08-07  
Status: approved for implementation  
Repo: `springa-native` (Expo SDK 57)  
Parent: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`  
Depends on: milestone 0 (`2026-08-06-native-auth-design.md`)  
Test harness: `2026-08-07-vitest-msw-design.md` (land with this milestone)

## Goal

Single authenticated HTTP client to Springa `/api/*`, read `GET /api/settings`, and gate Calendar/Agenda on `intervalsConnected`. Unauthenticated callers are already blocked by the login stack; this milestone fails clearly when the web account has no Intervals connection.

## Decisions

| Topic | Choice |
|-------|--------|
| Client shape | `createApiClient({ getToken, onUnauthorized, baseUrl? })` → `apiFetch` + typed `getSettings` |
| Auth header | `Authorization: Bearer <jwt>` (same as auth design) |
| 401 | Call `onUnauthorized` (clears session → login), then throw `ApiError` |
| Settings store | React Context (`SettingsProvider`), not Jotai — match `AuthContext` until a broader store is justified |
| Settings surface | **Read-only** `GET /api/settings`; no PUT, no native Settings UI |
| Types | Native `UserSettings` mirrors Springa’s public settings JSON fields used for gating and later milestones (`intervalsConnected`, `diabetesMode`, `nightscoutUrl`, …); omit secrets |
| Calendar when connected | Keep fixture Agenda until milestone 2 |
| Calendar when not connected | Replace Agenda body with an empty state (no fixtures pretending to be live) |
| Calendar load/error | Loading indicator; error message + Retry |
| Base URL | Existing `EXPO_PUBLIC_SPRINGA_API_URL` via `getApiBaseUrl()` |
| Backend | No Springa changes — Bearer already accepted by `requireAuth` |
| Tests | Vitest + MSW per approved harness design; intercept `GET /api/settings` at the network boundary |

Rationale: Roadmap milestone 1 is the typed client and connection gate, not live calendar. Fixtures stay visible only when Intervals is connected so the shell remains usable for UI work; disconnected accounts must not look like they have workouts.

## Flow

```text
Signed in (AuthProvider)
  → SettingsProvider mounts
  → apiClient.getSettings()  GET {SPRINGA_API}/api/settings
       Authorization: Bearer <token>
  → status: loading | ready | error
  → Calendar screen:
       loading  → spinner / “Loading…”
       error    → message + Retry (re-fetch)
       ready && !intervalsConnected → empty state (connect on web)
       ready && intervalsConnected  → existing fixture AgendaList
  → any 401 from apiClient → onUnauthorized → signOut → login
```

## Native modules

### `src/api/client.ts`

- `ApiError` with `status: number` and message
- `createApiClient({ getToken, onUnauthorized, baseUrl?, timeoutMs? })`
  - `apiFetch<T>(path, init?)` — JSON request/response; attaches Bearer; timeout via `AbortSignal.timeout`
  - `getSettings(): Promise<UserSettings>` — `GET /api/settings`
- Default timeout 15s (same family as mobile auth exchange)
- Non-JSON / unexpected shape → throw `ApiError` with a clear message (do not swallow)
- Do **not** mock `fetch` in app code; production uses real `fetch`

### `src/api/types.ts`

Typed `UserSettings` for fields returned by Springa `GET /api/settings` that native will consume. At minimum include:

- `intervalsConnected?: boolean`
- `diabetesMode?: boolean`
- `nightscoutUrl?: string`
- `displayName?: string`
- `email?: string`
- other optional fields already on the web type that later milestones need (`raceDate`, `effortMetric`, HR fields, …) — keep optional; do not invent new fields

Do not type or store Intervals/Nightscout secrets (they are never returned).

### `src/api/settings.tsx` (provider + hook)

- `SettingsProvider` under `AuthProvider`; only fetches when `status === 'signedIn'` and `session` is present
- Exposes `{ status: 'loading' | 'ready' | 'error'; settings: UserSettings | null; error: string | null; reload: () => void }`
- On 401, auth already clears via client callback; provider settles to a non-blocking state (unmount / signed-out gate owns UI)
- `reload` re-runs the fetch (Retry button)

### Calendar gate UI (`src/app/(tabs)/index.tsx` + small presentational piece)

- Loading / error / disconnected empty states live in Calendar (or a thin `AgendaGate` wrapper)
- Copy for disconnected (English, concise): title **Intervals not connected**; body explaining to connect Intervals.icu in Springa on the web, then Retry
- Retry calls `reload`
- When connected: current `AgendaList` + `ViewModeSwitcher` unchanged

### Auth wiring

- Root layout: `AuthProvider` → create/register API client with `getToken` from current session + `onUnauthorized: signOut` → `SettingsProvider` → navigator
- Prefer constructing the client inside a small bridge component that has `useAuth()`, so `getToken` always reads latest session
- Milestone 0 follow-up item “401 → clear session” is closed by this client

### Out of scope

- Live calendar / dropping fixtures (milestone 2)
- PUT settings, onboarding, native credential entry
- BG pill / `/api/bg` (milestone 6)
- Jotai or global app store
- New native modules or SecureStore beyond existing session

## Testing

Land Vitest + MSW per `2026-08-07-vitest-msw-design.md` as part of this work (design approved; harness not yet in tree).

- Default MSW handler: happy-path `GET /api/settings` with `intervalsConnected: true`
- Client unit/integration tests via MSW: 200 parse, 401 triggers `onUnauthorized`, network/timeout errors surface as `ApiError`
- Settings/Calendar behavior tests (RNTL): loading → ready connected shows agenda fixtures; disconnected shows empty state; error + Retry recovers when override returns 200
- No `vi.mock` of app modules; no `fetch` stubbing

## Success criteria

- Signed-in app loads settings with Bearer against Springa (prod or local)
- `intervalsConnected: false` → Calendar empty state, no fixture workouts
- `intervalsConnected: true` → fixture Agenda still shown (until m2)
- Settings fetch failure → error + Retry
- 401 on settings (or any `apiFetch`) → session cleared → login
- `npm test`, `npx tsc --noEmit`, `npm run lint` green

## Verification

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- Android smoke (optional if device available): sign in → Calendar either Agenda or Intervals empty state matching real account; force expired token → login

## Follow-up

Next roadmap milestone: **2 — Live Agenda**.
