# Redesign Etapa 1 — New Identity + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the token system to the Clean Minimal identity (cream/anthracite, black primary buttons, orange as accent) and rebuild the dashboard chart-first with count-up hero, scrub-to-inspect chart, stat strip + stats detail screen, and big scan CTA.

**Architecture:** All identity changes flow through `constants/Colors.ts` + `constants/Theme.ts` + `components/ui/` (established in the design-system etapa) so every screen re-skins automatically; only the dashboard gets a new layout. The existing custom SVG `SpendingChart` already implements scrubbing — it gains an `onScrub` callback, haptics, and new-identity styling. Count-up numbers via a new `AnimatedNumber` ui component (Reanimated 4).

**Tech Stack:** React Native (Expo SDK 52), TypeScript, StyleSheet, expo-router, react-native-reanimated ~4.1, react-native-svg, expo-haptics (new dependency).

**Spec:** `docs/superpowers/specs/2026-07-12-redesign-etapa1-identity-dashboard-design.md`

## Global Constraints

- Work on branch `design-system` (continues the merged token substrate; final merge decision is the owner's).
- Colors only via `useTheme()`/`Colors.ts`; dimensions/typography from `constants/Theme.ts`. No hardcoded hex outside `Colors.ts`.
- Never spread a typography token and then override `fontSize` — mismatched sizes stay literal `{ fontSize, fontWeight }` with a comment.
- Both themes must work; light is the new default; with no stored preference follow the system scheme.
- NO test runner exists (no `npm test`, no jest). Verification per task = `cd /Users/dejny/Webs/Tankuy/app && npx tsc --noEmit` exit 0 + notes for the human visual pass. TDD is not applicable (approved spec: manual visual verification).
- One task = one commit. Working directory: `/Users/dejny/Webs/Tankuy/app`.
- Google sign-in button keeps its brand look (owner decision; do not touch login).
- Amount texts use `fontVariant: ['tabular-nums']` wherever they animate or sit next to animating values.

---

### Task 1: Identity token retune (Colors, Theme, system-default theme)

**Files:**
- Modify: `constants/Colors.ts` (full palette replacement)
- Modify: `constants/Theme.ts` (add `hero` typography token; adjust `title`, `label`)
- Modify: `context/ThemeContext.tsx` (system default when no stored preference)

**Interfaces:**
- Produces: new color roles `buttonPrimary`, `buttonPrimaryText` on both palettes; retuned values for all existing roles (same role names — consumers don't change); `typography.hero` (40/800, letterSpacing −1.5, tabular numerals). All later tasks rely on these exact names.

- [ ] **Step 1: Replace `constants/Colors.ts` palettes**

Keep the file's structure (`common` / `light` / `dark` / default export). Replace values:

```ts
const primary = '#FF9500'; // brand orange — ACCENT role only in the new identity
const primaryLight = 'rgba(255, 149, 0, 0.15)';
const primaryDark = '#CC7700';

const common = {
  primary,
  primaryLight,
  primaryDark,
  success: '#30A46C',
  warning: '#E5A50A',
  error: '#D64545',
  white: '#FFFFFF',
  black: '#000000',
  info: '#3E7BB6',
  accent: '#9A6BB5',
  // Categorical accents, muted to sit on cream and anthracite alike.
  stats: {
    green: '#30A46C',
    teal: '#3E8E9E',
    lightBlue: '#6FA8C9',
    indigo: '#6A6FB5',
    pink: '#C25E7E',
    amber: '#D99A2B',
    purple: '#9A6BB5',
    blue: '#3E7BB6',
  },
};

const light = {
  ...common,
  text: '#141414',
  textSecondary: '#6E6A5F',
  textMuted: '#8A8578',
  background: '#EFEDE8',
  card: '#FAF9F7',
  elevated: '#FFFFFF',
  border: '#E3E0D8',
  inputBackground: '#F1EFE9',
  placeholder: '#B5B0A4',
  buttonPrimary: '#141414',
  buttonPrimaryText: '#FFFFFF',
  tint: primary,
  tabIconDefault: '#8A8578',
  tabIconSelected: primary,
  barStyle: 'dark-content' as const,
};

const dark = {
  ...common,
  text: '#F2F0EB',
  textSecondary: '#A8A296',
  textMuted: '#787265',
  background: '#161513',
  card: '#1E1C19',
  elevated: '#26231F',
  border: '#2E2B26',
  inputBackground: '#26231F',
  placeholder: '#5E594F',
  buttonPrimary: '#F2F0EB',
  buttonPrimaryText: '#141414',
  tint: primary,
  tabIconDefault: '#787265',
  tabIconSelected: primary,
  barStyle: 'light-content' as const,
};

export default { light, dark };
```

- [ ] **Step 2: Extend `constants/Theme.ts` typography**

Replace the `typography` export (spacing/radii unchanged):

```ts
export const typography = {
  hero: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -1 },
  heading: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;
```

- [ ] **Step 3: System-default theme in `context/ThemeContext.tsx`**

In `loadTheme`, replace the empty else branch: when no stored theme, follow the system scheme (and re-follow it on system change until the user chooses explicitly). Replace the component body's state wiring:

```ts
const systemScheme = _useColorScheme();
const [storedTheme, setStoredTheme] = useState<Theme | null>(null);
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((v) => setStoredTheme((v as Theme) ?? null))
    .catch((e) => console.error('Failed to load theme:', e))
    .finally(() => setHydrated(true));
}, []);

const theme: Theme = storedTheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

const setTheme = async (newTheme: Theme) => {
  try {
    setStoredTheme(newTheme);
    await AsyncStorage.setItem(STORAGE_KEY, newTheme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
};

const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
```

Keep the context value shape `{ theme, colors: Colors[theme], toggleTheme, setTheme, isDark }` unchanged. (`hydrated` prevents a dark→light flash only if the previous default would flash; render children unconditionally as today — the swap happens within the first frame.)

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0. Expect possible errors from `barStyle`/`fontVariant` typing; `fontVariant` must be `FontVariant[]` — if tsc complains, type the array `as const` is NOT enough; use `fontVariant: ['tabular-nums'] as TextStyle['fontVariant']`.

- [ ] **Step 5: Commit**

```bash
git add constants/Colors.ts constants/Theme.ts context/ThemeContext.tsx
git commit -m "feat(app): retune tokens to Clean Minimal identity, system-default theme"
```

---

### Task 2: Shared component retune (Button size+black primary, Card border/shadow, Badge pills)

**Files:**
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/Card.tsx`
- Modify: `components/ui/Badge.tsx`

**Interfaces:**
- Consumes: Task 1 roles `buttonPrimary`, `buttonPrimaryText`.
- Produces: `Button` gains `size?: 'md' | 'sm'` (default `'md'`); `primary` renders black fill (light) / cream fill (dark); `ghost` foreground stays `colors.tint` (orange). Card gains hairline border + soft shadow in light, flat in dark. Badge default becomes solid `buttonPrimary` pill; `color` prop still yields the translucent accent pill.

- [ ] **Step 1: Update `components/ui/Button.tsx`**

Replace the variant maps and add `size`:

```tsx
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
```

Inside the component:

```tsx
const background: Record<ButtonVariant, string> = {
  primary: colors.buttonPrimary,
  secondary: colors.elevated,
  ghost: 'transparent',
  destructive: colors.error,
};
const foreground: Record<ButtonVariant, string> = {
  primary: colors.buttonPrimaryText,
  secondary: colors.text,
  ghost: colors.tint,
  destructive: colors.white,
};
const sizing = {
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, text: typography.bodyBold },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    // 14px has no typography token; literal per the lineHeight rule
    text: { fontSize: 14, fontWeight: '600' as const },
  },
}[size];
```

Use `sizing.paddingVertical/paddingHorizontal` in the Pressable style and `sizing.text` for the label (replacing the hardcoded `typography.bodyBold`). Keep accessibility props, loading/disabled logic, and gap as they are.

- [ ] **Step 2: Update `components/ui/Card.tsx`**

```tsx
export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        !isDark && {
          shadowColor: colors.black,
          shadowOpacity: 0.04,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
        padded && { padding: spacing.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 3: Update `components/ui/Badge.tsx`**

Default (no `color`): solid pill — `backgroundColor: colors.buttonPrimary`, text `colors.buttonPrimaryText`. With `color`: keep the existing translucent `${accent}26` + accent text behavior (hex-only contract comment stays).

```tsx
export function Badge({ label, color }: BadgeProps) {
  const { colors } = useTheme();
  const solid = !color;
  const accent = color ?? colors.buttonPrimary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: solid ? colors.buttonPrimary : `${accent}26`,
        borderRadius: radii.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text style={[typography.label, { color: solid ? colors.buttonPrimaryText : accent }]}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/ui/
git commit -m "feat(app): retune Button (size, black primary), Card (hairline+shadow), Badge (solid pill) to new identity"
```

---

### Task 3: `AnimatedNumber` ui component (count-up)

**Files:**
- Create: `components/ui/AnimatedNumber.tsx`
- Modify: `components/ui/index.ts` (append export)

**Interfaces:**
- Consumes: Task 1 `typography.hero`.
- Produces: `AnimatedNumber({ value: number, format: (n: number) => string, style?: StyleProp<TextStyle>, duration?: number })` — animates from the previously rendered value to `value` over `duration` ms (default 600) whenever `value` changes. Task 6 renders the dashboard hero with it.

- [ ] **Step 1: Create `components/ui/AnimatedNumber.tsx`**

Reanimated 4: animate a shared value, mirror to React state via `useAnimatedReaction` + `runOnJS` (simple and reliable for text; avoids AnimatedProps-on-TextInput hacks).

```tsx
import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  /** Formats the in-flight number for display, e.g. (n) => `${Math.round(n)} Kč` */
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

export function AnimatedNumber({ value, format, style, duration = 600 }: AnimatedNumberProps) {
  const progress = useSharedValue(value);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(format(current));
    },
    [format],
  );

  return <Text style={style}>{display}</Text>;
}
```

- [ ] **Step 2: Append to `components/ui/index.ts`**

```ts
export { AnimatedNumber } from './AnimatedNumber';
```

- [ ] **Step 3: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat(app): add AnimatedNumber count-up component"
```

---

### Task 4: SpendingChart — new identity styling, `onScrub` callback, haptics

**Files:**
- Modify: `components/SpendingChart.tsx`
- Modify: `package.json` (expo-haptics)

**Interfaces:**
- Consumes: Task 1 palette.
- Produces: new optional props `onScrub?: (point: { index: number; value: number; label: string } | null) => void` — fires with the active point while the finger moves, `null` on release; existing props (`labels`, `data`, `period`, `currency`) unchanged. Task 6 wires `onScrub` into the hero number.

- [ ] **Step 1: Install expo-haptics**

Run: `npx expo install expo-haptics`
Expected: adds `expo-haptics` to package.json dependencies; lockfile updated.

- [ ] **Step 2: Add `onScrub` + haptics to `components/SpendingChart.tsx`**

The component already tracks `activeIndex` via `onResponderGrant/Move` (lines ~65, 151-196). Changes:

1. Add to the props interface: `onScrub?: (point: { index: number; value: number; label: string } | null) => void;`
2. Import haptics: `import * as Haptics from 'expo-haptics';`
3. Where `setActiveIndex(newIndex)` happens on touch move/grant, when the index CHANGES fire:

```ts
if (newIndex !== activeIndex && newIndex !== null) {
  Haptics.selectionAsync(); // light tick per data point
  onScrub?.({ index: newIndex, value: data[newIndex], label: labels[newIndex] });
}
```

4. On responder release/terminate (add `onResponderRelease` + `onResponderTerminate` next to the existing responder props): `setActiveIndex(null); onScrub?.(null);`

5. Restyle to the new identity: stroke `colors.tint` width 2.5; area fill = existing gradient but stop opacity 0.08; gridlines removed except a single bottom hairline `colors.border`; active dot `r=4` fill `colors.tint` with `colors.card` 2px ring; label/value text under the chart uses `colors.textSecondary`. Replace any remaining pre-identity colors with palette roles — grep the file for hex (`#`), replace with `colors.*` roles; the file must end hex-free.

- [ ] **Step 3: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/SpendingChart.tsx package.json package-lock.json
git commit -m "feat(app): SpendingChart scrub callback, haptics, Clean Minimal styling"
```

---

### Task 5: Stats detail screen (`app/stats.tsx`)

**Files:**
- Create: `app/stats.tsx`
- Modify: `app/_layout.tsx` (register modal screen)

**Interfaces:**
- Consumes: the `statCards` construction currently inside `app/(tabs)/index.tsx` (~lines 140-216: the array of `{ icon, label, value, color }` built from `stats` + unit helpers).
- Produces: route `/stats` (modal) rendering the full stats grid. Accepts the SAME data the dashboard already loads: pass via route params is not viable for objects — instead the screen re-fetches with the same call `api.getStats(period, date)` using `period` passed as a string param (`useLocalSearchParams`). Task 6 navigates `router.push({ pathname: '/stats', params: { period } })`.

- [ ] **Step 1: Create `app/stats.tsx`**

Structure (complete implementation obligations — the implementer ports existing code, no new logic):

```tsx
// app/stats.tsx — full statistics grid, moved off the dashboard.
// Ports verbatim from app/(tabs)/index.tsx: the statCards array construction
// (icons, labels, unit conversions) and the grid tile rendering, adapted to:
// - data: own fetch via api.getStats(period, new Date().toISOString())
//   with period from useLocalSearchParams<{ period }>(), defaulting to 'month'
// - layout: ScreenHeader title (t('stats.title'), add i18n keys en+cs below)
//   above a 2-column grid of Card tiles; each tile: icon in a tinted circle
//   (`${cardColor}26`), value in bodyBold-sized tabular text, caption label
// - loading: skeleton blocks (colors.inputBackground rounded rects), no spinner
// - colors from useTheme() only; stat accents from colors.stats.* as the
//   dashboard already assigns them
```

Register in `app/_layout.tsx` inside the root Stack: `<Stack.Screen name="stats" options={{ presentation: 'modal', headerShown: false }} />` (match how `modal.tsx` is registered — check the existing pattern in that file first and mirror it).

i18n keys to add to BOTH `locales/en/translation.json` and `locales/cs/translation.json`: `stats.title` = "Statistics" / "Statistiky".

- [ ] **Step 2: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/stats.tsx app/_layout.tsx locales/
git commit -m "feat(app): stats detail modal screen hosting the full stats grid"
```

---

### Task 6: Dashboard rebuild (`app/(tabs)/index.tsx`)

**Files:**
- Modify: `app/(tabs)/index.tsx` (layout rebuild; data logic untouched)
- Modify: `app/(tabs)/scan.tsx` (minimal: accept `mode=manual` param)
- Modify: `locales/en/translation.json`, `locales/cs/translation.json` (new keys)

**Interfaces:**
- Consumes: `AnimatedNumber` (Task 3), `SpendingChart onScrub` (Task 4), `/stats` route (Task 5), `Button size="sm"` (Task 2).
- Produces: the final dashboard. No new interfaces.

- [ ] **Step 1: Rebuild the dashboard layout**

Keep ALL existing data hooks/state (`period`, `stats` fetch, unit/currency helpers) — this is a JSX + styles rebuild. New structure top-to-bottom (replacing the current greeting → stats grid → chart → recent list):

```tsx
// 1. Header row: caption month/greeting left; period pills right.
//    Pills: Pressable per period (keep existing period values incl. 'all'),
//    active = black pill (colors.buttonPrimary bg, colors.buttonPrimaryText text),
//    inactive = colors.inputBackground bg, colors.textSecondary text.
// 2. Hero: <AnimatedNumber value={heroValue} format={fmtCurrency} style={[typography.hero, { color: colors.text }]} />
//    where heroValue = scrubPoint ? scrubPoint.value : totalSpent, and
//    fmtCurrency wraps the existing convertCurrency/formatNumber helpers.
//    IMPORTANT: fmtCurrency must be wrapped in useCallback (stable reference) —
//    AnimatedNumber resubscribes its animated reaction when format changes.
//    Under it the trend line: caption, colors.success + '▼' when spend decreased
//    vs previous period, colors.tint + '▲' when increased (the API's stats
//    payload already carries the previous-period comparison the current
//    greeting block uses — reuse that field; if absent, hide the line).
//    While scrubbing, replace the trend line with the scrubbed point's label.
// 3. Chart: <SpendingChart ... onScrub={setScrubPoint} /> in a padded container.
// 4. Stat strip: horizontal ScrollView of three Cards (volume, consumption,
//    price/L — take these three entries from the existing statCards array,
//    which moves to /stats). Each Card: label caption + value (16/700 tabular,
//    literal per lineHeight rule) + stat accent dot. onPress →
//    router.push({ pathname: '/stats', params: { period } }).
// 5. Actions row (fixed above tab bar, inside SafeAreaView bottom edge):
//    <Button title={t('home.scanReceipt')} icon={camera icon} onPress={() => router.push('/(tabs)/scan')} />
//    <Button title={t('home.enterManually')} variant="ghost" size="sm"
//      onPress={() => router.push({ pathname: '/(tabs)/scan', params: { mode: 'manual' } })} />
// 6. Last entry single line (only when entries exist): caption
//    "t('home.lastEntry'): Shell · 820 Kč · včera" → Pressable → History tab.
// 7. Empty state (no entries): hero renders 0, chart area replaced by
//    <EmptyState icon={tint drop} title={t('home.empty.title')}
//      message={t('home.empty.message')} ctaLabel={t('home.scanReceipt')}
//      onCta={→ scan tab} />.
```

The 9-tile stats grid and the recent-entries list sections are REMOVED from this file (grid lives in `/stats` since Task 5; entries live in History). Delete their now-unused styles; keep `getStyles(colors)` + useMemo pattern; no hex; no typography-spread+fontSize-override.

New i18n keys (en/cs): `home.scanReceipt` ("Scan receipt" / "Naskenovat účtenku"), `home.enterManually` ("Enter manually" / "Zadat ručně"), `home.lastEntry` ("Last fill-up" / "Poslední tankování"). Reuse existing `home.empty.*` keys.

- [ ] **Step 2: scan.tsx `mode=manual` param (minimal)**

In `app/(tabs)/scan.tsx`, read `const { mode } = useLocalSearchParams<{ mode?: string }>();` and add an effect: when `mode === 'manual'`, set the existing scan state machine to its `"manual"` state (the `ScanState` type at line ~40 already includes `"manual"`). Touch nothing else in the flow.

- [ ] **Step 3: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/scan.tsx" locales/
git commit -m "feat(app): rebuild dashboard chart-first with count-up hero, scrubbing, stat strip and scan CTA"
```

---

### Task 7: Whole-etapa verification sweep

**Files:**
- Modify: only if the sweep finds defects (fix in place, list them in the commit).

**Interfaces:** none — verification task.

- [ ] **Step 1: Static sweeps**

```bash
cd /Users/dejny/Webs/Tankuy/app
npx tsc --noEmit                                      # exit 0
grep -rn "#[0-9A-Fa-f]\{3,8\}" app components --include="*.tsx" \
  | grep -v "Colors.ts" | grep -v "// "               # only sanctioned: Switch pair (profile), Google spinner ternary (login)
```

Also sweep for the forbidden pattern: any `...typography.` spread followed by `fontSize:` in the same style object across `app/` and `components/` (the awk sweep from the previous etapa).

- [ ] **Step 2: Web export smoke test**

Run: `npx expo export --platform web --output-dir /tmp/tankuy-e1-export 2>&1 | tail -3`
Expected: success, no errors (Metro + Reanimated + expo-haptics config all load).

- [ ] **Step 3: Write the human visual-QA checklist**

Append to the etapa's report file (`.superpowers/sdd/etapa1-visual-qa.md`): all five tabs + login in BOTH themes (token retune touches everything); dashboard specifics — count-up on load and period switch, chart scrubbing updates the hero + haptic ticks on a physical device, stat strip → stats modal, scan CTA → camera, manual CTA → manual form, empty state on a fresh account, 60 fps feel during scrub/count-up.

- [ ] **Step 4: Commit (only if fixes were made)**

```bash
git add -A && git commit -m "fix(app): etapa 1 verification sweep fixes"
```
