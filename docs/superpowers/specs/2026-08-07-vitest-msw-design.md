# Vitest + MSW + RNTL testing setup

Date: 2026-08-07  
Status: approved for planning  
Repo: `springa-native` (Expo SDK 57)

## Goal

Replace Node’s built-in test runner with a Vitest-based stack suitable for React Native: real-RN fidelity via `vitest-native`, component tests via React Native Testing Library, and network interception via MSW. Migrate the two existing `node:test` suites to the new runner without changing their behavior.

## Decisions

| Topic | Choice |
|-------|--------|
| Runner | Vitest 4.x (single project) |
| RN under Vitest | `vitest-native` with `reactNative()` default (`engine: 'native'`); `engine: 'mock'` only per-file later if needed |
| Default platform | `android` (matches current QA) |
| Component testing | `@testing-library/react-native` |
| Network mocking | MSW 2.x via `setupServer` from **`msw/node`** |
| Handler structure | Happy-path defaults composed by domain; overrides via `server.use` |
| URL style | Absolute URL helpers (`apiUrl(path)`), not wildcard `*/…` matchers |
| Lint | Port Springa’s test bans (`vi.mock`, `mockResolvedValue*`, `fetch` stubbing, etc.) onto `*.{test,spec}.{ts,tsx}` |
| Scripts | `"test": "vitest run"`, `"test:watch": "vitest"` |

### Why `msw/node` (not `msw/native`)

[MSW React Native docs](https://mswjs.io/docs/integrations/react-native) state that unit/integration tests that render components in isolation (Vitest/Jest) must use the **Node.js integration**. `msw/native` is for MSW inside the RN app process (dev/device), including URL/TextEncoder polyfills. That path is out of scope for this setup.

`code/mobile-app` uses `msw/native` under Jest; that contradicts MSW’s testing guidance and is **not** copied.

## Out of scope

- In-app / device MSW (`msw/native`, polyfills, `__DEV__` listen)
- Dual Vitest projects (`unit` / `flow` / `integration`) — revisit when the suite needs it
- Global fake timers
- First real API client or auth network tests (handlers stay empty or minimal until then)
- Dropping `tsx` for non-test uses (only remove as test runner)

## Architecture

```text
vitest.config.mts                # reactNative({ platform: 'android' }), setupFiles
src/test/msw/
  server.ts                      # setupServer(...handlers) from msw/node
  setup.ts                       # listen / resetHandlers / close
  helpers.ts                     # apiUrl(path), jsonOk(body, init?), shared builders
  handlers/
    index.ts                     # compose domain happy-path arrays
    auth.ts                      # first domain slice when APIs exist (may start empty)
  fixtures/                      # shared happy-path response bodies (as needed)
```

Vitest includes `src/**/*.{test,spec}.{ts,tsx}`. Existing colocated tests stay next to source (`src/fixtures/agenda.test.ts`, `src/auth/session.test.ts`).

### MSW rules

Aligned with [structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers) and [base URL helpers](https://mswjs.io/docs/recipes/using-base-url); refined with mobile-app’s default-vs-local split where it does not fight MSW:

1. **Default handlers** = global happy paths only (success responses). Composed in `handlers/index.ts`.
2. **Local overrides** = anything a test’s `expect` depends on, plus errors / empty / auth-fail — via `server.use(...)` (or a thin `setupXHandler()` that only calls `use`).
3. Never change a default handler to make one test pass.
4. `onUnhandledRequest: 'error'` so missing defaults fail loudly.
5. `afterEach` → `server.resetHandlers()`.
6. No request-capture / assert-on-call-count helpers by default (integration-over-isolation; Springa capture style only if a later test needs user-visible behavior that requires them).

Until a real HTTP client exists, the composed handlers array may be empty; the directory layout and helpers still ship so the first networked feature adds domain handlers instead of inventing structure.

### Helpers

`helpers.ts` holds shared happy-path builders used by default handlers (and optionally by overrides):

- `apiUrl(path)` — resolve against the app’s API base (constant or env once defined; placeholder base until then)
- `jsonOk(body, init?)` / similar thin `HttpResponse` wrappers

These are MSW utilities, not mocks of app modules.

### Existing tests

Rewrite to Vitest `describe` / `it` / `expect`:

- `src/fixtures/agenda.test.ts` — same fixture assertions
- `src/auth/session.test.ts` — same validity/parse/queue behavior; keep in-memory `SessionStore` (allowed boundary redirect; not `vi.mock` of app code)

No MSW usage required in those files today.

### Lint & docs

- Extend `eslint.config.js` with Springa-equivalent `no-restricted-syntax` bans scoped to test files.
- Update `AGENTS.md` and `README.md` commands: `npm test` / Vitest (drop `node --import tsx --test …` as the documented runner).

## Verification

- `npm test` runs both migrated suites green
- `npx tsc --noEmit` and `npm run lint` clean
- A one-line smoke that imports `server` / helpers typechecks (no need for a networked test until an API exists)

## Pointers from mobile-app (selective)

**Adopt:** domain-composed happy-path defaults; local `server.use` for asserted data and errors; fail on unhandled requests; optional `setupXHandler` wrappers; RNTL + behavior-first / flat tests.

**Reject:** Jest stack; `msw/native` in Vitest; wildcard URL matchers as the primary style; per-test registration of happy paths; dual spec/flow projects and global fake timers for day one.
