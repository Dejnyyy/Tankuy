import React, { useCallback, useEffect, useState } from 'react';
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
  /** Optional start value for initial animation. When provided, animates from→value on mount. Only used once; later changes to this prop are ignored. */
  from?: number;
}

export function AnimatedNumber({ value, format, style, duration = 600, from }: AnimatedNumberProps) {
  const progress = useSharedValue(from !== undefined ? from : value);
  const [display, setDisplay] = useState(() => format(from !== undefined ? from : value));

  useEffect(() => {
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, progress]);

  const updateDisplay = useCallback(
    (v: number) => setDisplay(format(v)),
    [format],
  );

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(updateDisplay)(current);
    },
    [updateDisplay],
  );

  return <Text style={style}>{display}</Text>;
}
