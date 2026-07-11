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
