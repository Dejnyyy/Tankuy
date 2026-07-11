import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SpendingChart from "@/components/SpendingChart";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import api, { Stats, FuelEntry } from "@/services/api";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  FadeInView,
  ScaleInView,
  AnimatedPressable,
} from "@/components/AnimatedComponents";
import { useUnits } from "@/hooks/useUnits";
import { Card, SectionHeader, EmptyState } from "@/components/ui";
import { spacing, radii, typography } from "@/constants/Theme";

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return "0";
  }
  return num.toFixed(decimals);
};

export default function HomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isLargeScreen = screenWidth >= 768;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () => getStyles(colors, screenWidth, isLargeScreen),
    [colors, screenWidth, isLargeScreen],
  );
  const { t, i18n } = useTranslation();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">(
    "month",
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    currencySymbol,
    volumeUnit,
    distanceUnit,
    volumeUnitLabel,
    distanceUnitLabel,
    formatVolume,
    formatDistance,
    formatPricePerVolume,
    formatCostPerDistance,
    convertCurrency,
    isImperial,
  } = useUnits();

  const loadData = useCallback(async () => {
    try {
      const [statsData, entriesData] = await Promise.all([
        api.getStats(period, currentDate.toISOString()),
        api.getEntries({ limit: 5 }),
      ]);
      setStats(statsData);
      setRecentEntries(entriesData);
    } catch (error) {
      console.error("Failed to load home data:", error);
    } finally {
      setLoading(false);
    }
  }, [period, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (period === "week") {
      newDate.setDate(newDate.getDate() + amount * 7);
    } else if (period === "month") {
      newDate.setMonth(newDate.getMonth() + amount);
    } else {
      newDate.setFullYear(newDate.getFullYear() + amount);
    }
    setCurrentDate(newDate);
  };

  const formattedPeriod = () => {
    if (period === "all") {
      return t("home.allTime");
    } else if (period === "year") {
      return currentDate.getFullYear().toString();
    } else if (period === "month") {
      return currentDate.toLocaleDateString(
        i18n.language === "cs" ? "cs-CZ" : "en-US",
        { month: "long", year: "numeric" },
      );
    } else {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getDate()}.${startOfWeek.getMonth() + 1}. - ${endOfWeek.getDate()}.${endOfWeek.getMonth() + 1}.`;
    }
  };

  const chartData = {
    labels:
      stats?.chart?.labels && stats.chart.labels.length > 0
        ? stats.chart.labels
        : ["No Data"],
    datasets: [
      {
        data:
          stats?.chart?.data && stats.chart.data.length > 0
            ? stats.chart.data.map((val) => convertCurrency(val) || 0)
            : [0],
        strokeWidth: 2,
      },
    ],
  };

  const hasData = stats?.summary?.total_tanks && stats.summary.total_tanks > 0;

  // Stats cards definition — keeps JSX clean and enables proper per-card stagger
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────── */}
        <FadeInView delay={0} translateY={15}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {user?.name
                  ? t("home.greeting", { name: user.name.split(" ")[0] })
                  : t("home.greetingDefault")}
              </Text>
              <Text style={styles.subGreeting}>{t("home.subGreeting")}</Text>
            </View>
          </View>
        </FadeInView>

        {/* ── Period Selector ──────────────────────────────── */}
        <FadeInView delay={80} translateY={10}>
          <View style={styles.periodSelectorContainer}>
            <View style={styles.periodSwitcher}>
              {(["week", "month", "year", "all"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodButton,
                    period === p && styles.periodButtonActive,
                  ]}
                  onPress={() => {
                    setPeriod(p);
                    setCurrentDate(new Date());
                  }}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      period === p && styles.periodButtonTextActive,
                    ]}
                  >
                    {t(`home.periods.${p}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Navigation */}
            <View style={styles.dateNavigation}>
              {period !== "all" && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => changeDate(-1)}
                >
                  <FontAwesome
                    name="chevron-left"
                    size={16}
                    color={colors.tint}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.dateLabel}>{formattedPeriod()}</Text>
              {period !== "all" && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => changeDate(1)}
                >
                  <FontAwesome
                    name="chevron-right"
                    size={16}
                    color={colors.tint}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </FadeInView>

        {/* ── Stats Cards — individually staggered ────────── */}
        <View style={styles.statsContainer}>
          {statCards.map((card, i) => (
            <FadeInView
              key={card.icon}
              delay={120 + i * 55}
              translateY={16}
              style={styles.statsCardWrapper}
            >
              <StatsCard {...card} styles={styles} />
            </FadeInView>
          ))}
        </View>

        {/* ── Spending Chart ───────────────────────────────── */}
        <ScaleInView delay={580}>
          <Card padded={false} style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t("home.chart.title")}</Text>
            {hasData ? (
              <SpendingChart
                labels={chartData.labels}
                data={chartData.datasets[0].data}
                period={period}
                currency={currencySymbol}
              />
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? (["transparent", `${colors.tint}18`] as const)
                    : (["transparent", `${colors.tint}10`] as const)
                }
                style={styles.emptyChart}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <FontAwesome
                  name="line-chart"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>{t("home.chart.noData")}</Text>
                <Text style={styles.emptySubtext}>
                  {t("home.chart.startTracking")}
                </Text>
              </LinearGradient>
            )}
          </Card>
        </ScaleInView>

        {/* ── Recent Entries ───────────────────────────────── */}
        <FadeInView delay={660} translateY={15}>
          <View style={styles.recentSection}>
            <SectionHeader title={t("home.recent.title")} />
            {recentEntries.length > 0 ? (
              recentEntries.map((entry, i) => (
                <FadeInView key={entry.id} delay={700 + i * 70} translateY={10}>
                  <EntryCard
                    entry={entry}
                    styles={styles}
                    colors={colors}
                    units={{
                      currencySymbol,
                      volumeUnit,
                      formatVolume,
                      convertCurrency,
                    }}
                  />
                </FadeInView>
              ))
            ) : (
              <EmptyState
                icon={<FontAwesome name="tint" size={48} color={colors.textMuted} />}
                title={t("home.recent.noEntries")}
                message={t("home.recent.scanFirst")}
                ctaLabel={t("home.recent.scanAction")}
                onCta={() => router.push("/(tabs)/scan")}
              />
            )}
          </View>
        </FadeInView>

        {/* ── Insights ─────────────────────────────────────── */}
        {stats?.insights && hasData && (
          <FadeInView delay={800} translateY={20}>
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
                    colors={colors}
                    delay={840}
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
                    colors={colors}
                    delay={900}
                  />
                )}

                {/* Cheapest Liters */}
                {stats.insights.cheapestLiters && (
                  <InsightCard
                    iconName="tag"
                    iconColor={colors.success}
                    bgColor={`${colors.success}1A`}
                    label={t("home.insights.cheapest")}
                    value={`${formatNumber(formatPricePerVolume(stats.insights.cheapestLiters.price))} ${currencySymbol}/${volumeUnit}`}
                    sub={t("home.insights.cheapestDesc", {
                      price: "",
                      date: new Date(stats.insights.cheapestLiters.date).toLocaleDateString(),
                    })}
                    styles={styles}
                    colors={colors}
                    delay={960}
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
                    colors={colors}
                    delay={1000}
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
                    colors={colors}
                    delay={1040}
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
                    colors={colors}
                    delay={1080}
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
                    colors={colors}
                    delay={1120}
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
                          : `${stats.insights.lastFillUpDays} days ago`
                    }
                    styles={styles}
                    colors={colors}
                    delay={1160}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatsCard({
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
    <Card style={styles.statsCard}>
      <View style={[styles.statsIconContainer, { backgroundColor: `${color}20` }]}>
        <FontAwesome name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </Card>
  );
}

function EntryCard({
  entry,
  styles,
  colors,
  units,
}: {
  entry: FuelEntry;
  styles: any;
  colors: any;
  units: any;
}) {
  const { currencySymbol, volumeUnit, formatVolume, convertCurrency } = units;
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <AnimatedPressable style={styles.entryCard} scaleValue={0.97}>
      <View style={[styles.entryIconContainer, { backgroundColor: colors.primaryLight }]}>
        <FontAwesome name="tint" size={18} color={colors.tint} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryStation} numberOfLines={1}>
          {entry.stationName || "Gas Station"}
        </Text>
        <Text style={styles.entryDate}>{formattedDate}</Text>
      </View>
      <View style={styles.entryAmount}>
        <Text style={styles.entryAmountText}>
          {Number(convertCurrency(entry.totalCost)).toFixed(0)} {currencySymbol}
        </Text>
        {entry.totalLiters && (
          <Text style={styles.entryLiters}>
            {Number(formatVolume(entry.totalLiters)).toFixed(1)}
            {volumeUnit}
          </Text>
        )}
      </View>
    </AnimatedPressable>
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
  colors: _colors,
  delay,
}: {
  iconName: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
  sub: string;
  styles: any;
  colors: any;
  delay: number;
}) {
  return (
    <FadeInView delay={delay} translateY={12}>
      <View style={styles.insightCard}>
        <View style={[styles.insightIcon, { backgroundColor: bgColor }]}>
          <FontAwesome name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightLabel}>{label}</Text>
          <Text style={styles.insightValue}>{value}</Text>
          <Text style={styles.insightSub}>{sub}</Text>
        </View>
      </View>
    </FadeInView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
//
// Note: values that sit exactly between two spacing/radii tokens (e.g. 10 between
// spacing.sm=8/md=12) are kept as explicit literals rather than force a directional
// rounding — same convention used in the login screen migration.

const getStyles = (colors: any, _screenWidth: number, isLargeScreen: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      maxWidth: 800, // page max-width, not a spacing value
      width: "100%",
      alignSelf: "center",
      paddingBottom: spacing.xxxl,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    greeting: {
      ...typography.title,
      color: colors.text,
    },
    subGreeting: {
      // Kept literal (not typography.body): fontSize 15 is off-scale and the
      // token's lineHeight (22, sized for 16px) would alter the original
      // natural line height.
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    periodSelectorContainer: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    periodSwitcher: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: radii.md,
      padding: spacing.xs,
    },
    dateNavigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    navButton: {
      padding: spacing.sm,
      width: 40, // fixed tap target, not on the spacing scale
      alignItems: "center",
    },
    dateLabel: {
      ...typography.bodyBold,
      color: colors.text,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10, // between spacing.sm(8)/md(12) — kept exact
      alignItems: "center",
      borderRadius: radii.sm,
    },
    periodButtonActive: {
      backgroundColor: colors.tint,
    },
    periodButtonText: {
      // Kept literal (not typography.bodyBold): fontSize 14 is off-scale and the
      // token's lineHeight (22, sized for 16px) would alter the original natural
      // line height.
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
    },
    periodButtonTextActive: {
      color: colors.white,
    },

    // ── Stats ──────────────────────────────────────────────
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.md,
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    // Applied to each FadeInView wrapping a StatsCard — carries the layout sizing
    statsCardWrapper: {
      width: isLargeScreen ? "23%" : "47%",
      flexGrow: 1,
      maxWidth: isLargeScreen ? "25%" : "50%",
    },
    // Inner card — fills its FadeInView wrapper. Background/radius/padding now
    // come from the Card component (radii.lg/spacing.lg match the old 16/16 exactly).
    statsCard: {
      flex: 1,
    },
    statsIconContainer: {
      width: 36, // icon container, not on the spacing scale
      height: 36,
      borderRadius: 10, // between radii.sm(8)/md(12) — kept exact
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    statsValue: {
      // Kept literal (not typography.title): fontSize 22 is off-scale and the
      // token's lineHeight (34, sized for 28px) would make each stat tile taller.
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    statsLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },

    // ── Chart ──────────────────────────────────────────────
    // Background/radius now come from the Card component (radii.lg matches the old 16 exactly).
    chartCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.xl,
      paddingVertical: spacing.lg,
      overflow: "hidden",
    },
    chartTitle: {
      // Kept literal (not typography.bodyBold): fontSize 17 is off-scale and the
      // token's lineHeight (22, sized for 16px) would alter the original natural
      // line height.
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    emptyChart: {
      height: 190, // chart placeholder height, not a spacing value
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm,
    },

    // ── Recent Entries ─────────────────────────────────────
    recentSection: {
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
    entryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14, // between radii.md(12)/lg(16) — kept exact
      padding: 14, // between spacing.md(12)/lg(16) — kept exact
      marginBottom: 10, // between spacing.sm(8)/md(12) — kept exact
    },
    entryIconContainer: {
      width: 44, // icon container, not on the spacing scale
      height: 44,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
    },
    entryInfo: {
      flex: 1,
      marginLeft: 14, // between spacing.md(12)/lg(16) — kept exact
    },
    entryStation: {
      ...typography.bodyBold,
      color: colors.text,
    },
    entryDate: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    entryAmount: {
      alignItems: "flex-end",
    },
    entryAmountText: {
      // Kept literal (not typography.bodyBold): fontSize 17 is off-scale and the
      // token's lineHeight (22, sized for 16px) would alter the original natural
      // line height.
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    entryLiters: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },

    // ── Empty states ────────────────────────────────────────
    // Shared by the chart's own "no data" placeholder above (the recent-entries
    // empty state now uses the EmptyState component instead).
    emptyText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    emptySubtext: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },

    // ── Insights ────────────────────────────────────────────
    insightsSection: {
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    insightsGrid: {
      gap: spacing.md,
    },
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
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
