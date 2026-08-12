# Native workout detail design

Date: 2026-08-11
Revised: 2026-08-12
Status: implemented and verified
Repo: `springa-native`

## Goal

Make planned workout detail a quiet, readable native screen. Keep Springa's
content and semantic color tokens, while leaving navigation, menus, date/time
selection, dismissal, and destructive-action presentation to platform controls.

## Ownership

- Springa API owns workout, fuel, clothing, weather, replacement, and mutation
  semantics.
- TanStack Query owns server state. UI state contains only temporary editor
  drafts and presentation state.
- `/workout/[id]` owns navigation and presentation of workout actions.
- Planned workout detail owns data rendering and mutation feedback.
- The carb editor owns only its input draft, validation, and focus lifecycle.

## Screen hierarchy

- Keep `/workout/[id]` as a full-screen native stack card titled `Workout`.
- Show workout name once in content, followed by date and a quiet status label.
- Present duration, distance, fuel, and total carbs as a compact wrapping summary
  on `SpringaColors.tintBrand`, with a subtle brand border. This remains the
  screen's one quiet brand-tinted surface.
- Group pre-run carbs and clothing as restrained information rows.
- Make workout structure the primary surface. Use open rows, separators, and zone
  accents instead of nested cards.
- Place the timeline bar inside the structure section. Do not render a separate
  Timeline card or duplicate segment-duration text.
- Render user-facing workout notes after structure when present.

All layouts must wrap at enlarged text sizes. No fixed-width text fields or
percentage-based card grids.

## Actions

Keep the toolbar ellipsis, but make it present a Springa-styled bottom sheet
rather than a popup menu. Use `@expo/ui/community/bottom-sheet` so the platform
owns modal presentation, backdrop, gestures, and dismissal while Springa owns the
sheet content.

- Root sheet: Replace, Move, Delete workout.
- Replace: switch the sheet content to compact labeled choices. Omit the current
  replacement category. Unknown or custom legacy workouts show all choices.
- Move: dismiss the sheet and open the native date picker, followed by the native
  time picker. Confirming time starts the move immediately. Cancelling either
  picker makes no change. No in-screen move editor, Save Move, or Cancel remains.
- Delete: switch the sheet to a restrained destructive confirmation. Dismissing
  the sheet is cancellation; no explicit Cancel button is needed.

The backdrop stays fixed while the sheet moves. After any dismissal, the
underlying screen must accept the next tap immediately. If the Expo UI sheet
still intercepts taps after it is visually gone, use the existing Expo Router
`formSheet` route instead; do not add a timeout or input delay workaround.

No custom transparent `Modal`, moving backdrop, toolbar popup menu, replacement
Cancel button, move form, or `Alert.alert` confirmation remains.

## Replacement contract and behavior

The API detail response adds one authoritative field:

```ts
replacementCategory: 'easy' | 'quality' | 'long' | 'club' | null
```

The server resolves this value from persisted workout intent. Replacement must
persist the exact selected intent so a later detail request can distinguish
quality from club. Native must not infer it from workout names, descriptions, or
broad event categories.

Selecting a replacement immediately shows the selected label with a spinner and
prevents another action. Stale name and structure are not presented as the new
workout. After the replace request succeeds, fetch the new planned detail and
commit that single detail object to the Query cache. Both heading and structure
render from it, so they change together. Calendar refresh happens after that
screen commit and cannot cause a second visible detail-screen update.

Failure restores the prior workout and leaves the action sheet available with an
inline retryable error.

## Pre-run carbs

- Pressing the row enters one compact numeric input and focuses it immediately.
- Keyboard Done and real blur both submit the current draft through one guarded
  commit path.
- Empty input saves `null`; invalid or negative values stay in edit mode with an
  inline error.
- Successful save updates the planned-detail Query cache directly and exits edit
  mode. It does not invalidate Calendar or remount the detail screen.
- Input width grows with text and uses a short `0` placeholder.

## Mutation cache behavior

- Move optimistically updates the detail date and matching cached Calendar event,
  then rolls both back on failure.
- Replace keeps the existing detail until pending UI takes over, then writes the
  freshly fetched replacement detail once. It does not independently refetch the
  heading and body.
- Carb save updates only the current planned-detail cache.
- Delete closes the route after server success and invalidates Calendar without
  refetching the active detail. Normal Query garbage collection removes the now
  unreachable detail cache.

## Design-system fit

Use existing semantic `SpringaColors` and `HrZoneColors`; add no screen-local raw
brand colors. Native controls own platform chrome. Keep local layout components
focused on semantic roles so a later design-system task can promote repeated
patterns only after another screen proves reuse.

## Verification

- Integration tests cover carb submit/blur, validation, cache behavior, mutation
  failures, same-category omission, pending replacement state, atomic replacement
  rendering, direct move confirmation, and workout actions.
- Existing API parsing and rendering coverage remains green.
- Run focused tests, full tests, typecheck, lint, and Android device QA.
- Device QA covers sheet motion, an immediate underlying-screen tap after sheet
  dismissal, direct move on date/time confirmation, picker cancellation, delete
  confirmation without executing it on non-disposable data, replacement pending
  feedback, carb save on blur/Done, scroll reachability, and enlarged-text layout.
