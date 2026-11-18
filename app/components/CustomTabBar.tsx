import React, { useEffect } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { elevation, radii } from '@/constants/Theme';
import { PressableScale } from '@/components/ui/PressableScale';

export const TAB_META: Record<string, { icon: string; label: string }> = {
  index: { icon: 'home', label: 'nav.overview' },
  stats: { icon: 'bar-chart', label: 'nav.stats' },
  scan: { icon: 'camera', label: 'nav.scan' },
  history: { icon: 'list-ul', label: 'nav.history' },
  profile: { icon: 'user-o', label: 'nav.profile' },
};

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const meta = TAB_META[name];
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, p]);
  const dot = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.3 + p.value * 0.7 }] }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 1.5 }] }));
  const color = focused ? colors.text : colors.tabIconDefault;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.88}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t(meta.label)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 6, gap: 3 }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 3 }, lift]}>
        <FontAwesome name={meta.icon as any} size={19} color={color} />
        <Text style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', color }} numberOfLines={1}>
          {t(meta.label)}
        </Text>
      </Animated.View>
      <Animated.View style={[{ width: 16, height: 3, borderRadius: 2, backgroundColor: colors.tint }, dot]} />
    </PressableScale>
  );
}

function ScanButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [focused, r]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + r.value * 0.06 }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <PressableScale
        onPress={onPress}
        haptic="medium"
        scaleTo={0.9}
        accessibilityRole="tab"
        accessibilityLabel={t('nav.scan')}
        accessibilityState={{ selected: focused }}
        style={{ marginTop: -22 }}
      >
        <Animated.View
          style={[
            {
              width: 58,
              height: 58,
              borderRadius: 20,
              backgroundColor: colors.tint,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: colors.background,
            },
            elevation(2, colors.tint, isDark),
            ring,
          ]}
        >
          <FontAwesome name="camera" size={21} color={colors.onTint} />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/** Floating bottom bar with a raised scan action in the centre. */
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const order = ['index', 'stats', 'scan', 'history', 'profile'];
  const routes = order
    .map((n) => state.routes.find((r) => r.name === n))
    .filter((r): r is (typeof state.routes)[number] => !!r);
  const active = state.routes[state.index]?.name;

  const press = (route: (typeof routes)[number]) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (active !== route.name && !event.defaultPrevented) navigation.navigate(route.name as never);
  };

  const barW = Math.min(width - 24, 520);
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View
        style={[
          {
            width: barW,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radii.xl,
            backgroundColor: colors.tabBar,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 6,
          },
          Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any) : null,
          elevation(3, colors.shadow, isDark),
        ]}
      >
        {routes.map((r) =>
          r.name === 'scan' ? (
            <ScanButton key={r.key} focused={active === 'scan'} onPress={() => press(r)} />
          ) : (
            <TabItem key={r.key} name={r.name} focused={active === r.name} onPress={() => press(r)} />
          ),
        )}
      </View>
    </View>
  );
}
