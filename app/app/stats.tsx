// app/stats.tsx — full statistics grid, moved off the dashboard.
// Ports (from app/(tabs)/index.tsx): the statCards array construction
// (icons, labels, unit conversions) and the grid tile rendering, adapted to:
// - data: own fetch via api.getStats(period, new Date().toISOString())
//   with period from useLocalSearchParams<{ period }>(), defaulting to 'month'
// - layout: ScreenHeader title above a 2-column grid of Card tiles; each
//   tile: icon in a tinted circle, value in bodyBold tabular text, caption label
// - loading: skeleton blocks (colors.inputBackground rounded rects), no spinner
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/context/ThemeContext";
import api, { Stats } from "@/services/api";
import { useUnits } from "@/hooks/useUnits";
import { Card, ScreenHeader, SectionHeader } from "@/components/ui";
import { spacing, radii, typography } from "@/constants/Theme";
import { FadeInView } from "@/components/AnimatedComponents";

type Period = "week" | "month" | "year" | "all";
const VALID_PERIODS: Period[] = ["week", "month", "year", "all"];

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return "0";
  }
  return num.toFixed(decimals);
};

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ period?: string }>();
  const period: Period = VALID_PERIODS.includes(params.period as Period)
    ? (params.period as Period)
    : "month";

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    currencySymbol,
    volumeUnit,
    distanceUnit,
    volumeUnitLabel,
    distanceUnitLabel,
    formatVolume,
    formatPricePerVolume,
    formatCostPerDistance,
    formatDistance,
    convertCurrency,
    isImperial,
  } = useUnits();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const statsData = await api.getStats(period, new Date().toISOString());
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats data:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats cards definition — ported verbatim from app/(tabs)/index.tsx
  const statCards = [
    {
      icon: "credit-card",
      label: t("home.stats.totalSpent"),
      value: `${formatNumber(convertCurrency(stats?.summary?.total_spent), 0)} ${currencySymbol}`,
      color: colors.tint,
    },
    {
      icon: "tint",
      label: t("home.stats.totalVolume", { unit: volumeUnitLabel }),
      value: `${formatNumber(formatVolume(stats?.summary?.total_liters), 1)}${volumeUnit}`,
      color: colors.stats.green,
    },
    {
      icon: "tag",
      label: t("home.stats.avgPrice", { unit: volumeUnit }),
      value: `${formatNumber(formatPricePerVolume(stats?.summary?.avg_price_per_liter), 2)} ${currencySymbol}`,
      color: colors.stats.teal,
    },
    {
      icon: "dashboard",
      label: t("home.stats.avgVolume", { unit: volumeUnitLabel }),
      value: `${formatNumber(formatVolume(stats?.summary?.avg_liters_per_tank), 1)}${volumeUnit}`,
      color: colors.stats.lightBlue,
    },
    {
      icon: "bar-chart",
      label: t("home.stats.avgTank"),
      value: `${formatNumber(convertCurrency(stats?.summary?.avg_per_tank), 0)} ${currencySymbol}`,
      color: colors.stats.indigo,
    },
    {
      icon: "hashtag",
      label: t("home.stats.fillUps"),
      value: `${stats?.summary?.total_tanks || 0}`,
      color: colors.stats.pink,
    },
    {
      icon: "road",
      label: t("home.stats.avgDistBetweenFills", { unit: distanceUnitLabel }),
      value:
        stats?.summary?.avg_km_between_fills != null
          ? `${formatNumber(formatDistance(stats.summary.avg_km_between_fills), 0)} ${distanceUnit}`
          : "N/A",
      color: colors.stats.amber,
    },
    {
      icon: "money",
      label: t("home.stats.costPerDist", { unit: distanceUnit }),
      value:
        stats?.summary?.cost_per_km != null
          ? `${formatNumber(formatCostPerDistance(stats.summary.cost_per_km), 2)} ${currencySymbol}`
          : "N/A",
      color: colors.stats.purple,
    },
    {
      icon: "leaf",
      label: t("home.stats.avgConsumption"),
      value: (() => {
        const c = stats?.summary?.avg_consumption;
        if (c == null) return "N/A";
        if (isImperial) {
          const mpg = 235.214 / c;
          return `${formatNumber(mpg, 1)} mpg`;
        }
        return `${formatNumber(c, 1)} L/100km`;
      })(),
      // Duplicate of stats.green — collapses to the palette success color.
      color: colors.success,
    },
  ];

  const hasData = stats?.summary?.total_tanks && stats.summary.total_tanks > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title={t("stats.title")}
        rightElement={
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <FontAwesome name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {loading
            ? Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={styles.tileWrapper}>
                  <Card style={styles.skeletonCard}>
                    <View style={styles.skeletonIcon} />
                    <View style={styles.skeletonValue} />
                    <View style={styles.skeletonLabel} />
                  </Card>
                </View>
              ))
            : statCards.map((card, i) => (
                <FadeInView
                  key={card.icon}
                  delay={i * 55}
                  translateY={16}
                  style={styles.tileWrapper}
                >
                  <StatsTile {...card} styles={styles} />
                </FadeInView>
              ))}
        </View>

        {/* ── Insights — ported from the pre-redesign dashboard ── */}
        {!loading && stats?.insights && hasData && (
          <FadeInView delay={520} translateY={20}>
            <View style={styles.insightsSection}>
              <SectionHeader title={t("home.insights.title")} />

              <View style={styles.insightsGrid}>
                {/* Favorite Station */}
                {stats.insights.favoriteStation && (
                  <InsightCard
                    iconName="heart"
                    iconColor={colors.error}
                    bgColor={`${colors.error}1A`}
                    label={t("home.insights.favoriteStation")}
                    value={stats.insights.favoriteStation.name}
                    sub={t("home.insights.favoriteStationDesc", {
                      count: stats.insights.favoriteStation.count,
                    })}
                    styles={styles}
                    delay={560}
                  />
                )}

                {/* Most Expensive */}
                {stats.insights.mostExpensive && (
                  <InsightCard
                    iconName="money"
                    iconColor={colors.primary}
                    bgColor={`${colors.primary}1A`}
                    label={t("home.insights.mostExpensive")}
                    value={`${formatNumber(convertCurrency(stats.insights.mostExpensive.cost), 0)} ${currencySymbol}`}
                    sub={t("home.insights.mostExpensiveDesc", {
                      cost: "",
                      date: new Date(stats.insights.mostExpensive.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    delay={620}
                  />
                )}

                {/* Cheapest Liters */}
                {stats.insights.cheapestLiters && (
                  <InsightCard
                    iconName="tag"
                    // Duplicate of stats.green — collapses to the palette success color.
                    iconColor={colors.success}
                    bgColor={`${colors.success}1A`}
                    label={t("home.insights.cheapest")}
                    value={`${formatNumber(formatPricePerVolume(stats.insights.cheapestLiters.price))} ${currencySymbol}/${volumeUnit}`}
                    sub={t("home.insights.cheapestDesc", {
                      price: "",
                      date: new Date(stats.insights.cheapestLiters.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    delay={680}
                  />
                )}

                {/* Most Expensive Liter */}
                {stats.insights.mostExpensiveLiter && (
                  <InsightCard
                    iconName="fire"
                    iconColor={colors.error}
                    bgColor={`${colors.error}1A`}
                    label={t("home.insights.mostExpensivePrice", { unit: volumeUnit })}
                    value={`${formatNumber(formatPricePerVolume(stats.insights.mostExpensiveLiter.price))} ${currencySymbol}/${volumeUnit}`}
                    sub={t("home.insights.mostExpensiveLiterDesc", {
                      price: "",
                      date: new Date(stats.insights.mostExpensiveLiter.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    delay={720}
                  />
                )}

                {/* Biggest Fill-up */}
                {stats.insights.biggestFillUp && (
                  <InsightCard
                    iconName="tachometer"
                    iconColor={colors.stats.blue}
                    bgColor={`${colors.stats.blue}1A`}
                    label={t("home.insights.biggest")}
                    value={`${formatNumber(formatVolume(stats.insights.biggestFillUp.liters))} ${volumeUnit}`}
                    sub={t("home.insights.biggestDesc", {
                      liters: "",
                      date: new Date(stats.insights.biggestFillUp.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    delay={760}
                  />
                )}

                {/* Smallest Fill-up */}
                {stats.insights.smallestFillUp && (
                  <InsightCard
                    iconName="battery-1"
                    iconColor={colors.stats.lightBlue}
                    bgColor={`${colors.stats.lightBlue}1A`}
                    label={t("home.insights.smallest")}
                    value={`${formatNumber(formatVolume(stats.insights.smallestFillUp.liters))} ${volumeUnit}`}
                    sub={t("home.insights.smallestDesc", {
                      liters: "",
                      date: new Date(stats.insights.smallestFillUp.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    delay={800}
                  />
                )}

                {/* Favorite Day */}
                {stats.insights.favoriteDay && (
                  <InsightCard
                    iconName="calendar"
                    iconColor={colors.stats.purple}
                    bgColor={`${colors.stats.purple}1A`}
                    label={t("home.insights.favoriteDay")}
                    value={t(`home.insights.dayName.${stats.insights.favoriteDay.day}`)}
                    sub={t("home.insights.favoriteDayDesc", {
                      count: stats.insights.favoriteDay.count,
                      day: t(`home.insights.dayName.${stats.insights.favoriteDay.day}`).toLowerCase(),
                    })}
                    styles={styles}
                    delay={840}
                  />
                )}

                {/* Last Fill-Up */}
                {stats.insights.lastFillUpDays != null && (
                  <InsightCard
                    iconName="history"
                    iconColor={colors.stats.indigo}
                    bgColor={`${colors.stats.indigo}1A`}
                    label={t("home.insights.lastFillUp")}
                    value={
                      stats.insights.lastFillUpDays === 0
                        ? t("home.insights.lastFillUpToday")
                        : stats.insights.lastFillUpDays === 1
                          ? t("home.insights.lastFillUpYesterday")
                          : t("home.insights.lastFillUpDays", { days: stats.insights.lastFillUpDays })
                    }
                    sub={
                      stats.insights.lastFillUpDays === 0
                        ? t("home.insights.lastFillUpToday")
                        : stats.insights.lastFillUpDays === 1
                          ? t("home.insights.lastFillUpYesterday")
                          : t("home.insights.lastFillUpDays", { days: stats.insights.lastFillUpDays })
                    }
                    styles={styles}
                    delay={880}
                  />
                )}
              </View>
            </View>
          </FadeInView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatsTile({
  icon,
  label,
  value,
  color,
  styles,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  styles: any;
}) {
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIconContainer, { backgroundColor: `${color}26` }]}>
        <FontAwesome name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

function InsightCard({
  iconName,
  iconColor,
  bgColor,
  label,
  value,
  sub,
  styles,
  delay,
}: {
  iconName: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
  sub: string;
  styles: any;
  delay: number;
}) {
  return (
    <FadeInView delay={delay} translateY={12}>
      <Card style={styles.insightCard}>
        <View style={[styles.insightIcon, { backgroundColor: bgColor }]}>
          <FontAwesome name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightLabel}>{label}</Text>
          <Text style={styles.insightValue}>{value}</Text>
          <Text style={styles.insightSub}>{sub}</Text>
        </View>
      </Card>
    </FadeInView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      width: 36, // fixed tap target, matches (legal) close/back button convention
      height: 36,
      borderRadius: radii.full,
      backgroundColor: colors.elevated,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
    },
    tileWrapper: {
      width: "47%",
      flexGrow: 1,
      maxWidth: "50%",
    },
    tile: {
      flex: 1,
    },
    tileIconContainer: {
      width: 36, // icon container, not on the spacing scale
      height: 36,
      borderRadius: 10, // between radii.sm(8)/md(12) — kept exact
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    tileValue: {
      ...typography.bodyBold,
      fontVariant: ["tabular-nums"],
      color: colors.text,
    },
    tileLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },

    // ── Skeleton (loading) ─────────────────────────────────
    skeletonCard: {
      flex: 1,
    },
    skeletonIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      marginBottom: spacing.md,
    },
    skeletonValue: {
      width: "60%",
      height: 18,
      borderRadius: radii.sm,
      backgroundColor: colors.inputBackground,
      marginBottom: spacing.xs,
    },
    skeletonLabel: {
      width: "85%",
      height: 13,
      borderRadius: radii.sm,
      backgroundColor: colors.inputBackground,
    },

    // ── Insights ────────────────────────────────────────────
    insightsSection: {
      marginTop: spacing.xxl,
      paddingBottom: spacing.sm,
    },
    insightsGrid: {
      gap: spacing.md,
    },
    // Background/radius/padding/shadow come from the Card component; this
    // only lays out the icon + text row.
    insightCard: {
      flexDirection: "row",
      alignItems: "center",
    },
    insightIcon: {
      width: 48, // circular icon avatar, not on the spacing scale
      height: 48,
      borderRadius: 24, // radius = size / 2, not on the radii scale
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.lg,
    },
    insightContent: {
      flex: 1,
    },
    insightLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    insightValue: {
      // Kept literal (not typography.title): fontSize 17 is off-scale and the
      // token's lineHeight (34, sized for 28px) would make each insight card taller.
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    insightSub: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
