# Redesign Etapa 1 — New Identity + Dashboard

**Date:** 2026-07-12
**Status:** Approved for planning
**Parent:** `2026-07-12-redesign-umbrella-design.md`
**Base branch:** `design-system` (tokens + components/ui/ from the consistency etapa)

## Goal

Retune the design system to the Clean Minimal identity and rebuild the dashboard chart-first. After this etapa the app visibly looks new on every screen (via retuned tokens/components) and the dashboard is fully redesigned.

## 1. Identity — token retune

### Colors (`constants/Colors.ts`)

Light (new default):

| Role | Value |
|---|---|
| background | `#EFEDE8` |
| card | `#FAF9F7` |
| elevated | `#FFFFFF` |
| text | `#141414` |
| textSecondary | `#6E6A5F` |
| textMuted | `#8A8578` |
| border | `#E3E0D8` |
| inputBackground | `#F1EFE9` |
| primary (accent) | `#FF9500` (unchanged value, new role: accents only) |
| buttonPrimary (new role) | `#141414` (black fill) |
| buttonPrimaryText (new role) | `#FFFFFF` |
| success | `#30A46C` (muted, cream-friendly) |
| error | `#D64545` |
| warning | `#E5A50A` |
| info | `#3E7BB6` |

Dark (secondary):

| Role | Value |
|---|---|
| background | `#161513` |
| card | `#1E1C19` |
| elevated | `#26231F` |
| text | `#F2F0EB` |
| textSecondary | `#A8A296` |
| textMuted | `#787265` |
| border | `#2E2B26` |
| inputBackground | `#26231F` |
| buttonPrimary | `#F2F0EB`, buttonPrimaryText `#141414` (inverted) |
| accents | same hues, +1 step brightness where contrast requires |

`stats.*` palette retuned to muted, cream-compatible versions of the same hues (exact values chosen in the plan, validated for contrast on both backgrounds).

**Default theme:** if no stored preference, follow the system scheme (`ThemeContext` change: replace the hardcoded `'dark'` default with system + persist on first explicit choice). Profile toggle unchanged.

### Typography (`constants/Theme.ts`)

| Token | Size/weight | Use |
|---|---|---|
| hero (new) | 40/800, letterSpacing −1.5, tabular numerals | dashboard spend number |
| title | 28/800, letterSpacing −1 | screen titles |
| heading | 20/700 | sections |
| body / bodyBold | 16/400 / 16/600 | unchanged |
| caption | 13/400 | unchanged |
| label | 12/500 uppercase | small labels |

Amount displays app-wide use `fontVariant: ['tabular-nums']` so animated numbers don't jitter.

### Shared components (`components/ui/`)

- **Button:** `primary` = black fill (`buttonPrimary` role) with white text; new `size: 'md' (default) | 'sm'` prop (sm: 14px text, tighter padding — retires the 14→16 drift from the previous etapa's review). `ghost` = orange text. `destructive` = `error` fill.
- **Card:** cream surface, `borderWidth 1 borderColor border`, softer radius `radii.lg`, subtle shadow (`0 1 3 rgba(0,0,0,0.04)`) in light; borderless flat in dark.
- **Badge:** black-on-cream / cream-on-anthracite pills; orange variant for active states.
- Others (ListRow, EmptyState, SectionHeader, ScreenHeader) inherit token changes; no API changes.

**Blast radius note:** all migrated screens change appearance automatically via tokens. That is intended (whole app adopts the identity); screens keep their current layouts until their own etapa.

## 2. Dashboard rebuild (`app/(tabs)/index.tsx`)

Top to bottom:

1. **Header:** month + greeting (caption), period switcher pills right (Week/Month/Year; black active pill). No ScreenHeader component — custom.
2. **Hero number:** spend for the selected period, `typography.hero`; count-up animation (Reanimated, ~600 ms, fires on load and period change). Below: trend line "▼ 12 % vs previous period" — success green when down, orange when up.
3. **Chart:** large line chart, orange stroke + 8 % opacity fill, no axes clutter (baseline hairline only). **Scrubbing:** pan gesture moves an indicator dot; while scrubbing, the hero number shows the value under the finger and the header shows that point's label; haptic tick per data point. Uses the same data pipeline as today's `SpendingChart`; rendering rebuilt in the new identity (implementation choice — adapt existing component or replace — belongs to the plan).
4. **Stat-card strip:** three cards (volume, consumption, price/L) horizontally; tap opens a **new Stats detail screen** (`app/stats.tsx`, modal push) hosting the full 9-tile grid that leaves the dashboard (existing tile components reused, retuned by tokens).
5. **Primary actions:** black `Button` "📷 Naskenovat účtenku" (routes to scan tab as today) + ghost "Zadat ručně" (routes to the existing manual entry path). Fixed above the tab bar.
6. **Last entry line (single row):** "Poslední: Shell · 820 Kč · včera" → History tab.
7. **Empty state:** hero shows "0 Kč", chart area replaced by EmptyState with scan CTA.

**Removed from dashboard:** 9-tile stats grid (→ stats detail), recent-entries list (→ single line + History).

## Out of scope (later etapas)

Scan flow internals (etapa 2); History/Map/Profile/Login layouts (etapa 3); shared transitions and animated tab bar (etapa 4).

## Error handling

No new failure modes introduced; period switching and chart scrubbing operate on already-loaded stats data. Loading state: skeleton blocks for hero + chart (no spinners).

## Testing / verification

Per task: `npx tsc --noEmit` green; both themes checked visually in Expo. Etapa ends with a full-app walkthrough (all tabs) in both themes since the token retune touches every screen, plus a check that count-up/scrub animations hold 60 fps on a physical device.
