# Springa Native Design System

## Goal

Establish one native design system for every implemented Springa Native surface. It carries Springa's visual identity from the web product while keeping navigation, sheets, controls, typography, and interaction behavior native to each platform.

Phase one delivers the shared tokens and components; migrates the shell, login and QA login, Calendar/Agenda, placeholder tabs, completed-workout placeholder, planned workout detail, and workout actions; then removes the unused Expo template theme path.

## Design philosophy

1. **Native first.** Use platform navigation, tabs, sheets, controls, gestures, fonts, safe areas, and accessibility behavior. Brand comes from content, semantic color, data presentation, and restrained accents.
2. **Dense data, calm hierarchy.** Training metrics should scan quickly without turning every value into a competing card or accent.
3. **Semantic tokens over visual literals.** Components ask for meaning such as `brand`, `muted`, `warning`, or `surfaceAlt`; feature code does not own palette values.
4. **Color supports meaning.** Status color is always paired with text, an icon, or both. Color alone never communicates workout or glucose state.
5. **One owner and one path.** Theme values live in `src/theme/`; global visual behavior lives in `src/components/ui/`. No parallel provider or compatibility theme remains.
6. **Accessible by default.** Text keeps native font scaling. Interactive controls have a minimum 44-point target, visible disabled and pressed states, and an accessible name.
7. **Dark only.** This phase implements the product's existing dark shell. Light mode requires its own product design rather than mirrored placeholder values.

## Color palette

Values come from Springa's web theme and existing native HR-zone colors.

### Core

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#13101c` | App and screen background |
| `surface` | `#1d1828` | Primary cards, sheets, and shell chrome |
| `surfaceAlt` | `#241e30` | Nested cards, inputs, inactive controls |
| `border` | `#2e293c` | Standard boundaries |
| `borderSubtle` | `#4a4358` | Stronger separators and structure guides |
| `text` | `#ffffff` | Primary copy |
| `muted` | `#af9ece` | Secondary copy and inactive icons |
| `brand` | `#f23b94` | Identity, selection, links, and focus |
| `brandText` | `#f64a9d` | Brand-colored text and icons on any dark system surface |
| `brandAction` | `#d42c85` | Solid primary buttons; white text meets AA contrast |
| `glucose` | `#00ffff` | Glucose-specific chart accent, not glucose status |
| `chartPrimary` | `#8b5cf6` | Primary chart series |
| `chartSecondary` | `#06b6d4` | Secondary chart series and neutral data accents |

### Semantic state

| Token | Value | Paired tint |
| --- | --- | --- |
| `success` | `#4ade80` | `tintSuccess: #1a3d25` |
| `warning` | `#ffb800` | `tintWarning: #3d2b1a` |
| `error` | `#ff4d6a` | `tintError: #3d1525` |
| `brand` | `#f23b94` | `tintBrand: #2d1a35` |

`brandText` is the accessible foreground token for brand-colored normal text. It has at least 4.8:1 contrast on `bg`, `surface`, `surfaceAlt`, and `tintBrand`; `brand` remains the product identity, selection, and non-text accent. Brand badges use primary `text` on `tintBrand` rather than pink text.

Solid destructive actions are avoided. Destructive buttons use `error` text on `tintError`, preserving contrast while distinguishing them from the primary action.

### Heart-rate zones

| Zone | Value |
| --- | --- |
| Z1 | `#6ee7b7` |
| Z2 | `#06b6d4` |
| Z3 | `#fbbf24` |
| Z4 | `#fb923c` |
| Z5 | `#ef4444` |

Zone colors keep fixed domain meaning. Generic success or warning components must not reuse zone names as semantic aliases.

## Global tokens

`src/theme/tokens.ts` owns:

- Typography: `title` 28/34 weight 800, `heading` 22/28 weight 800, `subheading` 17/24 weight 700, `body` 16/24 weight 400, `label` 14/20 weight 600, and `caption` 12/16 weight 500.
- Spacing: 2, 4, 8, 12, 16, 24, and 32 points.
- Radius: 6, 8, 12, and 16 points plus pill radius.
- Icon sizes: 16, 20, and 24 points.
- Minimum touch target: 44 points.

Components use system fonts. No font package or theme provider is added.

