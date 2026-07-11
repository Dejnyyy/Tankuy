# Tankuy — Design System & Visual Consistency

**Date:** 2026-07-11
**Status:** Approved for planning
**Scope:** Mobile app (`app/`) visual refinement. No backend changes, no behavior changes.

## Problem

The app has a solid theme foundation (`constants/Colors.ts` with light/dark palettes, `ThemeContext` with a persisted `useTheme()` hook), but screens largely bypass it: ~60 hardcoded hex colors across the five tab screens, including duplicate semantic colors (`#34C759` vs `#30D158` green, `#FF3B30` vs `#FF453A` red). Each screen is 950–1750 lines with its own ad-hoc inline styles. There are no shared UI components (Card, Button, EmptyState, …), so consistency has nothing to be built from and drifts with every change.

## Goal

Refine the current identity — orange primary (`#FF9500`), iOS-like look, dark mode default — into a consistent design system applied across all screens, in **both light and dark** themes. Same layouts, consistent execution. Visible UX wins: unified components, coherent colors/spacing/typography, empty states where screens currently show nothing.

Out of scope (future etapes): scan-flow UX and error feedback redesign, navigation restructuring, generic form inputs and modals.

## Design

### 1. Design tokens (`constants/Theme.ts`)

New module exporting tokens alongside the existing color palettes:

- **Spacing:** scale `4 / 8 / 12 / 16 / 20 / 24 / 32` as `spacing.xs … spacing.xxl`. Replaces magic numbers (13, 15, 18, …).
- **Typography:** ~6 named styles — `title`, `heading`, `body`, `bodyBold`, `caption`, `label` — each with size, weight, and line height.
- **Radii:** `sm 8 / md 12 / lg 16 / full 999`, matching what dominates the app today.
- **Colors:** `Colors.ts` stays the single source of truth. Add only missing semantic roles the screens currently solve with ad-hoc hexes (e.g. `info` blue, `accent` purple for charts). All hardcoded hexes in screens map to these roles; duplicates collapse to one palette value.

Access stays via the existing `useTheme()` — no new infrastructure.

### 2. Shared components (`components/ui/`)

Seven components, all sourcing colors exclusively from `useTheme()` and dimensions from tokens — no hardcoded hex or magic numbers inside:

| Component | Purpose |
|---|---|
| `Card` | Rounded container, `colors.card` background, unified padding/radius |
| `Button` | Variants `primary` / `secondary` / `ghost` / `destructive`; loading spinner and disabled states |
| `SectionHeader` | Section title with optional right-side action ("See all") |
| `ListRow` | Icon left, title + subtitle, value/chevron right — history entries and profile items |
| `EmptyState` | Icon + text + optional CTA; biggest visible UX win, screens currently show nothing |
| `Badge` | Small label (fuel type, status) in semantic palette colors |
| `ScreenHeader` | Unified screen header (title + optional actions) across all five tabs |

Each component has a clear props interface and is usable without reading its internals.

Deliberately **not** building: generic `Input`, modal components — forms live mostly in the scan flow, which is the next etapa.

### 3. Screen migration

One screen = one self-contained step with its own commit, simplest first so patterns settle before the largest files:

1. **Login** — smallest; calibrates components on a real screen
2. **Dashboard** (`(tabs)/index.tsx`, 963 lines) — most visible screen
3. **History** (1027 lines) — `ListRow` + `EmptyState` heavily
4. **Profile** (1604 lines) — mostly `ListRow` and `Card`
5. **Stations map** (`find.tsx`, 1228 lines) — only the edges (panels, buttons); the map itself unchanged
6. **Scan** (1736 lines) — **visual unification only** (colors, spacing, buttons); flow logic untouched, that's the next etapa
7. **Cleanup** — delete `two.tsx` (template leftover), dead styles, unused NativeWind (`tailwind.config.js`, `global.css`, deps), align `CustomTabBar` with tokens

Migration means: replace inline hexes and ad-hoc styles with tokens and shared components. Layout and behavior do not change. Add `EmptyState` where a screen has no empty handling.

**Risk note:** Profile and Scan interleave styles with logic — there, change styles only, not component structure, keeping diffs reviewable.

### 4. Verification

- After each screen: walk it in Expo in **both** light and dark, before/after screenshots.
- `tsc` type check must pass after every step.
- No automated UI tests introduced in this etapa.

## Error handling

Not applicable — no runtime logic changes. Any screen that fails to render after migration is caught by the per-screen Expo walkthrough before commit.

## Testing

Manual visual verification per screen (both themes) + type check per step, as described in Verification. Existing component tests in `components/__tests__` must keep passing.
