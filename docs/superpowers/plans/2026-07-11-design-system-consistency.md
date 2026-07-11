# Design System & Visual Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Tankuy's mobile app visuals into a token-based design system (spacing/typography/radii + semantic colors) with 7 shared UI components, then migrate all screens to it — same layouts, consistent execution, both light and dark themes.

**Architecture:** Extend the existing theme foundation (`constants/Colors.ts` + `ThemeContext.useTheme()`) with a new `constants/Theme.ts` token module and a `components/ui/` component library. Screens then swap hardcoded hexes and ad-hoc styles for tokens/components, one screen per task. No behavior or layout changes.

**Tech Stack:** React Native (Expo SDK 52), TypeScript, StyleSheet (no NativeWind — it gets removed in cleanup), expo-router.

**Spec:** `docs/superpowers/specs/2026-07-11-design-system-consistency-design.md`

## Global Constraints

- Both **light and dark** themes must be maintained; verify every screen in both.
- **No behavior or layout changes** — visual execution only (colors, spacing, typography, radii, shared components). Screens keep the same structure.
- Colors come **only** from `useTheme()` / `Colors.ts`; dimensions from `constants/Theme.ts` tokens. No hardcoded hex or magic spacing numbers in new/migrated code.
- Follow the existing screen pattern: `const { colors } = useTheme(); const styles = useMemo(() => getStyles(colors), [colors]);`.
- Type check must pass after every task: `cd /Users/dejny/Webs/Tankuy/app && npx tsc --noEmit`.
- There is **no test runner configured** (no `npm test` script, no jest config) — the one snapshot test in `components/__tests__/` is not runnable; leave it alone. Verification = tsc + manual visual walkthrough in Expo (`npx expo start`, theme toggle lives in the Profile tab).
- One task = one commit. Do not batch screens together.
- Working directory for all commands: `/Users/dejny/Webs/Tankuy/app`.

---

### Task 1: Design tokens (`constants/Theme.ts`) + semantic color roles

**Files:**
- Create: `constants/Theme.ts`
- Modify: `constants/Colors.ts`

**Interfaces:**
- Produces: `spacing.{xs,sm,md,lg,xl,xxl,xxxl}` (4/8/12/16/20/24/32), `radii.{sm,md,lg,full}` (8/12/16/999), `typography.{title,heading,body,bodyBold,caption,label}` (TextStyle objects), and new color roles `colors.info`, `colors.accent`, `colors.stats.{green,teal,lightBlue,indigo,pink,amber,purple,blue}` available via `useTheme().colors`. All later tasks import `{ spacing, radii, typography } from '@/constants/Theme'`.

- [ ] **Step 1: Create `constants/Theme.ts`**

```ts
import type { TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;
```

- [ ] **Step 2: Add semantic roles to `constants/Colors.ts`**

In the `common` object, after `error: '#FF453A',` add:

```ts
  info: '#32ADE6',
  accent: '#BF5AF2',
  // Categorical accents for stat tiles and charts. Use by role position,
  // not by literal color meaning.
  stats: {
    green: '#30D158',
    teal: '#32ADE6',
    lightBlue: '#5AC8FA',
    indigo: '#5E5CE6',
    pink: '#FF375F',
    amber: '#FF9F0A',
    purple: '#BF5AF2',
    blue: '#007AFF',
  },
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add constants/Theme.ts constants/Colors.ts
git commit -m "feat(app): add design tokens (spacing/typography/radii) and semantic color roles"
```

---

### Task 2: `Card`, `SectionHeader`, `Badge` components

**Files:**
- Create: `components/ui/Card.tsx`, `components/ui/SectionHeader.tsx`, `components/ui/Badge.tsx`, `components/ui/index.ts`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces:
  - `Card({ padded?: boolean = true, style?, children, ...ViewProps })`
  - `SectionHeader({ title: string, actionLabel?: string, onAction?: () => void })`
  - `Badge({ label: string, color?: string })` — `color` defaults to `colors.primary`; pass any palette value (e.g. `colors.stats.green`).
  - Barrel export `components/ui/index.ts` re-exporting all ui components (later tasks append to it).

