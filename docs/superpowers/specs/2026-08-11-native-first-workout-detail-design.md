# Native-first workout detail design

Date: 2026-08-11
Status: approved for implementation
Repo: `springa-native`

## Goal

Make planned workout detail feel like a native screen rather than a large
interactive form sheet, while retaining Springa's dark tokens, workout data,
and M4 mutations.

## Navigation

`/workout/[id]` changes from Expo Router `formSheet` presentation to a normal
full-screen native stack screen. Native stack back navigation handles dismissal;
the content must not add a competing close control. The screen owns one
full-height `ScrollView`, so scrolling reaches both ends without the sheet
gesture intercepting the final drag.

## Layout

- Keep the existing workout header content: date, name, and status badge.
- Use one summary surface with metrics, pre-run carbs, and clothing.
- Keep workout structure as readable native-style rows with colored zone pills,
  repeat badges, left rules, and separators.
- Render timeline as colored bar only; keep segment accessibility labels but no
  concatenated duration text.
- Render `event.description` below structure/timeline when non-empty.
- Keep estimated distance and timeline values rounded for visible labels; do not
  mutate API data.

## Actions

- Ellipsis opens a native `Alert` action list for Replace, Move, and Delete.
- Replace opens a second native action list with Easy, Quality, Long, Club Run,
  and Cancel. It does not render a card over workout content.
- Move keeps its existing validated inline editor because cross-platform native
  date prompt support is not available without adding a module.
- Delete keeps native confirmation and existing mutation/error behavior.

## Pre-run carbs

The default state remains one compact row. Editing expands only that row into a
single-line input/action layout where width allows; no separate editor card or
multi-row summary surface is introduced. Save, clear, cancel, validation, and
mutation feedback remain user-visible and accessible.

## Architecture

Keep query, API parsing, mutations, formatting, and shared workout structure
components. Remove temporary web/native preview routing and keep the native
renderer as the only planned-detail presentation after migration.

## Verification

- Integration tests cover full-screen route options, inline carb editing,
  native action choices, description visibility, timeline bar-only output, and
  no custom close button.
- Run focused tests, full `npm test`, typecheck, targeted lint, and Android QA
  for open, scroll-to-bottom/back-to-top, carbs, replace, move, and delete.
