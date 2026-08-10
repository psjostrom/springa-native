# Native core parity roadmap

Date: 2026-08-06  
Status: approved for planning  
Repo: `springa-native` (Expo SDK 57)  
Companion: web Springa (`psjostrom/springa`) remains the API and domain brain

## Goal

Ordered milestones from today’s Agenda shell mock to a **usable native core**: authenticated live Agenda, clickable planned + completed workouts (planned full detail; completed Overview only), and a live BG pill.

This is a **milestone roadmap**, not an implementation plan. Each milestone needs its own approved design spec before coding. Auth, networking, and stores remain blocked until those specs exist (see `AGENTS.md`).

## Scope

### In this roadmap

- Google OAuth + a mobile-holdable session against Springa `/api/*`
- Typed API client + settings gate (`intervalsConnected`, `diabetesMode`, …)
- Live Agenda from Intervals via Springa (replace fixtures)
- Tap → workout detail navigation
- Planned detail at web EventModal planned parity (structure, fuel, clothing, pre-run carbs, move / replace / delete)
- Completed / missed → Overview only
- Live BG pill via Springa `/api/bg` (Scout/Nightscout server-side)

### Explicitly deferred

- Month / Week calendar bodies (leave switcher inert or hide)
- Completed Deep Dive and Analysis
- Intel, Coach, Planner, Simulate (tabs stay shell placeholders)
- Native onboarding / full settings (assume Intervals + NS already connected on web)
- Google Calendar sync, push notifications, working theme toggle
- Direct Intervals or Scout access from the device

## Architecture decisions

| Topic | Choice |
|-------|--------|
| Data path | Native is a **client of the Springa backend** only |
| Secrets | Intervals / Nightscout keys stay server-side |
| Auth | Google OAuth; session must work for native (cookie-only Auth.js is insufficient) |
| Domain logic | Stays on Springa server; do not reimplement calendar pipeline / report card / BG model in the app |
| Fixtures | Drop for Agenda once live calendar works; no mock HTTP clients |
| Platform QA | Android primary; keep iOS-safe APIs |

Rationale: Springa already owns training + BG product logic. Native replaces the PWA client, not a second Intervals/Scout client. Long-term, when the web UI goes away, the `/api` layer (or a later extracted API) remains the service.

## Ordered milestones

Suggested execution: **0 → 1 → 2 → 3 → 4 → 5 → 6**.  
Milestones 4 and 5 both depend on 3; prefer **4 before 5**. Milestone 6 can overlap once 1 exists, but Agenda is not blocked on BG.

| # | Milestone | Delivers | Depends on |
|---|-----------|----------|------------|
| **0** | Auth + mobile session | Google sign-in; Springa issues a session the app attaches to `/api/*`; unauthenticated gate | — |
| **1** | API client + settings gate | Typed fetch to Springa; read settings; empty/error if Intervals not connected | 0 |
| **2** | Live Agenda | Replace fixtures with calendar API; upcoming + expandable history; real statuses | 1 |
| **3** | Workout navigation shell | Tap card → detail route; branch planned vs completed/missed | 2 |
| **4** | Planned detail (full) | Structure, fuel, clothing, pre-run carbs, move/replace/delete via existing Springa APIs | 3 |
| **5** | Completed Overview | Overview widgets only (report card, stats, splits, carbs, feedback as data allows); missed state; no Deep Dive/Analysis | 3 |
| **6** | Live BG pill | Poll `/api/bg`; hide when diabetes off / stale / missing — same rules as web | 1 |

### Milestone notes

**0 — Auth**  
Hard gate for all real data. Design must cover Google OAuth on device, token/session storage, refresh, logout, and how `requireAuth()`-backed routes accept the native session. Web cookie JWT alone is not enough.

**1 — API client**  
Single authenticated client to Springa production (and local/dev URLs as needed). Settings read is enough to know whether calendar/BG can work. Full native Settings UI is out of scope; fail clearly if the web account is not connected.

**2 — Live Agenda**  
Parity target: web `AgendaView` behavior on mobile (upcoming vs history), not Month/Week. Card visuals already exist; wire real `CalendarEvent` data. Remove fixture-driven Agenda once this lands.

**3 — Navigation**  
Expo Router `formSheet` (`/workout/[id]`) equivalent of web `?workout=` → `EventModal`. Establish the planned vs completed branch before filling either body.

**4 — Planned detail**  
Full planned actions, not read-only. Prefer reusing existing Springa mutation routes over inventing new ones.

**5 — Completed Overview**  
Match web Overview tab widget set where APIs already support it (`report-card`, `stats`, `pace-splits`, carbs, feedback, etc.). Streams/Deep Dive and AI Analysis wait for a later roadmap.

**6 — Live BG**  
Replace the static header pill. Same visibility rules as web `CurrentBGPill`. Graph popover can be minimal or follow-up inside this milestone’s own design.

## Working rules

1. **One milestone → one design spec → then plan/implement.** This roadmap does not authorize auth or networking code by itself.
2. **No drive-by full parity.** Deferred surfaces stay deferred until a later roadmap.
3. **Ask before** new native modules, persistence beyond session needs, or physical-device data wipes (`AGENTS.md`).
4. **Verify** with the repo’s usual commands (`tsc`, lint, fixture tests where relevant) plus Android smoke for UI milestones.

## Success criteria (roadmap complete)

- Signed-in user sees real Intervals workouts on Calendar/Agenda
- Planned run: open and perform move/replace/delete and pre-run carbs against Springa
- Completed run: open Overview (not Deep Dive/Analysis)
- Header BG pill reflects live CGM when diabetes mode and NS are configured
- Intel / Coach / Planner / Simulate still placeholders; Month/Week still not built

## After this roadmap (not ordered here)

Completed Deep Dive / Analysis → Month/Week → Intel → Coach / Planner / Simulate (order TBD when that work starts).

## References

- Native shell: `docs/superpowers/specs/2026-08-06-app-skeleton-mockup-design.md`
- Web Agenda / modal: `AgendaView`, `EventModal`, `lib/modalWidgets.ts` in `springa`
- Web auth: `lib/auth.ts`, `requireAuth()` in `lib/apiHelpers.ts`
- Constraints: `AGENTS.md` (auth before real data; no networking without approved design)
