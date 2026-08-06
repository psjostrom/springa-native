# Android NativeTabs chrome (Strimma-like)

Date: 2026-08-06  
Status: approved for planning  
Repo: `springa-native` (Expo SDK 57)

## Goal

Calm the Android bottom tab bar so it matches Strimma’s Material `NavigationBar` feel: always-visible labels, no icon jump, no selected pill, restrained press feedback — while staying on `NativeTabs`.

## Problem

With five tabs, Android Material defaults to selected-only labels. Unselected labels hide, icons shift up, the active indicator pill reads as “flying,” and the default ripple is oversized. Strimma’s Compose `NavigationBarItem` always shows labels; selection is color (and filled vs outline icons), not layout motion.

## Decisions

| Topic | Choice |
|-------|--------|
| Navigation stack | Keep `NativeTabs` (`expo-router/unstable-native-tabs`) |
| Labels | Always visible — `labelVisibilityMode="labeled"` |
| Active indicator pill | Off — `disableIndicator` |
| Press feedback | Quiet ripple (`rippleColor` ≈ brand at low alpha); not PWA `active:scale-90` (unavailable on system tabs) |
| Selected look | Brand tint; idle muted (existing `tintColor` / `labelStyle`) |
| Icons | Prefer filled vs outline `md` pairs when clean; skip awkward pairs |
| Custom JS tab bar | Out of scope (AGENTS.md) |
| iOS | Shared color props only; no Android-only layout APIs that break iOS |

Rationale: NativeTabs cannot run CSS scale on Material tab items. Color + quiet ripple is the honest stand-in for the PWA press bump without abandoning stock chrome.

## Out of scope

- Replacing NativeTabs with a custom bottom bar
- Exact PWA `active:scale-90` animation
- Auth, networking, stores, real data
- iOS visual redesign beyond shared tint props

## Implementation surface

Primary file: `src/app/(tabs)/_layout.tsx`

Props to set on `NativeTabs` (Android-effective):

- `labelVisibilityMode="labeled"`
- `disableIndicator`
- `rippleColor` — low-alpha brand (or theme constant if one is added)
- Keep `tintColor={SpringaColors.brand}`, muted label style, `backgroundColor={SpringaColors.surface}`
- Drop or ignore `indicatorColor` once the indicator is disabled (dead prop)

Optional: per-trigger `md={{ default, selected }}` filled/outline pairs where Material Symbols have clear counterparts.

No new routes, components, or native modules.

## Done when

- All five tab labels remain visible on Android whether selected or not
- No Material selected pill; icons do not jump on selection
- Ripple is visibly quieter than the default
- Tab switching still works
- Verified on Android device or emulator (`npx expo start` / existing install; rebuild only if native deps change — JS props only should not need a new native binary)

## Reference

- Strimma: `StrimmaBottomBar` in `CODE/strimma/.../StrimmaNavGraph.kt` (`NavigationBar` + `NavigationBarItem`)
- PWA bump (not replicated): `active:scale-90` in `CODE/springa/app/components/TabNavigation.tsx`
- Expo NativeTabs Android props: `labelVisibilityMode`, `disableIndicator`, `rippleColor` — https://docs.expo.dev/router/advanced/native-tabs/
