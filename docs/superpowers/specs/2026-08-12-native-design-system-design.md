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

All global components are presentational. They accept data and callbacks through props and never read Query, auth, Router, or Zustand state.

### Existing shell

`ScreenShell` remains the screen-root primitive. It owns the Springa background and shared top bar placement. NativeTabs remains platform-owned and outside the component library.

### `AppText`

Wraps React Native `Text` and retains `TextProps`. It provides the six typography variants and semantic tones: primary, muted, brand, success, warning, and error. The brand tone resolves to `brandText`; state tones remain restricted to their documented contrast-safe tint or dark-surface pairings. Callers may compose layout styles but do not restate typography or palette values.

### `Card`

Provides `surface`, border, continuous radius where supported, and standard padding. It supports default, compact, and unpadded content so both standalone cards and M5 widget containers can use the same boundary. Domain-specific accent borders remain caller-owned.

### `Button`

Provides primary, secondary, destructive, and ghost variants plus compact and default sizes. It owns pressed, disabled, and loading presentation and the minimum touch target. Primary uses `brandAction`; destructive uses the error tint treatment.

### `IconButton`

Provides icon-only actions with a required accessibility label and 44-point target. It is used for shell and sheet chrome where a full text button is inappropriate.

### `Badge`

Provides neutral, brand, success, warning, and error treatments. Brand badges use primary text on `tintBrand`; semantic badges use contrast-safe foreground/tint pairs. Badge text is required so status never depends on color alone.

### `AppBottomSheet`

Wraps `@expo/ui/community/bottom-sheet` for transient, local interactions. It owns Springa surface color, content spacing, native drag indication, pan/back/scrim dismissal, dynamic content sizing, and optional snap points. It exposes `present()`, `dismiss()`, and an `onDismiss` completion callback that fires once after imperative, pan, Android back, or scrim dismissal. Content, queued actions, and feature mode remain caller-owned.

Router stack screens remain the separate choice for navigable, deep-linkable content. Workout detail stays a full-screen route-owned stack `card`; this migration does not change its presentation. No abstraction attempts to hide route presentation and transient bottom sheets behind one modal API.

Workout actions is the first `AppBottomSheet` consumer. A future M6 glucose graph popover may reuse it if that milestone includes the popover.

### `Section`

Groups a heading, optional icon, optional trailing action, and content. It standardizes spacing for current workout sections and M5 Overview widgets without controlling widget data or order.

### `MetricCard` and `MetricGrid`

`MetricCard` renders label, value, optional unit, optional judgment, and optional meter. `MetricGrid` uses content-width-driven wrapping rather than percentage cells. At the default font scale it uses two columns only when both cells meet their minimum content width. At any enlarged system font scale, or when two minimum-width cells do not fit, it uses one column. Labels, values, units, and judgments wrap without truncation. Current workout metrics and M5 report-card/stat widgets use these primitives; score calculation and explanatory content stay in domain components.

### `StateView`

Renders explicit loading, empty, unavailable, or error content with an optional retry action. It replaces repeated centered spinner/message/retry layouts. Feature code continues to decide which state applies and supplies user-facing copy.

### `TextField`

Wraps React Native `TextInput` with Springa surface, border, focus, disabled, and error treatment. It supports controlled numeric, single-line, and multiline input. Current pre-run carbs and M5 carbs/feedback are its concrete consumers.

## Data and state flow

- Tokens and UI components contain no product state.
- Query hooks remain sole owners of server data and mutation state.
- Router remains sole owner of workout route identity and route-level sheet presentation.
- Feature components translate domain state into UI-component props.
- `AppBottomSheet` owns only visibility and native presentation. It forwards one settled `onDismiss` event for every native dismissal path. Feature sheets may defer a mutation until that event through their own callback state; the global wrapper does not queue business actions.
- `StateView` does not infer loading or error conditions.

## Error and interaction behavior

- Loading content is visibly loading; no placeholder value masquerades as real data.
- Errors expose concise copy and retry only when retry is valid.
- Disabled and pending actions cannot fire twice.
- Mutation failures remain visible in their feature context and use `accessibilityRole="alert"` where appropriate.
- Bottom sheets reset feature mode after dismissal. Android back, scrim tap, and pan dismissal retain native behavior.
- Font scaling and screen-reader labels remain enabled through every wrapper.
- Current no-op Theme and Month/Week controls are removed. Deferred features are not presented as actionable accessibility targets.

## Migration

1. Expand the palette and add shared metric tokens.
2. Add global components with focused behavior tests.
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
- Bottom-sheet regression QA covers pan, scrim, and Android back dismissal; one settled `onDismiss`; feature-mode reset; an immediate underlying-screen tap after dismissal; move-picker handoff and cancellation; and content reachability at enlarged text.
- Metric QA covers default two-column layout plus narrow-width and enlarged-text one-column layout without clipped labels, values, units, or judgments.
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
- Repeated text, card, button, badge, input, state, section, metric, and transient-sheet presentation uses the global components.
- Route-owned stack screens and local transient bottom sheets keep distinct ownership.
- No unused Expo template theme path or dead component remains.
- Existing product behavior and accessibility remain intact.
- Deterministic checks pass with no new failures, and Android QA verifies the migrated flows.