- [ ] **Step 1: Create `components/ui/Card.tsx`**

```tsx
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii } from '@/constants/Theme';

interface CardProps extends ViewProps {
  /** Apply default inner padding (spacing.lg). Default true. */
  padded?: boolean;
}

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radii.lg },
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

- [ ] **Step 2: Create `components/ui/SectionHeader.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={spacing.sm}>
          <Text style={[typography.bodyBold, { color: colors.tint }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Create `components/ui/Badge.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

interface BadgeProps {
  label: string;
  /** Accent color, e.g. colors.stats.green. Defaults to colors.primary. */
  color?: string;
}

export function Badge({ label, color }: BadgeProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: `${accent}26`, // ~15% alpha over card background
        borderRadius: radii.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text style={[typography.label, { color: accent }]}>{label}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Create `components/ui/index.ts`**

```ts
export { Card } from './Card';
export { SectionHeader } from './SectionHeader';
export { Badge } from './Badge';
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/ui/
git commit -m "feat(app): add Card, SectionHeader, Badge ui components"
```

---

### Task 3: `Button` component

**Files:**
- Create: `components/ui/Button.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `Button({ title: string, onPress: () => void, variant?: 'primary'|'secondary'|'ghost'|'destructive' = 'primary', loading?: boolean, disabled?: boolean, icon?: React.ReactNode, style?: StyleProp<ViewStyle> })`.

- [ ] **Step 1: Create `components/ui/Button.tsx`**

```tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon; hidden while loading. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const background: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.elevated,
    ghost: 'transparent',
    destructive: colors.error,
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.text,
    ghost: colors.tint,
    destructive: colors.white,
  };
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: background[variant],
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={foreground[variant]} /> : icon}
      <Text style={[typography.bodyBold, { color: foreground[variant] }]}>{title}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Append to `components/ui/index.ts`**

```ts
export { Button } from './Button';
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat(app): add Button ui component with variants and loading state"
```

---

### Task 4: `ListRow`, `EmptyState`, `ScreenHeader` components

**Files:**
- Create: `components/ui/ListRow.tsx`, `components/ui/EmptyState.tsx`, `components/ui/ScreenHeader.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: Task 1 tokens, Task 3 `Button`.
- Produces:
  - `ListRow({ icon?: ReactNode, title: string, subtitle?: string, value?: string, onPress?: () => void, showChevron?: boolean, rightElement?: ReactNode })`
  - `EmptyState({ icon: ReactNode, title: string, message?: string, ctaLabel?: string, onCta?: () => void })`
  - `ScreenHeader({ title: string, rightElement?: ReactNode })`

- [ ] **Step 1: Create `components/ui/ListRow.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

interface ListRowProps {
  /** Leading element, typically an icon inside a colored circle. */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right-aligned value text (e.g. price). */
  value?: string;
  onPress?: () => void;
  /** Show trailing chevron; defaults to true when onPress is set. */
  showChevron?: boolean;
  /** Custom trailing element (e.g. a Switch); replaces value/chevron. */
  rightElement?: React.ReactNode;
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron,
  rightElement,
}: ListRowProps) {
  const { colors } = useTheme();
  const chevron = showChevron ?? Boolean(onPress);

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyBold, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        <>
          {value ? (
            <Text style={[typography.bodyBold, { color: colors.text }]}>{value}</Text>
          ) : null}
          {chevron ? (
            <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
          ) : null}
        </>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}
```

- [ ] **Step 2: Create `components/ui/EmptyState.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { Button } from './Button';

interface EmptyStateProps {
  /** Illustration or icon element shown above the title. */
  icon: React.ReactNode;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, message, ctaLabel, onCta }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xxl,
        gap: spacing.md,
      }}
    >
      {icon}
      <Text style={[typography.heading, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {message ? (
        <Text
          style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}
        >
          {message}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <Button title={ctaLabel} onPress={onCta} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Create `components/ui/ScreenHeader.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

interface ScreenHeaderProps {
  title: string;
  /** Optional right-aligned actions (icon buttons etc.). */
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, rightElement }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      {rightElement ?? null}
    </View>
  );
}
```

- [ ] **Step 4: Append to `components/ui/index.ts`**

```ts
export { ListRow } from './ListRow';
export { EmptyState } from './EmptyState';
export { ScreenHeader } from './ScreenHeader';
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/ui/
git commit -m "feat(app): add ListRow, EmptyState, ScreenHeader ui components"
```

---

### Task 5: Migrate Login screen

**Files:**
- Modify: `app/login.tsx`

**Interfaces:**
- Consumes: tokens + `Button` from `@/components/ui`.

Login is the smallest screen and calibrates the components. It already uses `useTheme()` and `getStyles(colors)` — keep that pattern.

- [ ] **Step 1: Replace hardcoded hexes**

| Current | Replace with |
|---|---|
| `#FFFFFF` | `colors.white` |
| `#FF453A` | `colors.error` |
| `#1F1F1F` | `colors.card` (verify visually — it's a near-card dark surface) |

- [ ] **Step 2: Normalize spacing/typography/radii in `getStyles`**

Import tokens: `import { spacing, radii, typography } from '@/constants/Theme';`
Map existing values to the nearest token (e.g. `padding: 15` → `padding: spacing.lg`, `borderRadius: 14` → `radii.md`). Text styles compose tokens: `...typography.title` for the app name, `...typography.body` for the tagline, keeping any screen-specific overrides (like the large logo sizing) as-is.

- [ ] **Step 3: Replace sign-in buttons with `Button`**

The Google and Guest sign-in pressables become:

```tsx
<Button
  title={/* existing label */}
  onPress={handleGoogleSignIn}
  loading={isLoading}
  icon={<FontAwesome name="google" size={18} color={colors.white} />}
/>
<Button title={/* existing guest label */} onPress={handleGuestSignIn} variant="secondary" />
```

Keep the surrounding `FadeInView`/`SlideInView` animation wrappers untouched.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Visual verification (both themes)**

Run: `npx expo start` and open the app. Log out if needed to see the login screen. Check light **and** dark (toggle in Profile before logging out, or flip the stored default): layout unchanged, buttons render all states (press Google sign-in to see loading).

- [ ] **Step 6: Commit**

```bash
git add app/login.tsx
git commit -m "refactor(app): migrate login screen to design tokens and ui components"
```

---

### Task 6: Migrate Dashboard (`app/(tabs)/index.tsx`)

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: tokens + `Card`, `SectionHeader`, `EmptyState`, `ScreenHeader` from `@/components/ui`.

- [ ] **Step 1: Replace the stat-tile color literals (lines ~150–215) with palette roles**

| Current | Replace with |
|---|---|
| `#30D158` | `colors.stats.green` |
| `#32ADE6` | `colors.stats.teal` |
| `#5AC8FA` | `colors.stats.lightBlue` |
| `#5E5CE6` | `colors.stats.indigo` |
| `#FF375F` | `colors.stats.pink` |
| `#FF9F0A` | `colors.stats.amber` |
| `#BF5AF2` | `colors.stats.purple` |
| `#34C759` | `colors.success` (duplicate green — collapses to palette green) |

- [ ] **Step 2: Replace remaining hexes**

| Current | Replace with |
|---|---|
| `#FF3B30` | `colors.error` |
| `#007AFF` | `colors.stats.blue` |
| `#AF52DE` | `colors.stats.purple` |
| `#5856D6` | `colors.stats.indigo` |
| `#FFF` / `#FFFFFF` | `colors.white` (or `colors.card` where used as a light-mode surface — check each occurrence) |
| `#000` | `colors.black` |
| `#FF9500` | `colors.primary` |

- [ ] **Step 3: Adopt components**

- Wrap stat tiles and chart container in `Card` (replace their ad-hoc rounded `View`s).
- Section titles ("Statistics", "Recent entries" etc.) → `SectionHeader`, with the existing "see all" action where present.
- Screen title row → `ScreenHeader`.
- If the entries list is empty, render `EmptyState` (icon: `<FontAwesome name="tint" size={48} color={colors.textMuted} />`, title/message from existing i18n keys or add `home.empty.title` / `home.empty.message` to both `locales/` files, CTA navigating to the Scan tab).

- [ ] **Step 4: Normalize spacing/typography in `getStyles` to tokens** (same mapping approach as Task 5, Step 2).

- [ ] **Step 5: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 6: Visual verification** — dashboard in Expo, light + dark, with data and (new account / filtered) without data for the EmptyState. Charts unchanged.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/index.tsx" locales/
git commit -m "refactor(app): migrate dashboard to design tokens and ui components"
```

---

### Task 7: Migrate History (`app/(tabs)/history.tsx`)

**Files:**
- Modify: `app/(tabs)/history.tsx`

**Interfaces:**
- Consumes: tokens + `Card`, `ListRow`, `EmptyState`, `Badge`, `ScreenHeader` from `@/components/ui`.

- [ ] **Step 1: Replace hexes** — `#FFFFFF` → `colors.white`, `#000` → `colors.black`, `#2C2C2E` → `colors.elevated`.

- [ ] **Step 2: Adopt components**

- Each fuel-entry row → `ListRow` (icon: station/fuel icon in a `colors.primaryLight` circle; title: station name; subtitle: date; value: formatted cost; `onPress` opens the existing detail).
- Fuel-type / status tags → `Badge`.
- Empty list → `EmptyState` (title/message via i18n, CTA → Scan tab).
- Screen title → `ScreenHeader`; grouping headers (months/dates) → `SectionHeader`.

- [ ] **Step 3: Normalize spacing/typography to tokens in `getStyles`.**

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Visual verification** — history with entries and empty, light + dark; date filtering still works (behavior untouched).

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/history.tsx" locales/
git commit -m "refactor(app): migrate history screen to design tokens and ui components"
```

---

### Task 8: Migrate Profile (`app/(tabs)/profile.tsx`)

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: tokens + `Card`, `ListRow`, `SectionHeader`, `Button` from `@/components/ui`.

**Risk note (from spec):** this file (1604 lines) interleaves styles with logic — change styles only, do not restructure components or move logic.

- [ ] **Step 1: Replace hexes**

| Current | Replace with |
|---|---|
| `#FF9500` | `colors.primary` |
| `#FFF` / `#FFFFFF` | `colors.white` (check each — light-mode surfaces → `colors.card`) |
| `#FF453A` | `colors.error` |
| `#8E8E93` | `colors.textSecondary` |
| `#3A3A3C` | `colors.elevated` |
| `#000` | `colors.black` |
| `#767577`, `#f4f3f4` | keep — these are the standard RN `Switch` track/thumb defaults; move them into `getStyles` untouched if inline |

- [ ] **Step 2: Adopt components**

- Settings rows (language, currency, units, theme toggle, legal links, …) → `ListRow`; toggles pass the existing `Switch` as `rightElement`.
- Setting groups → wrap in `Card` with `SectionHeader` above.
- Sign-out → `Button` `variant="destructive"`; any delete-account action likewise.

- [ ] **Step 3: Normalize spacing/typography to tokens in `getStyles`.**

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Visual verification** — every settings row, both themes; flip the theme toggle here to verify both palettes live; sign-out still works.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "refactor(app): migrate profile screen to design tokens and ui components"
```

---

### Task 9: Migrate Stations map (`app/(tabs)/find.tsx`) — edges only

**Files:**
- Modify: `app/(tabs)/find.tsx`

**Interfaces:**
- Consumes: tokens + `Card`, `Button`, `Badge` from `@/components/ui`.

The map itself (`StationMap`) is untouched. Only the surrounding chrome migrates: search/filter bar, station detail panel/bottom sheet, action buttons.

- [ ] **Step 1: Replace hexes** — `#FFFFFF` → `colors.white` (marker/panel surfaces: `colors.card`), `#FF9500` → `colors.primary`, `#34C759` → `colors.success`, `#000` → `colors.black`.

- [ ] **Step 2: Adopt components** — station info panel → `Card`; "Navigate"/detail actions → `Button`; fuel-type chips → `Badge`.

- [ ] **Step 3: Normalize spacing/typography to tokens in `getStyles`.**

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Visual verification** — map renders, marker selection opens the panel, both themes.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/find.tsx"
git commit -m "refactor(app): migrate stations map chrome to design tokens and ui components"
```

---

### Task 10: Migrate Scan (`app/(tabs)/scan.tsx`) — visual unification only

**Files:**
- Modify: `app/(tabs)/scan.tsx`

**Interfaces:**
- Consumes: tokens + `Card`, `Button` from `@/components/ui`.

**Scope guard (from spec):** colors, spacing, buttons only. Do **not** touch the scan flow logic, state machine, camera handling, or API calls — that is the next etapa.

- [ ] **Step 1: Replace hexes** — `#FFFFFF` (14×) → `colors.white` / `colors.card` per occurrence, `#30D158` → `colors.success`.

- [ ] **Step 2: Adopt components** — action buttons (take photo, pick from gallery, save entry, retry) → `Button` (save = `primary` with `loading` bound to the existing submitting state; retry = `secondary`); result/summary containers → `Card`.

- [ ] **Step 3: Normalize spacing/typography to tokens in `getStyles`.**

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Visual verification** — full scan happy path (photo → results → save) plus camera permission state, both themes. Flow behavior identical.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/scan.tsx"
git commit -m "refactor(app): unify scan screen visuals with design tokens and ui components"
```

---

### Task 11: Cleanup — template leftovers, NativeWind, tab bar

**Files:**
- Delete: `app/(tabs)/two.tsx`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`
- Modify: `app/(tabs)/_layout.tsx`, `babel.config.js`, `metro.config.js`, `package.json`, `components/CustomTabBar.tsx`

- [ ] **Step 1: Remove `two.tsx`**

Delete `app/(tabs)/two.tsx` and remove line 177 in `app/(tabs)/_layout.tsx`:
`<Tabs.Screen name="two" options={{ href: null } as any} />`

- [ ] **Step 2: Remove NativeWind (unused — zero `className=` usages in the codebase)**

- `babel.config.js`: remove `jsxImportSource: "nativewind"` from the `babel-preset-expo` options and remove the `"nativewind/babel"` preset line.
- `metro.config.js`: remove `withNativeWind` import and unwrap: `module.exports = config;`
- Delete `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`; remove any `import '../global.css'` (check `app/_layout.tsx`).
- `package.json`: remove `nativewind` and `tailwindcss` dependencies, then run `npm install` to update the lockfile.

- [ ] **Step 3: Align `CustomTabBar` with tokens**

Replace `#FFF` with `colors.white`, magic spacing/radii with tokens (same mapping approach as Task 5, Step 2).

- [ ] **Step 4: Type check** — `npx tsc --noEmit`, exit 0.

- [ ] **Step 5: Full visual smoke test**

`npx expo start` — Metro must build without NativeWind. Walk all five tabs + login, both themes. Tab bar renders correctly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(app): remove template leftovers and unused NativeWind, align tab bar with tokens"
```
