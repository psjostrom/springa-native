# Milestone 0 — remaining to fully done

Date: 2026-08-06  
Branches: `springa` `feature/native-mobile-auth` · `springa-native` `feature/native-auth`  
Specs: `2026-08-06-native-auth-design.md` (native) · `2026-08-06-native-mobile-auth-design.md` (springa)

Code for milestone 0 is implemented and reviewed. These items are still required before auth is “fully done” end-to-end.

## Must do (blocks live sign-in)

1. **Google Cloud — Android OAuth client (debug)**  
   Package: `com.springa.app`  
   Debug SHA-1: `36:09:BC:CD:FE:07:CD:01:16:A1:D1:47:5F:07:91:8A:4D:BA:F2:B3`  
   Covers local `expo run:android` / debug keystore only — not Play/release builds.  
   Web client id already used as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / Springa `GOOGLE_CLIENT_ID`.

2. **Ship Springa API**  
   Merge/deploy `feature/native-mobile-auth` so the URL in native `.env` (`EXPO_PUBLIC_SPRINGA_API_URL`, normally `https://www.springa.run`) includes:
   - `POST /api/auth/mobile`
   - Bearer support in `requireAuth`
   - `/api/*` proxy passthrough (no HTML redirect to `/login`)

   *Or* for local QA only: run Springa on a reachable host/port and point `.env` at it (emulator `10.0.2.2`, device `adb reverse`).

3. **Live Google E2E on device/emulator**  
   - Continue with Google → lands on Calendar  
   - Kill app → relaunch still signed in  
   - Sign out (TopBar gear) → login  
   - Optional: authenticated `GET /api/settings` with stored Bearer → 200

4. **Web regression**  
   After Springa deploy: cookie Google login and normal `/api/*` cookie session still work.

## Should do soon (not blocking first successful sign-in)

5. **iOS OAuth** — Replace `iosUrlScheme` placeholder in `app.json` before iOS builds matter.  
6. **Native `.env`** — Ensure local `.env` (gitignored) has `EXPO_PUBLIC_SPRINGA_API_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; never commit it.  
7. **401 → clear session** — Done in milestone 1 via `createApiClient` `onUnauthorized` → `signOut`.
8. **Google Cloud — Android OAuth client (release)** — Before shipping a signed/Play build, add another Android OAuth client (or cert) for `com.springa.app` with the **release** keystore SHA-1. Debug alone will not authorize release binaries.

## Done (reference)

| Area | Status |
|------|--------|
| Springa mobile JWT + Google idToken verify | Done |
| `POST /api/auth/mobile` | Done |
| Bearer `requireAuth` + cookie precedence | Done |
| Proxy: `/api/*` no HTML login redirect | Done |
| Native Google Sign-In + SecureStore session | Done |
| Login gate + TopBar sign-out | Done |
| Session restore / exchange validation hardening | Done |
| Local API smoke (400/401 mobile, Bearer settings 200) | Done on `:3001` |

## Out of milestone 0

Roadmap milestones 1–6 (API client, live Agenda, workout detail, BG pill, etc.) — see `2026-08-06-native-core-parity-roadmap-design.md`.
