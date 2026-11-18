import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ease = Easing.out(Easing.quad);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (default 0.98). */
  scaleTo?: number;
  haptic?: 'tap' | 'light' | 'medium' | false;
  children?: React.ReactNode;
}

/** Pressable with a short, flat press response (dim + tiny scale, no spring). */
export function PressableScale({ style, scaleTo = 0.98, haptic = 'tap', onPressIn, onPressOut, onPress, children, disabled, ...rest }: Props) {
  const p = useSharedValue(0);
  const dim = disabled ? 0.35 : 1;
  const target = Math.max(scaleTo, 0.96);
  const anim = useAnimatedStyle(
    () => ({ transform: [{ scale: 1 - (1 - target) * p.value }], opacity: (1 - 0.35 * p.value) * dim }),
    [dim, target],
  );
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        p.value = withTiming(1, { duration: 80, easing: ease });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.value = withTiming(0, { duration: 160, easing: ease });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}
