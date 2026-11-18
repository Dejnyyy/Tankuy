import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/constants/Theme';
import { AppText } from './AppText';
import { Card } from './Card';

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

/** Compact KPI: overline label, big tabular value, optional caption. */
export function StatTile({ label, value, sub, icon, accent, footer, onPress, style, size = 'md' }: StatTileProps) {
  const { colors } = useTheme();
  const c = accent ?? colors.textSecondary;
  return (
    <Card onPress={onPress} style={[{ flex: 1, minWidth: 0, gap: 6, padding: size === 'sm' ? spacing.md : spacing.lg }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radii.xs,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent ? `${accent}1F` : colors.sunken,
            }}
          >
            <FontAwesome name={icon as any} size={11} color={c} />
          </View>
        ) : null}
        <AppText variant="label" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
      <AppText variant={size === 'sm' ? 'statSm' : 'stat'} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {sub ? (
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {sub}
        </AppText>
      ) : null}
      {footer}
    </Card>
  );
}
