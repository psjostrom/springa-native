# Native auth (milestone 0)

Date: 2026-08-06  
Status: approved for planning  
Repos: `springa-native` (client) + `springa` (API)  
Parent: `docs/superpowers/specs/2026-08-06-native-core-parity-roadmap-design.md`

## Goal

Google sign-in on the native app, with a mobile-holdable Springa session that authenticates the same `/api/*` routes the PWA uses via cookies. Web login stays unchanged.

## Decisions

| Topic | Choice |
|-------|--------|
| Google on device | `@react-native-google-signin/google-signin` (not AuthSession) |
| Session | Google `idToken` → Springa-signed JWT stored in SecureStore |
| API auth | `Authorization: Bearer <jwt>`; `requireAuth` accepts cookie **or** Bearer |
| Identity | Same as web: `session.user.email` / JWT `email` |
| Scopes (native) | `openid email profile` only — no Calendar offline consent yet |
| Token lifetime | ~30 days; re-sign-in on expiry (no refresh in v1) |
| Google Cloud | `webClientId` = existing Springa web OAuth client; Android client for `com.springa.app` + signing SHA-1 (debug now; add release SHA-1 before Play/signed builds) |

Rationale: Expo recommends native Google Sign-In; browser AuthSession for Google on Android is effectively blocked. Springa remains the session authority so Intervals/NS secrets never ship on device.

## Flow

```text
Native Google Sign-In
  → idToken
  → POST {SPRINGA_API}/api/auth/mobile  { idToken }
  → Verify Google token (aud, iss, email_verified)
  → ensureUserSettings(email)
  → { token, expiresAt, user: { email } }
  → SecureStore
  → Authorization: Bearer <token> on later /api/* calls
```

## Springa (backend)

### `POST /api/auth/mobile`

- No cookie session required
- Body: `{ idToken: string }`
- Verify with Google (`google-auth-library` or equivalent): `aud` = `GOOGLE_CLIENT_ID`, email present and verified
- Call existing `ensureUserSettings(email)` (same as NextAuth `signIn` callback)
- Sign JWT with server secret; claims: `email`, `iat`, `exp`, `aud: "springa-native"`
- Response `200`: `{ token, expiresAt, user: { email } }` — `expiresAt` is Unix seconds
- `401` on invalid/unverified token

### `requireAuth()`

1. Try existing `auth()` cookie session → email  
2. Else parse `Authorization: Bearer` → verify Springa JWT (`aud`, `exp`) → email  
3. Else throw `AuthError`

Web routes and NextAuth Google provider (including Calendar scope / refresh token storage) unchanged.

### `proxy.ts`

- Pass through `/api/auth/mobile` without requiring login (same family as `/api/auth/*`)
- Do not HTML-redirect API clients that send Bearer to `/login`; handlers already return JSON 401 via `unauthorized()`

## Native (client)

### Dependencies / config

- `@react-native-google-signin/google-signin` + config plugin in `app.json`
- `expo-secure-store`
- `EXPO_PUBLIC_SPRINGA_API_URL` (prod `https://www.springa.run`)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Springa web client id — public)
- Rebuild dev client after native module add (`npx expo run:android`)

### UX / routing

- Unauthenticated → login screen (brand + Continue with Google); tabs unreachable
- Root layout restores SecureStore token on launch; brief loading until resolved
- Sign-out: clear SecureStore + `GoogleSignin.signOut()` → login
- Settings gear may trigger sign-out this milestone; full Settings deferred
- Google cancel → stay on login without noisy errors
- 401 on authenticated calls → clear session → login

### Out of scope

- Calendar / BG API client (milestone 1+)
- Refresh tokens, biometrics
- Native Google Calendar consent / refresh-token capture
- Changing web NextAuth flows

## Security

- Never ship Google client **secret** in the app
- Do not log tokens
- Verify Google `idToken` server-side before issuing Springa JWT
- SecureStore for the Springa JWT only

## Success criteria

- Device: Google sign-in → JWT stored → survives process kill → sign-out clears it
- `requireAuth` works for cookie (web) and Bearer (native)
- Existing web Google login and API cookie auth unchanged
- First native sign-in for an existing web user hits the same `user_settings` row

## Verification

- Springa: tests for mobile exchange + Bearer path in `requireAuth` (existing MSW / auth-boundary patterns)
- Native: `npx tsc --noEmit`, `npm run lint`
- Android smoke: sign in, restart app (session restored), sign out; optional smoke `GET /api/settings` with Bearer once backend is up

## Follow-up

Implementation plans (gitignored under `docs/superpowers/plans/` in native; Springa half may live in `springa` as a normal PR). Next roadmap milestone after this ships: **1 — API client + settings gate**.

Before release/Play builds: register the release keystore SHA-1 on a Google Cloud Android OAuth client for `com.springa.app` (debug SHA-1 only covers local debug installs).
