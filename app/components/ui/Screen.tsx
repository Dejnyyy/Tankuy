import React from 'react';
import { Platform, RefreshControl, ScrollView, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { MAX_CONTENT_WIDTH, spacing } from '@/constants/Theme';
import { AppText } from './AppText';

export const TAB_BAR_SPACE = 96;
export const SIDEBAR_WIDTH = 232;

export function useLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const contentWidth = Math.min(width - (isDesktop ? SIDEBAR_WIDTH : 0), MAX_CONTENT_WIDTH);
  return {
    width,
    isDesktop,
    /** Two-column layouts from ~ tablet width */
    isWide: contentWidth >= 860,
    gutter: isDesktop ? spacing.huge : spacing.lg,
    contentWidth,
  };
}

interface ScreenProps {
  title?: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Fixed content rendered above the scroll view (e.g. search bar). */
  stickyTop?: React.ReactNode;
}

/** Standard screen: safe area, centred max-width column, big title, pull-to-refresh. */
export function Screen({ title, subtitle, overline, right, children, refreshing, onRefresh, scroll = true, contentStyle, stickyTop }: ScreenProps) {
  const { colors } = useTheme();
  const { isDesktop, gutter } = useLayout();

  const header =
    title !== undefined ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingTop: isDesktop ? spacing.huge : spacing.lg,
          paddingBottom: isDesktop ? spacing.xxxl : spacing.xxl,
          minHeight: 44,
        }}
      >
        <View style={{ flex: 1 }}>
          {overline ? (
            <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.xs }}>
              {overline}
            </AppText>
          ) : null}
          <AppText variant="title" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>
    ) : null;

  const inner = (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[
        { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: gutter },
        contentStyle,
      ]}
    >
      {header}
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {stickyTop}
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: isDesktop ? spacing.giant : TAB_BAR_SPACE }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
