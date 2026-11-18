import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { CustomTabBar, TAB_META } from '@/components/CustomTabBar';
import { AppText, Button, PressableScale, SIDEBAR_WIDTH, Wordmark } from '@/components/ui';
import { fonts, spacing } from '@/constants/Theme';

const ROUTES: { name: keyof typeof TAB_META; href: string }[] = [
  { name: 'index', href: '/' },
  { name: 'stats', href: '/stats' },
  { name: 'history', href: '/history' },
  { name: 'profile', href: '/profile' },
];

function DesktopSidebar() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === '/' ? pathname === '/' || pathname === '' : pathname.startsWith(href));

  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.background,
        paddingTop: spacing.huge,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xxl,
      }}
    >
      <View style={{ marginBottom: spacing.huge }}>
        <Wordmark />
      </View>
      <View style={{ flex: 1 }}>
        {ROUTES.map((r) => {
          const active = isActive(r.href);
          return (
            <PressableScale
              key={r.name}
              scaleTo={1}
              onPress={() => router.push(r.href as any)}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: -spacing.xxl, paddingLeft: spacing.xxl }}
            >
              <View style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, backgroundColor: active ? colors.text : 'transparent' }} />
              <AppText style={{ fontSize: 16, fontFamily: active ? fonts.semi : fonts.regular, color: active ? colors.text : colors.textSecondary }}>
                {t(TAB_META[r.name].label)}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button title={t('nav.scan')} icon="camera" onPress={() => router.push('/scan')} />
        <Button title={t('nav.addManual')} variant="secondary" onPress={() => router.push('/entry')} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: colors.background }}>
      {isDesktop && <DesktopSidebar />}
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => (isDesktop ? null : <CustomTabBar {...props} />)}
          screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: colors.background } } as any}
        >
          <Tabs.Screen name="index" options={{ title: `Tankuy – ${t('nav.overview')}` }} />
          <Tabs.Screen name="stats" options={{ title: `Tankuy – ${t('nav.stats')}` }} />
          <Tabs.Screen name="scan" options={{ title: `Tankuy – ${t('nav.scan')}` }} />
          <Tabs.Screen name="history" options={{ title: `Tankuy – ${t('nav.history')}` }} />
          <Tabs.Screen name="profile" options={{ title: `Tankuy – ${t('nav.profile')}` }} />
        </Tabs>
      </View>
    </View>
  );
}
