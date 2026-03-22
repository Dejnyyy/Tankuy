import React, { useEffect } from "react";
import {
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

// ─── FadeInView ────────────────────────────────────────────
// Fades in + slides up on mount. Use `delay` for staggering.
interface FadeInViewProps {
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function FadeInView({
  delay = 0,
  duration = 500,
  translateY = 20,
  style,
  children,
}: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [translateY, 0]) },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ─── ScaleInView ───────────────────────────────────────────
// Scales from 0.85 → 1 + fades in on mount.
interface ScaleInViewProps {
  delay?: number;
  duration?: number;
  initialScale?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ScaleInView({
  delay = 0,
  duration = 450,
  initialScale = 0.85,
  style,
  children,
}: ScaleInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(1, {
        damping: 14,
        stiffness: 120,
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [initialScale, 1]),
      },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ─── SlideInView ───────────────────────────────────────────
// Slides in from a direction with spring physics.
type SlideDirection = "left" | "right" | "up" | "down";

interface SlideInViewProps {
  delay?: number;
  direction?: SlideDirection;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function SlideInView({
  delay = 0,
  direction = "up",
  distance = 30,
  style,
  children,
}: SlideInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(1, {
        damping: 16,
        stiffness: 100,
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateValue = interpolate(progress.value, [0, 1], [distance, 0]);

    const transform =
      direction === "left"
        ? [{ translateX: -translateValue }]
        : direction === "right"
          ? [{ translateX: translateValue }]
          : direction === "down"
            ? [{ translateY: -translateValue }]
            : [{ translateY: translateValue }];

    return {
      opacity: progress.value,
      transform,
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ─── AnimatedPressable ─────────────────────────────────────
// TouchableOpacity replacement with smooth scale-down press feedback.
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedPressableProps extends TouchableOpacityProps {
  scaleValue?: number;
  children: React.ReactNode;
}

export function AnimatedPressable({
  scaleValue = 0.96,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleValue, {
      damping: 15,
      stiffness: 200,
    });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
    });
    onPressOut?.(e);
  };

  return (
    <AnimatedTouchable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

// ─── StaggeredList helper ──────────────────────────────────
// Wraps children with staggered FadeInView animations.
interface StaggeredChildrenProps {
  stagger?: number;
  baseDelay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function StaggeredChildren({
  stagger = 80,
  baseDelay = 100,
  style,
  children,
}: StaggeredChildrenProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <FadeInView
            delay={baseDelay + index * stagger}
            translateY={15}
            style={style}
          >
            {child}
          </FadeInView>
        );
      })}
    </>
  );
}
