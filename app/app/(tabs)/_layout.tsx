import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Platform, View, useWindowDimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { CustomTabBar, TAB_META } from '@/components/CustomTabBar';
import { AppText, Button, PressableScale } from '@/components/ui';
import { fonts, radii, spacing } from '@/constants/Theme';

const ROUTES: { name: keyof typeof TAB_META; href: string }[] = [
  { name: 'index', href: '/' },
  { name: 'stats', href: '/stats' },
  { name: 'history', href: '/history' },
  { name: 'profile', href: '/profile' },
];

function Logo() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name="tint" size={16} color={colors.onTint} />
      </View>
      <AppText style={{ fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.6 }}>tankuy</AppText>
    </View>
  );
}

function DesktopSidebar() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === '/' ? pathname === '/' || pathname === '' : pathname.startsWith(href));

  return (
    <View
      style={{
        width: 240,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.card,
        paddingTop: spacing.xxxl,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.xxxl }}>
        <Logo />
      </View>
      <View style={{ gap: 2, flex: 1 }}>
        {ROUTES.map((r) => {
          const active = isActive(r.href);
          return (
            <PressableScale
              key={r.name}
              scaleTo={0.98}
              onPress={() => router.push(r.href as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 11,
                paddingHorizontal: spacing.md,
                borderRadius: radii.sm,
                backgroundColor: active ? colors.sunken : 'transparent',
              }}
            >
              <View style={{ width: 20, alignItems: 'center' }}>
                <FontAwesome name={TAB_META[r.name].icon as any} size={16} color={active ? colors.text : colors.textMuted} />
              </View>
              <AppText variant={active ? 'bodyBold' : 'body'} tone={active ? 'primary' : 'secondary'}>
                {t(TAB_META[r.name].label)}
              </AppText>
              {active && <View style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tint }} />}
            </PressableScale>
          );
        })}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button title={t('nav.scan')} icon="camera" variant="accent" onPress={() => router.push('/scan')} />
        <Button title={t('nav.addManual')} icon="pencil" variant="secondary" onPress={() => router.push('/entry')} />
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
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } } as any}
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
