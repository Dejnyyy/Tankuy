import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/Theme';
import { AppText } from './AppText';

/** Full-width hairline. */
export function Rule({ strong, style }: { strong?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: strong ? 2 : 1, backgroundColor: strong ? colors.text : colors.border }, style]} />;
}

/** Section: heavy title on a strong rule, optional right-side action. */
export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: spacing.lg }, style]}>
      <View style={{ gap: spacing.md }}>
        <Rule strong />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 28 }}>
          <AppText variant="heading">{title}</AppText>
          {right}
        </View>
      </View>
      {children}
    </View>
  );
}

export interface StatRowProps {
  label: string;
  value: string;
  sub?: string | null;
  /** Leading element (e.g. station mark) */
  lead?: React.ReactNode;
  first?: boolean;
}

/** One table line: label (+ muted sub) left, tabular value right, hairline above. */
export function StatRow({ label, value, sub, lead, first }: StatRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        minHeight: 48,
      }}
    >
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" numberOfLines={1}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <AppText variant="statSm" numberOfLines={1} style={{ maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

/** Stack of StatRows. */
export function StatTable({ rows, style }: { rows: (StatRowProps | null | false | undefined | '' | 0)[]; style?: StyleProp<ViewStyle> }) {
  const list = rows.filter(Boolean) as StatRowProps[];
  return (
    <View style={style}>
      {list.map((r, i) => (
        <StatRow key={r.label} {...r} first={i === 0} />
      ))}
    </View>
  );
}

/** A labelled number without a box. */
export function Figure({ label, value, sub, size = 'md' }: { label: string; value: string; sub?: string | null; size?: 'lg' | 'md' }) {
  return (
    <View style={{ gap: spacing.xs, minWidth: 0 }}>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant={size === 'lg' ? 'hero' : 'stat'} numberOfLines={1} adjustsFontSizeToFit>
        {value.replace(/\u202F/g, '\u00A0')}
      </AppText>
      {sub ? (
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}