## Global components

Components in `src/components/ui/` are presentational. They accept data and callbacks through props and never read Query, auth, Router, or Zustand state. Existing application-shell components remain outside that boundary.

### Existing shell

`ScreenShell` remains the screen-root primitive. It accepts screen content only and owns the Springa background and shared top bar placement; each screen owns its content title. NativeTabs remains platform-owned and outside the component library.

### `AppText`

Wraps React Native `Text` and retains `TextProps`. It provides the six typography variants and semantic tones: primary, muted, brand, success, warning, and error. The brand tone resolves to `brandText`; state tones remain restricted to their documented contrast-safe tint or dark-surface pairings. Callers may compose layout styles but do not restate typography or palette values.

### `Card`

Provides a border, continuous radius where supported, and one standard padding. It accepts arbitrary children and three semantic tones: `default` uses `surface`, `subtle` uses `surfaceAlt`, and `brand` uses `tintBrand` with the translucent brand border used by Springa's workout summary. Callers own content and layout, not repeated card colors or boundaries.

### `Button`

Provides primary, secondary, and destructive variants. It owns pressed, disabled, and loading presentation and the minimum touch target. Primary uses `brandAction`; destructive uses the error tint treatment. Additional sizes or variants wait for a concrete consumer.

### `IconButton`

Provides the current transparent icon-only action with a required accessibility label and 44-point target. It is used for shell and sheet chrome where a full text button is inappropriate. Visual variants wait for a concrete consumer.

### `Badge`

Provides neutral, brand, success, warning, and error treatments. Brand badges use primary text on `tintBrand`; semantic badges use contrast-safe foreground/tint pairs. Badge text is required so status never depends on color alone.

### `AppBottomSheet`

Wraps Expo UI's controlled platform sheets for transient, local interactions. React state owns visibility through `isPresented`; no imperative ref or `present()`/`dismiss()` method is exposed to application or feature code. Android's wrapper privately owns the Compose `ModalBottomSheetRef` because `hide()` is the platform API whose promise resolves after the native exit animation. iOS uses the universal Expo `BottomSheet` completion callback. Android continues to use Compose `ModalBottomSheet` directly so Springa can set native container/content colors, with a device-width `Host` so React Native content and hit targets remain full width.

The wrapper owns Springa surface color, content spacing, native drag indication, pan/back/scrim dismissal, React Native hosting, keyboard-to-sheet presentation sequencing, and native dismissal completion. Its public contract is `AppBottomSheet({ children, isPresented, onDismiss, onDismissComplete? })`: `onDismiss` requests caller-owned visibility to become false, while `onDismissComplete` fires only after native dismissal finishes. If the keyboard is visible when `isPresented` becomes true, the wrapper dismisses it and waits for `keyboardDidHide` before mounting the sheet. Content and feature mode remain caller-owned. Snap points stay out of the first contract until a concrete consumer needs them.

Router stack screens remain the separate choice for navigable, deep-linkable content. Workout detail stays a full-screen route-owned stack `card`; this migration does not change its presentation. No abstraction attempts to hide route presentation and transient bottom sheets behind one modal API.

Workout actions is the first `AppBottomSheet` consumer.

### `Section`

Groups a text heading and arbitrary content. It standardizes current section spacing without predicting icons, trailing actions, widget data, or ordering.

### `Grid`

Lays out arbitrary children with native flex wrapping and a shared gap. Cells grow evenly from the standard 112-point minimum and 130-point basis already used by Springa's compact two-column workout summary, naturally falling back to fewer columns when content width is constrained. It does not inspect font scale, measure itself in JavaScript, style its children, or define metric-specific content.

The planned-workout summary composes a `brand` `Card`, `Grid`, and `AppText` to match the existing design on `main`: one tinted container with compact label/value cells. Feature widgets may compose the same structural primitives, but report-card judgments, meters, units, icons, and domain behavior remain feature components until their actual designs exist.

### `StateView`

Renders caller-supplied title and message content with an optional loading indicator and retry action. Its visual-state contract is `loading?: boolean`; it does not encode an unused taxonomy of loading, empty, unavailable, and error states.

### `TextField`

