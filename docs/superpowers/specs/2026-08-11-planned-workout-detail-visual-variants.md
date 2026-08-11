# Planned workout detail visual variants

Date: 2026-08-11
Status: approved preview
Repo: `springa-native`

## Goal

Render two temporary native planned-workout detail presentations so visual
choice can be made from real workouts on device:

- Easy workouts use the Springa web-parity presentation.
- Other planned workouts use the native-first presentation.

This mapping exists only for preview. After selection, keep one presentation
and remove preview routing.

## Shared decisions

- Existing detail API, TanStack Query hooks, mutation behavior, and server data
  remain the source of truth.
- Form-sheet grabber and platform back gesture dismiss the sheet. The custom X
  control is removed from both normal and missing-event chrome.
- Workout actions move behind a compact ellipsis control. Delete continues to
  use native confirmation. No effort-metric selector is added because native
  has no matching update path.
- Estimated distance displays one decimal place. Estimated timeline durations
  display one decimal place. Raw numeric API values are not mutated.
- Both presentations keep loading, retry, mutation errors, carb editing,
  move, replace, and delete behavior.

## Variant A: web parity

Match the screenshots and web Springa hierarchy:

1. Header with date, workout title, status badge, and compact actions control.
2. Pre-run carbs as a single `Add`/value row; editing controls appear only
   after pressing the row action.
3. Clothing as one surface-alt row with item chips and compact weather text.
4. Tinted warning metric strip for duration, distance, fuel rate, and total
   carbs.
5. Open structure sections with bold headings, repeat pills, left rule, fixed
   duration column, colored zone pills, and detail text.
6. Timeline as a colored bar without a raw concatenated float list.

## Variant B: native first

Use platform list hierarchy while retaining Springa tokens:

1. Header with date, title, status, and compact actions control.
2. A single rounded summary card containing metrics, clothing, and pre-run
   carb value as clearly separated rows.
3. Workout sections as native-style list rows with separators and zone color
   accents, without nested cards.
4. Timeline as a labeled card with the colored bar and rounded segment summary.
5. Mutation flows use native alerts/action choices rather than persistent
   inline controls.

## Verification

- Integration tests assert user-visible rounded values, no custom close button,
  and category-based preview selection.
- Existing API/query/mutation tests remain unchanged except where rendered copy
  changes.
- Run `npm test`, `npm run typecheck`, targeted lint, and Android Argent visual
  QA on one Easy and one interval workout.
