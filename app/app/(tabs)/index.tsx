import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SpendingChart from "@/components/SpendingChart";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import api, { Stats, FuelEntry } from "@/services/api";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

const screenWidth = Dimensions.get("window").width;

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return "0";
  }
  return num.toFixed(decimals);
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, i18n } = useTranslation();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">(
    "month",
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  const currencySymbol = user?.currency || "Kč";

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
        {
          month: "long",
          year: "numeric",
        },
      );
    } else {
      // Week display
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
            ? stats.chart.data
            : [0],
        strokeWidth: 2,
      },
    ],
  };

  const hasData = stats?.summary?.total_tanks && stats.summary.total_tanks > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {/* Header */}
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

        {/* Period Selector */}
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

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatsCard
            icon="credit-card"
            label={t("home.stats.totalSpent")}
            value={`${formatNumber(stats?.summary?.total_spent, 0)} Kč`}
            color={colors.tint}
            styles={styles}
          />
          <StatsCard
            icon="tint"
            label={t("home.stats.totalLiters")}
            value={`${formatNumber(stats?.summary?.total_liters, 1)}L`}
            color="#30D158"
            styles={styles}
          />
          <StatsCard
            icon="tag"
            label={t("home.stats.avgPrice")}
            value={`${formatNumber(stats?.summary?.avg_price_per_liter, 2)} Kč`}
            color="#32ADE6"
            styles={styles}
          />
          <StatsCard
            icon="dashboard"
            label={t("home.stats.avgLiters")}
            value={`${formatNumber(stats?.summary?.avg_liters_per_tank, 1)}L`}
            color="#5AC8FA"
            styles={styles}
          />
          <StatsCard
            icon="bar-chart"
            label={t("home.stats.avgTank")}
            value={`${formatNumber(stats?.summary?.avg_per_tank, 0)} Kč`}
            color="#5E5CE6"
            styles={styles}
          />
          <StatsCard
            icon="hashtag"
            label={t("home.stats.fillUps")}
            value={`${stats?.summary?.total_tanks || 0}`}
            color="#FF375F"
            styles={styles}
          />
        </View>

        {/* Spending Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t("home.chart.title")}</Text>
          {hasData ? (
            <SpendingChart
              labels={chartData.labels}
              data={chartData.datasets[0].data}
              period={period}
            />
          ) : (
            <View style={styles.emptyChart}>
              <FontAwesome
                name="line-chart"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t("home.chart.noData")}</Text>
              <Text style={styles.emptySubtext}>
                {t("home.chart.startTracking")}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Entries */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>{t("home.recent.title")}</Text>
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                styles={styles}
                colors={colors}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <FontAwesome name="tint" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t("home.recent.noEntries")}</Text>
              <Text style={styles.emptySubtext}>
                {t("home.recent.scanFirst")}
              </Text>
            </View>
          )}
        </View>

        {/* Insights Section */}
        {stats?.insights && hasData && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>{t("home.insights.title")}</Text>

            {/* Favorite Station */}
            {stats.insights.favoriteStation && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(255, 59, 48, 0.1)" },
                  ]}
                >
                  <FontAwesome name="heart" size={20} color="#FF3B30" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.favoriteStation")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {stats.insights.favoriteStation.name}
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.favoriteStationDesc", {
                      count: stats.insights.favoriteStation.count,
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Most Expensive */}
            {stats.insights.mostExpensive && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(255, 149, 0, 0.1)" },
                  ]}
                >
                  <FontAwesome name="money" size={20} color="#FF9500" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.mostExpensive")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {formatNumber(stats.insights.mostExpensive.cost, 0)}{" "}
                    {currencySymbol}
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.mostExpensiveDesc", {
                      cost: "",
                      date: new Date(
                        stats.insights.mostExpensive.date,
                      ).toLocaleDateString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Cheapest Liters */}
            {stats.insights.cheapestLiters && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(52, 199, 89, 0.1)" },
                  ]}
                >
                  <FontAwesome name="tag" size={20} color="#34C759" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.cheapest")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {formatNumber(stats.insights.cheapestLiters.price)}{" "}
                    {currencySymbol}/L
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.cheapestDesc", {
                      price: "",
                      date: new Date(
                        stats.insights.cheapestLiters.date,
                      ).toLocaleDateString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Most Expensive Liter */}
            {stats.insights.mostExpensiveLiter && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(255, 59, 48, 0.1)" },
                  ]}
                >
                  <FontAwesome name="fire" size={20} color="#FF3B30" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.mostExpensiveLiter")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {formatNumber(stats.insights.mostExpensiveLiter.price)}{" "}
                    {currencySymbol}/L
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.mostExpensiveLiterDesc", {
                      price: "",
                      date: new Date(
                        stats.insights.mostExpensiveLiter.date,
                      ).toLocaleDateString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Biggest Fill-up */}
            {stats.insights.biggestFillUp && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(0, 122, 255, 0.1)" },
                  ]}
                >
                  <FontAwesome name="tachometer" size={20} color="#007AFF" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.biggest")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {formatNumber(stats.insights.biggestFillUp.liters)} L
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.biggestDesc", {
                      liters: "",
                      date: new Date(
                        stats.insights.biggestFillUp.date,
                      ).toLocaleDateString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Smallest Fill-up */}
            {stats.insights.smallestFillUp && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(90, 200, 250, 0.1)" },
                  ]}
                >
                  <FontAwesome name="battery-1" size={20} color="#5AC8FA" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.smallest")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {formatNumber(stats.insights.smallestFillUp.liters)} L
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.smallestDesc", {
                      liters: "",
                      date: new Date(
                        stats.insights.smallestFillUp.date,
                      ).toLocaleDateString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Favorite Day */}
            {stats.insights.favoriteDay && (
              <View style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: "rgba(175, 82, 222, 0.1)" },
                  ]}
                >
                  <FontAwesome name="calendar" size={20} color="#AF52DE" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>
                    {t("home.insights.favoriteDay")}
                  </Text>
                  <Text style={styles.insightValue}>
                    {t(
                      `home.insights.dayName.${stats.insights.favoriteDay.day}`,
                    )}
                  </Text>
                  <Text style={styles.insightSub}>
                    {t("home.insights.favoriteDayDesc", {
                      count: stats.insights.favoriteDay.count,
                      day: t(
                        `home.insights.dayName.${stats.insights.favoriteDay.day}`,
                      ).toLowerCase(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Last Fill-Up */}
            {stats.insights.lastFillUpDays !== null &&
              stats.insights.lastFillUpDays !== undefined && (
                <View style={styles.insightCard}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: "rgba(88, 86, 214, 0.1)" },
                    ]}
                  >
                    <FontAwesome name="history" size={20} color="#5856D6" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightLabel}>
                      {t("home.insights.lastFillUp")}
                    </Text>
                    <Text style={styles.insightValue}>
                      {stats.insights.lastFillUpDays === 0
                        ? t("home.insights.lastFillUpToday")
                        : stats.insights.lastFillUpDays === 1
                          ? t("home.insights.lastFillUpYesterday")
                          : t("home.insights.lastFillUpDays", {
                              days: stats.insights.lastFillUpDays,
                            })}
                    </Text>
                    <Text style={styles.insightSub}>
                      {stats.insights.lastFillUpDays === 0
                        ? t("home.insights.lastFillUpToday")
                        : stats.insights.lastFillUpDays === 1
                          ? t("home.insights.lastFillUpYesterday")
                          : `${stats.insights.lastFillUpDays} days ago`}
                    </Text>
                  </View>
                </View>
              )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
      <View
        style={[styles.statsIconContainer, { backgroundColor: `${color}20` }]}
      >
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
}: {
  entry: FuelEntry;
  styles: any;
  colors: any;
}) {
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity style={styles.entryCard} activeOpacity={0.7}>
      <View style={styles.entryIconContainer}>
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
          {Number(entry.totalCost).toFixed(0)} Kč
        </Text>
        {entry.totalLiters && (
          <Text style={styles.entryLiters}>
            {Number(entry.totalLiters).toFixed(1)}L
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      marginTop: 20,
      gap: 8,
    },
    statsCard: {
      width: (screenWidth - 32) / 2,
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
    chart: {
      borderRadius: 12,
      marginLeft: -8,
    },
    emptyChart: {
      height: 180,
      justifyContent: "center",
      alignItems: "center",
    },
    recentSection: {
      marginTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 0,
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
      backgroundColor: colors.primaryLight,
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
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: "center",
    },
    insightsSection: {
      marginTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
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