Wraps React Native `TextInput` with Springa surface, border, focus, disabled, and error treatment. It retains native input props; pre-run carbs is its current concrete consumer.

## Data and state flow

- Tokens and UI components contain no product state.
- Query hooks remain sole owners of server data and mutation state.
- Router remains sole owner of workout route identity and the workout action sheet's controlled presentation state.
- Feature components translate domain state into UI-component props.
- `AppBottomSheet` renders native presentation from caller-owned `isPresented` state, forwards dismissal requests through `onDismiss`, and reports native completion through `onDismissComplete`. It owns no feature state or business action; workout actions retain their pending action until completion is reported.
- `StateView` does not infer loading or error conditions. Its only visual state input is whether to show the loading indicator; callers supply the title, message, and retry action.

## Error and interaction behavior

- Loading content is visibly loading; no placeholder value masquerades as real data.
- Errors expose concise copy and retry only when retry is valid.
- Disabled and pending actions cannot fire twice.
- Mutation failures remain visible in their feature context and use `accessibilityRole="alert"` where appropriate.
- Bottom sheets reset feature mode after native dismissal completes. Android back, scrim tap, and pan dismissal flow through the same controlled state callback.
- A sheet requested while the keyboard is visible waits for `keyboardDidHide` before presentation, avoiding simultaneous IME and sheet animations.
- Actions that open another native surface or change the underlying route run only after `onDismissComplete`, never in the same turn as the dismissal request.
- Font scaling and screen-reader labels remain enabled through every wrapper.
- Current no-op Theme and Month/Week controls are removed. Deferred features are not presented as actionable accessibility targets.

## Migration

1. Expand the palette and add shared visual tokens.
2. Add global components with focused behavior tests. Delete `MetricCard`; replace `MetricGrid` with structural `Grid`; remove unused `Card` padding, `Button` size/ghost, `IconButton` variant, `Section` icon/trailing, `StateView` state, and `ScreenShell` title APIs.
3. Migrate shell, login, QA login, and placeholder tabs; remove the no-op Theme control.
4. Migrate Calendar/Agenda; replace the no-op Month/Week switcher with a static Agenda heading until those modes have an approved milestone.
5. Migrate planned and completed workout surfaces, inputs, and actions, including `AppBottomSheet`.
6. Delete unused `ThemedText`, `ThemedView`, template `constants/theme`, color-scheme hooks, and template CSS after all consumers are gone.

The migration changes visual rhythm and component consistency but not data contracts, navigation, workout behavior, or networking.

## Testing and verification

- Test component behavior visible to users: accessible labels, variants, disabled/loading behavior, retry actions, controlled fields, and sheet dismissal.
- Update existing integration tests for migrated flows rather than asserting internal style objects.
- Do not test design documentation wording or snapshot whole style trees.
- Run test discovery, focused tests, the full Vitest suite, TypeScript, and lint.
- Android QA covers Calendar Agenda, workout detail, and the three-dot action sheet using semantic inspection, logs, and matched screenshots.
- Bottom-sheet regression QA covers pan, scrim, and Android back dismissal; controlled-state reset; feature-mode reset; an immediate underlying-screen tap after dismissal; move-picker handoff and cancellation; full-width Android content; and content reachability at enlarged text.
- Grid QA covers native wrapping at wide and constrained widths. Android QA verifies the planned-workout summary matches the compact `main` layout without clipped labels or values.
- Compare before/after screenshots quantitatively, then inspect changes against this design. A non-zero diff is expected because spacing and typography become consistent.

## Out of scope

- Light mode
- A runtime theme provider
- A component showcase application
- New dependencies or native modules
- Generic table, skeleton, popover, toast, or modal abstractions
- M5 Completed Overview domain widgets and API work
- M6 BG query or graph behavior
- Changes to NativeTabs or workout navigation presentation

## Success criteria

- Every implemented screen uses one palette and token scale.
- Repeated text, card, grid, button, badge, input, state, section, and transient-sheet presentation uses the global components.
- Route-owned stack screens and local transient bottom sheets keep distinct ownership.
- No unused Expo template theme path or dead component remains.
- Existing product behavior and accessibility remain intact.
- Deterministic checks pass with no new failures, and Android QA verifies the migrated flows.
