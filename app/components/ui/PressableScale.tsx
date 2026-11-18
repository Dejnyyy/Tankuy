import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (default 0.97). */
  scaleTo?: number;
  haptic?: 'tap' | 'light' | 'medium' | false;
  children?: React.ReactNode;
}

/** Pressable with a springy scale-down + dim, on the UI thread. */
export function PressableScale({ style, scaleTo = 0.97, haptic = 'tap', onPressIn, onPressOut, onPress, children, disabled, ...rest }: Props) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  const dim = disabled ? 0.45 : 1;
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value * dim }), [dim]);
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 20, stiffness: 400, mass: 0.6 });
        o.value = withTiming(0.88, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 300, mass: 0.6 });
        o.value = withTiming(1, { duration: 160 });
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
