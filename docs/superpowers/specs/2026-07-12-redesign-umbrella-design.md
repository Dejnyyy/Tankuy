# Tankuy Redesign — Umbrella Spec

**Date:** 2026-07-12
**Status:** Approved direction; each etapa gets its own detailed spec
**Depends on:** the design-system etapa (branch `design-system`, spec `2026-07-11-design-system-consistency-design.md`) — tokens and `components/ui/` are the substrate this redesign retunes.

## Why

The consistency etapa deliberately changed almost nothing visually. The owner wants a visibly new app: new visual identity, new layouts, rich motion, and a scan flow that communicates instead of failing silently.

## Decisions (owner-selected from visual mockups)

Mockups live in `.superpowers/brainstorm/92446-1783891087/content/` (visual-identity.html, dashboard-layout.html, scan-flow.html).

1. **Identity: Clean Minimal** — cream surfaces (`#FAF9F7` on `#EFEDE8`), typographic black `#141414`, hairlines `#E3E0D8`. Orange `#FF9500` demoted from fill color to accent (trends, highlights, active states). Primary buttons are black with white text.
2. **Theme modes: both, light default.** Dark variant mirrors the language (anthracite `#161513`/`#1E1C19`, cream text `#F2F0EB`). Follow system preference when the user has no stored choice; profile toggle stays.
3. **Dashboard: chart-first.** Hero spend number (40/800, count-up), large interactive chart with scrub-to-inspect + haptics, small stat-card strip (full stats grid moves to a detail screen), big black "Scan receipt" CTA + ghost "Enter manually".
4. **Scan flow: 3-step wizard** with progress bar — Photo → Review (AI-filled cards, suspicious fields flagged ⚠️, inline edit) → Saved (✓ animation + summary). Every failure mode gets a message and an action; server stops swallowing errors (402 `ai_quota_exceeded`, 422 `unreadable`, `suspicious_fields` flags).
5. **Motion: full experience** — shared transitions (receipt flies to History; station card expands from map pin), animated tab bar, count-up numbers, skeleton loading everywhere, haptics on key actions. All via Reanimated on the UI thread; performance check on a mid-range Android at the end.
6. **Google sign-in keeps its brand look** (carried over from the previous etapa's owner decision).

## Etapas (each: spec → plan → implement → merge)

| # | Scope | Visible outcome |
|---|---|---|
| 1 | New identity in tokens/shared components + dashboard redesign | The app opens looking new |
| 2 | Scan wizard + error states (incl. small server change in `server/src/routes/receipts.js`) | Scanning communicates; quota failure actionable |
| 3 | History, Map, Profile, Login, tab bar in the new identity | Whole app coherent |
| 4 | Full motion polish | Feels alive |

Baseline animations (fades, pressed states, count-ups already specified per screen) ship inside etapas 1–3; etapa 4 adds the cross-screen showpieces.

## Constraints carried across all etapas

- Tokens/`useTheme()` remain the single source of truth; no hardcoded hex outside `Colors.ts`.
- Both themes verified per screen; `npx tsc --noEmit` green per task; no test runner exists (manual visual verification).
- Backend changes limited to what etapa 2 names; everything else is app-side.
