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
      color: "#30D158",
    },
    {
      icon: "tag",
      label: t("home.stats.avgPrice", { unit: volumeUnit }),
      value: `${formatNumber(formatPricePerVolume(stats?.summary?.avg_price_per_liter), 2)} ${currencySymbol}`,
      color: "#32ADE6",
    },
    {
      icon: "dashboard",
      label: t("home.stats.avgVolume", { unit: volumeUnitLabel }),
      value: `${formatNumber(formatVolume(stats?.summary?.avg_liters_per_tank), 1)}${volumeUnit}`,
      color: "#5AC8FA",
    },
    {
      icon: "bar-chart",
      label: t("home.stats.avgTank"),
      value: `${formatNumber(convertCurrency(stats?.summary?.avg_per_tank), 0)} ${currencySymbol}`,
      color: "#5E5CE6",
    },
    {
      icon: "hashtag",
      label: t("home.stats.fillUps"),
      value: `${stats?.summary?.total_tanks || 0}`,
      color: "#FF375F",
    },
    {
      icon: "road",
      label: t("home.stats.avgDistBetweenFills", { unit: distanceUnitLabel }),
      value:
        stats?.summary?.avg_km_between_fills != null
          ? `${formatNumber(formatDistance(stats.summary.avg_km_between_fills), 0)} ${distanceUnit}`
          : "N/A",
      color: "#FF9F0A",
    },
    {
      icon: "money",
      label: t("home.stats.costPerDist", { unit: distanceUnit }),
      value:
        stats?.summary?.cost_per_km != null
          ? `${formatNumber(formatCostPerDistance(stats.summary.cost_per_km), 2)} ${currencySymbol}`
          : "N/A",
      color: "#BF5AF2",
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
          <View style={styles.chartCard}>
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
          </View>
        </ScaleInView>

        {/* ── Recent Entries ───────────────────────────────── */}
        <FadeInView delay={660} translateY={15}>
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>{t("home.recent.title")}</Text>
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
              <View style={styles.emptyCard}>
                <View
                  style={[
                    styles.emptyIconRing,
                    { borderColor: `${colors.tint}30` },
                  ]}
                >
                  <FontAwesome name="tint" size={32} color={colors.tint} />
                </View>
                <Text style={styles.emptyText}>
                  {t("home.recent.noEntries")}
                </Text>
                <Text style={styles.emptySubtext}>
                  {t("home.recent.scanFirst")}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyAction, { backgroundColor: colors.tint }]}
                  onPress={() => router.push("/(tabs)/scan")}
                >
                  <FontAwesome name="camera" size={14} color="#FFF" />
                  <Text style={styles.emptyActionText}>Scan Receipt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </FadeInView>

        {/* ── Insights ─────────────────────────────────────── */}
        {stats?.insights && hasData && (
          <FadeInView delay={800} translateY={20}>
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>
                {t("home.insights.title")}
              </Text>

              <View style={styles.insightsGrid}>
                {/* Favorite Station */}
                {stats.insights.favoriteStation && (
                  <InsightCard
                    iconName="heart"
                    iconColor="#FF3B30"
                    bgColor="rgba(255,59,48,0.1)"
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
                    iconColor="#FF9500"
                    bgColor="rgba(255,149,0,0.1)"
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
                    iconColor="#34C759"
                    bgColor="rgba(52,199,89,0.1)"
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
                    iconColor="#FF3B30"
                    bgColor="rgba(255,59,48,0.1)"
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
                    iconColor="#007AFF"
                    bgColor="rgba(0,122,255,0.1)"
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
                    iconColor="#5AC8FA"
                    bgColor="rgba(90,200,250,0.1)"
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
                    iconColor="#AF52DE"
                    bgColor="rgba(175,82,222,0.1)"
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
                    iconColor="#5856D6"
                    bgColor="rgba(88,86,214,0.1)"
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
    <View style={styles.statsCard}>
      <View style={[styles.statsIconContainer, { backgroundColor: `${color}20` }]}>
        <FontAwesome name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
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

const getStyles = (colors: any, _screenWidth: number, isLargeScreen: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      maxWidth: 800,
      width: "100%",
      alignSelf: "center",
      paddingBottom: 32,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    greeting: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    subGreeting: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    periodSelectorContainer: {
      marginHorizontal: 20,
      marginTop: 16,
      gap: 12,
    },
    periodSwitcher: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 4,
    },
    dateNavigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    navButton: {
      padding: 8,
      width: 40,
      alignItems: "center",
    },
    dateLabel: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 8,
    },
    periodButtonActive: {
      backgroundColor: colors.tint,
    },
    periodButtonText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
    },
    periodButtonTextActive: {
      color: "#FFFFFF",
    },

    // ── Stats ──────────────────────────────────────────────
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      marginTop: 20,
      gap: 8,
    },
    // Applied to each FadeInView wrapping a StatsCard — carries the layout sizing
    statsCardWrapper: {
      width: isLargeScreen ? "23%" : "47%",
      flexGrow: 1,
      maxWidth: isLargeScreen ? "25%" : "50%",
    },
    // Inner card — fills its FadeInView wrapper
    statsCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    },
    statsIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    statsValue: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    statsLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },

    // ── Chart ──────────────────────────────────────────────
    chartCard: {
      marginHorizontal: 20,
      marginTop: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 16,
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    emptyChart: {
      height: 190,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },

    // ── Recent Entries ─────────────────────────────────────
    recentSection: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    entryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    entryIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    entryInfo: {
      flex: 1,
      marginLeft: 14,
    },
    entryStation: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    entryDate: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    entryAmount: {
      alignItems: "flex-end",
    },
    entryAmountText: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    entryLiters: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // ── Empty states ────────────────────────────────────────
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
      gap: 8,
    },
    emptyIconRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },
    emptyAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 24,
      marginTop: 8,
    },
    emptyActionText: {
      color: "#FFF",
      fontWeight: "600",
      fontSize: 14,
    },

    // ── Insights ────────────────────────────────────────────
    insightsSection: {
      marginTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    insightsGrid: {
      gap: 12,
    },
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    insightIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    insightContent: {
      flex: 1,
    },
    insightLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    insightValue: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    insightSub: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });