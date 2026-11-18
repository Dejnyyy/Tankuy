import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radii } from '@/constants/Theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/AppText';

export const TAB_META: Record<string, { label: string }> = {
  index: { label: 'nav.overview' },
  stats: { label: 'nav.stats' },
  scan: { label: 'nav.scan' },
  history: { label: 'nav.history' },
  profile: { label: 'nav.profile' },
};

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const meta = TAB_META[name];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t(meta.label)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }}
    >
      <View style={{ position: 'absolute', top: -1, left: 10, right: 10, height: 2, backgroundColor: focused ? colors.text : 'transparent' }} />
      <AppText
        numberOfLines={1}
        style={{ fontSize: 12, fontFamily: focused ? fonts.semi : fonts.regular, color: focused ? colors.text : colors.textMuted }}
      >
        {t(meta.label)}
      </AppText>
    </PressableScale>
  );
}

function ScanButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ width: 64, alignItems: 'center', justifyContent: 'center', height: 56 }}>
      <PressableScale
        onPress={onPress}
        haptic="medium"
        accessibilityRole="tab"
        accessibilityLabel={t('nav.scan')}
        accessibilityState={{ selected: focused }}
        style={{
          width: 48,
          height: 40,
          borderRadius: radii.md,
          backgroundColor: colors.buttonPrimary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name="camera" size={17} color={colors.buttonPrimaryText} />
      </PressableScale>
    </View>
  );
}

/** Flat bottom bar: text tabs with an ink indicator, solid scan block in the middle. */
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
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

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 4),
        alignItems: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', width: Math.min(width, 560), paddingHorizontal: 4 }}>
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
