import React, { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radii } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  /** box: outlined control with a solid ink thumb. tabs: bold text with an underline. */
  variant?: 'box' | 'tabs';
  style?: StyleProp<ViewStyle>;
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', variant = 'box', style }: Props<T>) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(-1);
  const inset = variant === 'box' ? 2 : 0;
  const segW = w > 0 ? (w - inset * 2) / options.length : 0;

  useEffect(() => {
    if (!segW) return;
    // First placement jumps; later changes glide.
    x.value = x.value < 0 ? idx * segW : withTiming(idx * segW, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [idx, segW, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, x.value) }] }));
  const h = variant === 'tabs' ? 40 : size === 'sm' ? 30 : 36;
  const fs = size === 'sm' ? 12 : 14;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[
        variant === 'box'
          ? { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: inset, height: h }
          : { flexDirection: 'row', height: h, borderBottomWidth: 1, borderBottomColor: colors.border },
        style,
      ]}
    >
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            variant === 'box'
              ? { position: 'absolute', top: inset, left: inset, bottom: inset, width: segW, borderRadius: radii.sm, backgroundColor: colors.buttonPrimary }
              : { position: 'absolute', left: 0, bottom: -1, height: 2, width: segW, backgroundColor: colors.text },
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        const color = variant === 'box' ? (active ? colors.buttonPrimaryText : colors.textSecondary) : active ? colors.text : colors.textMuted;
        return (
          <PressableScale
            key={o.value}
            scaleTo={1}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text numberOfLines={1} style={{ fontSize: fs, fontFamily: active ? fonts.semi : fonts.regular, color }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
