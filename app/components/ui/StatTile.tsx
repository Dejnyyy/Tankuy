import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '@/constants/Theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string | null;
  icon?: string;
  accent?: string;
  footer?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'sm';
}

/** Unboxed KPI: label, big tabular value, optional caption. */
export function StatTile({ label, value, sub, footer, onPress, style, size = 'md' }: StatTileProps) {
  const body = (
    <View style={[{ flex: 1, minWidth: 0, gap: spacing.xs }, style]}>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant={size === 'sm' ? 'statSm' : 'stat'} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {sub ? (
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {sub}
        </AppText>
      ) : null}
      {footer}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress}>{body}</PressableScale> : body;
}
