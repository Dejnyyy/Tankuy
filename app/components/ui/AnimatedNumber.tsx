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
