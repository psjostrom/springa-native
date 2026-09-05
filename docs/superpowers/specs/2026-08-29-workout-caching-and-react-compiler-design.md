# Workout Caching, Launch Performance & React Compiler Design

**Date:** 2026-08-29  
**Status:** Approved  
**Topic:** Persistent Offline Workout Caching (Future & Passed Workouts), Cold-Start Hydration & React Compiler

---

## 1. Context & Motivation

Springa previously experienced cold-start latency (~1–2 seconds) and workout drill-down latency (~1–2 seconds) due to unpersisted, in-memory-only React Query caches. On every cold launch, the application displayed a loading spinner while fetching calendar windows over the network. Similarly, opening completed (past) workouts triggered full network requests with zero client-side caching or prefetching.

This design introduces:
1. **Persistent Query Caching with AsyncStorage**: Indefinite local caching (`gcTime: 30 days`, `maxAge: 30 days`) for all calendar events, settings, planned workouts, and completed workout overviews.
2. **Cold-Start Launch Optimization**: Parallel cache hydration alongside auth session restoration so the Agenda renders immediately on boot with **0ms loading delay**.
3. **Dual-Horizon Prefetching**: Prefetching the next 10 upcoming planned workouts (future) and the last 10 completed workouts (past) when the Agenda mounts.
4. **React Compiler Pipeline**: Installing and configuring `babel-plugin-react-compiler` and `eslint-plugin-react-compiler` with strict Rules of React validation for automatic fine-grained UI memoization.

---

## 2. Architecture & Component Design

### 2.1 Persistence Layer & Query Client Configuration

* **Dependencies**:
  * `@react-native-async-storage/async-storage`
  * `@tanstack/react-query-persist-client`
  * `@tanstack/query-async-storage-persister`
* **Persister (`src/query/persister.ts`)**:
  * Create `createAsyncStoragePersister` with key `SPRINGA_REACT_QUERY_CACHE`.
  * Throttle writes (default 1000ms) to avoid excessive disk I/O during rapid pagination or prefetching.
* **Query Client Configuration (`src/query/queryClient.ts`)**:
  * Default `gcTime`: `1000 * 60 * 60 * 24 * 30` (30 days).
  * Default `staleTime`: `1000 * 60` (1 minute).
  * Calendar `staleTime`: `1000 * 60 * 5` (5 minutes).
  * Planned Workout Detail `staleTime`: `1000 * 60 * 5` (5 minutes).
  * Completed Workout Overview `staleTime`: `1000 * 60 * 60 * 24` (24 hours).
  * Settings `staleTime`: `1000 * 60 * 10` (10 minutes).

### 2.2 Cold-Start Hydration & Splash Screen Coordination

* **Hydration State (`src/query/QueryProvider.tsx`)**:
  * Use `PersistQueryClientProvider` with `asyncStoragePersister`.
  * Track `isHydrated` state and provide context/hook `useQueryHydration()` so layout controllers can coordinate splash screen dismissal.
* **Root Layout Controller (`src/app/_layout.tsx`)**:
  * `SplashScreenController` prevents auto-hiding until **both** `AuthContext.status !== 'loading'` and `QueryHydration.isHydrated === true`.
  * When splash screen hides and `(tabs)/index` mounts:
    * `useSettingsQuery` reads persisted settings immediately (`status === 'ready'`).
    * `useCalendarEvents` reads persisted calendar pages immediately (`isLoading === false`).
    * The Agenda renders the user's workouts on the first frame with no loading spinner.
    * TanStack Query performs stale-while-revalidate background fetches without blocking the UI.
* **Sign-Out Eviction (`src/auth/session.ts` & `src/query/persister.ts`)**:
  * On sign-out, `queryClient.clear()` is called and `SPRINGA_REACT_QUERY_CACHE` is cleared from `AsyncStorage` to avoid data leakage between users.

### 2.3 Dual-Horizon Workout Caching & Prefetching

