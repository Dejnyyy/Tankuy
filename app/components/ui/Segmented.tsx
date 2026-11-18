import React, { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { elevation, radii } from '@/constants/Theme';
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
  style?: StyleProp<ViewStyle>;
}

/** Segmented control with a spring-animated thumb. */
export function Segmented<T extends string>({ options, value, onChange, size = 'md', style }: Props<T>) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const segW = w > 0 ? (w - 6) / options.length : 0;

  useEffect(() => {
    x.value = withSpring(idx * segW, { damping: 22, stiffness: 260, mass: 0.7 });
  }, [idx, segW, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const h = size === 'sm' ? 32 : 38;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[
        { flexDirection: 'row', backgroundColor: colors.sunken, borderRadius: radii.sm + 2, padding: 3, height: h },
        style,
      ]}
    >
      {segW > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 3,
              left: 3,
              bottom: 3,
              width: segW,
              borderRadius: radii.sm,
              backgroundColor: isDark ? colors.borderStrong : colors.card,
            },
            elevation(1, colors.shadow, isDark),
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            scaleTo={0.94}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: size === 'sm' ? 12 : 13,
                fontWeight: active ? '700' : '500',
                color: active ? colors.text : colors.textSecondary,
              }}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