* **Calendar Events (`src/query/useCalendarEvents.ts`)**:
  * Infinite query `['calendar', identity]` stores all 12-day date window pages.
  * In addition to hydrating cached pages, on mount `useCalendarEvents` warms the immediate prior history page (`today-12d → today-1d`) and next upcoming page in the background if not already cached.
  * Tapping "Earlier workouts" renders previously loaded or warmed history instantly.
* **Completed Workout Detail Prefetching (`src/query/useCompletedWorkoutOverview.ts`)**:
  * Export `completedWorkoutOverviewQueryOptions(client, identity, activityId)` and `prefetchCompletedWorkoutOverview(queryClient, client, identity, activityId)`.
* **Agenda Dual Prefetching (`src/components/agenda/AgendaList.tsx`)**:
  * When `AgendaList` mounts, it extracts:
    1. The first **10 upcoming planned workouts** (future).
    2. The last **10 completed workouts** (past).
  * Prefetches details for all 20 workouts concurrently in the background using `queryClient.prefetchQuery`.
  * Navigating to `/workout/[id]` for any of these workouts renders the detail view with 0ms delay.

### 2.4 React Compiler Integration

* **Build Tooling (`package.json`, `app.json`)**:
  * Add `babel-plugin-react-compiler` and `eslint-plugin-react-compiler` to `devDependencies`.
  * `app.json` specifies `"experiments": { "reactCompiler": true }` to activate the compiler via `babel-preset-expo`.
* **Linting (`eslint.config.js`)**:
  * Configure `eslint-plugin-react-compiler` with rule `'react-compiler/react-compiler': 'error'`.
  * Validates that all UI components and hooks follow the Rules of React.
* **Runtime Benefits**:
  * Eliminates redundant re-renders of Agenda cards, status pills, and list shells during background query refetches.
  * Smooth 60/120fps list scrolling without manual hook memoization churn.

---

## 3. Data Flow & State Management

```text
[App Launch]
    │
    ├──> AuthProvider loads SecureStore session ──┐
    │                                             ├──> Both Ready? ──> Hide Splash Screen
    └──> QueryProvider restores AsyncStorage ─────┘                          │
                                                                             ▼
                                                                Mount (tabs)/index (Agenda)
                                                                             │
                                              ┌──────────────────────────────┴──────────────────────────────┐
                                              ▼                                                             ▼
                                     Render Hydrated Data                                      Background Operations
                                    (0ms first paint, no spinner)                                            │
                                                                              ┌─────────────────────────────┼─────────────────────────────┐
                                                                              ▼                             ▼                             ▼
                                                                     Revalidate Stale Pages      Prefetch Top 10 Future       Prefetch Top 10 Past
                                                                     (Silent network sync)       (Planned Workouts)           (Completed Workouts)
```

---

## 4. Resilience & Error Handling

1. **Offline Mode**: If network requests fail during background revalidation or prefetching, React Query retains and serves all persisted data from `AsyncStorage`. No error screens or flashes interrupt the user.
2. **Corrupt Storage Guard**: If storage data fails to parse or schema version mismatches, the persister catches the exception, clears the invalid cache key, and initiates a clean network fetch.
3. **Storage Quota & Concurrency**: Throttled writes and async non-blocking operations prevent JS thread jank or AsyncStorage saturation.

---

## 5. Testing & Verification

1. **Unit & Integration Tests (`npm test`)**:
   * Test `QueryProvider` hydration and persistent storage integration with mock storage.
   * Test `prefetchCompletedWorkoutOverview` and `prefetchPlannedWorkoutDetail`.
   * Test `AgendaList` prefetching logic for 10 future and 10 past workouts.
   * Verify all 31+ Vitest test suites continue to pass.
2. **Type Checking & Linting**:
   * `npm run typecheck` (`tsc --noEmit`) passes with zero errors.
   * `EXPO_NO_TELEMETRY=1 npx eslint .` passes with React Compiler rules enabled.
