import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SpendingChart from "@/components/SpendingChart";
import { useTheme } from "@/context/ThemeContext";
import api, { Stats, FuelEntry } from "@/services/api";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FadeInView, ScaleInView } from "@/components/AnimatedComponents";
import { useUnits } from "@/hooks/useUnits";
import { Card, EmptyState, Button, AnimatedNumber } from "@/components/ui";
import { spacing, radii, typography } from "@/constants/Theme";

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return "0";
  }
  return num.toFixed(decimals);
};

type ScrubPoint = { index: number; value: number; label: string };

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, i18n } = useTranslation();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">(
    "month",
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  // Scrub state for the chart: while the user drags across the chart, the
  // hero number and the caption beneath it track the scrubbed point instead
  // of the period total.
  const [scrubPoint, setScrubPoint] = useState<ScrubPoint | null>(null);

  const {
    currencySymbol,
    volumeUnit,
    volumeUnitLabel,
    formatVolume,
    formatPricePerVolume,
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

  // Kept for a future date-navigation control — not wired to any element in
  // the chart-first header, which now shows only the resolved period label.
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

  // Hero value: the scrubbed chart point while dragging, otherwise the
  // period total. Both are already run through convertCurrency, so the
  // number displayed by AnimatedNumber is always in the user's currency.
  const totalSpent = convertCurrency(stats?.summary?.total_spent) ?? 0;
  const heroValue = scrubPoint ? scrubPoint.value : totalSpent;

  // fmtCurrency must be a stable reference — AnimatedNumber resubscribes its
  // animated reaction whenever `format` changes identity.
  const fmtCurrency = useCallback(
    (n: number) => `${formatNumber(n, 0)} ${currencySymbol}`,
    [currencySymbol],
  );

  // The Stats payload (services/api.ts) carries no previous-period
  // comparison field, so the trend arrows described in the brief have
  // nothing to compare against — sanctioned fallback: hide that line when
  // not scrubbing, and use the slot only to show the scrubbed point's label.
  const heroCaption = scrubPoint ? scrubPoint.label : "";

  // Stat strip — three entries ported from the 9-tile array that now lives
  // in app/stats.tsx (Task 5); same formatting, just a smaller subset.
  const statStripCards = [
    {
      key: "volume",
      label: t("home.stats.totalVolume", { unit: volumeUnitLabel }),
      value: `${formatNumber(formatVolume(stats?.summary?.total_liters), 1)}${volumeUnit}`,
      color: colors.stats.green,
    },
    {
      key: "avgConsumption",
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
      color: colors.success,
    },
    {
      key: "avgPrice",
      label: t("home.stats.avgPrice", { unit: volumeUnit }),
      value: `${formatNumber(formatPricePerVolume(stats?.summary?.avg_price_per_liter), 2)} ${currencySymbol}`,
      color: colors.stats.teal,
    },
  ];

  const lastEntry = recentEntries[0];
  const lastEntryDaysAgo = lastEntry
    ? Math.floor(
        (Date.now() - new Date(lastEntry.date).getTime()) / 86400000,
      )
    : null;
  const lastEntryRelative =
    lastEntryDaysAgo == null
      ? ""
      : lastEntryDaysAgo <= 0
        ? t("home.insights.lastFillUpToday")
        : lastEntryDaysAgo === 1
          ? t("home.insights.lastFillUpYesterday")
          : t("home.insights.lastFillUpDays", { days: lastEntryDaysAgo });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
        {/* ── Header: period caption + pills ─────────────────── */}
        <FadeInView delay={0} translateY={12}>
          <View style={styles.header}>
            <Text style={styles.headerCaption}>{formattedPeriod()}</Text>
            <View style={styles.periodPills}>
              {(["week", "month", "year", "all"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodPill,
                    period === p && styles.periodPillActive,
                  ]}
                  onPress={() => {
                    setPeriod(p);
                    setCurrentDate(new Date());
                  }}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      period === p && styles.periodPillTextActive,
                    ]}
                  >
                    {t(`home.periods.${p}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <AnimatedNumber
            value={heroValue}
            format={fmtCurrency}
            style={[typography.hero, { color: colors.text }]}
          />
          <Text style={styles.heroCaption}>{heroCaption}</Text>
        </View>

        {/* ── Chart / empty state ──────────────────────────────── */}
        <ScaleInView delay={120}>
          {hasData ? (
            <Card padded={false} style={styles.chartCard}>
              <SpendingChart
                labels={chartData.labels}
                data={chartData.datasets[0].data}
                period={period}
                currency={currencySymbol}
                onScrub={setScrubPoint}
              />
            </Card>
          ) : (
            <EmptyState
              icon={<FontAwesome name="tint" size={48} color={colors.tint} />}
              title={t("home.empty.title")}
              message={t("home.empty.message")}
              ctaLabel={t("home.scanReceipt")}
              onCta={() => router.push("/(tabs)/scan")}
            />
          )}
        </ScaleInView>

        {/* ── Stat strip ────────────────────────────────────────── */}
        {hasData && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statStrip}
            contentContainerStyle={styles.statStripContent}
          >
            {statStripCards.map((card) => (
              <TouchableOpacity
                key={card.key}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: "/stats", params: { period } })
                }
              >
                <Card style={styles.statStripCard}>
                  <View style={styles.statStripHeader}>
                    <View
                      style={[styles.statDot, { backgroundColor: card.color }]}
                    />
                    <Text style={styles.statStripLabel} numberOfLines={1}>
                      {card.label}
                    </Text>
                  </View>
                  <Text style={styles.statStripValue}>{card.value}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Last entry ───────────────────────────────────────── */}
        {lastEntry && (
          <TouchableOpacity
            style={styles.lastEntryRow}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/history")}
          >
            <Text style={styles.lastEntryText} numberOfLines={1}>
              <Text style={styles.lastEntryLabel}>
                {t("home.lastEntry")}:{" "}
              </Text>
              {lastEntry.stationName || "Gas Station"} ·{" "}
              {formatNumber(convertCurrency(lastEntry.totalCost), 0)}{" "}
              {currencySymbol} · {lastEntryRelative}
            </Text>
            <FontAwesome
              name="chevron-right"
              size={12}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Actions row — fixed above the tab bar ───────────────── */}
      <View style={styles.actionsRow}>
        <Button
          title={t("home.scanReceipt")}
          icon={<FontAwesome name="camera" size={18} color={colors.buttonPrimaryText} />}
          onPress={() => router.push("/(tabs)/scan")}
          style={styles.scanButton}
        />
        <Button
          title={t("home.enterManually")}
          variant="ghost"
          size="sm"
          onPress={() =>
            router.push({ pathname: "/(tabs)/scan", params: { mode: "manual" } })
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
//
// Note: values that sit exactly between two spacing/radii tokens (e.g. 10 between
// spacing.sm=8/md=12) are kept as explicit literals rather than force a directional
// rounding — same convention used in the login screen migration.

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      maxWidth: 800, // page max-width, not a spacing value
      width: "100%",
      alignSelf: "center",
      paddingBottom: spacing.xxl,
    },

    // ── Header ─────────────────────────────────────────────
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerCaption: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    periodPills: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    periodPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: colors.inputBackground,
    },
    periodPillActive: {
      backgroundColor: colors.buttonPrimary,
    },
    periodPillText: {
      // Kept literal (not typography.label): label is uppercase/letter-spaced,
      // which doesn't fit a compact pill; size/weight are a one-off here.
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    periodPillTextActive: {
      color: colors.buttonPrimaryText,
    },

    // ── Hero ───────────────────────────────────────────────
    heroSection: {
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
    },
    heroCaption: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      // Reserves the line's height so toggling the scrub label on/off
      // doesn't shift the chart below.
      minHeight: 18,
    },

    // ── Chart ──────────────────────────────────────────────
    // Background/radius now come from the Card component (radii.lg matches the old 16 exactly).
    chartCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.xl,
      paddingVertical: spacing.lg,
      overflow: "hidden",
    },

    // ── Stat strip ─────────────────────────────────────────
    statStrip: {
      marginTop: spacing.xl,
    },
    statStripContent: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    statStripCard: {
      width: 132, // fixed tile width for horizontal scroll, not on the spacing scale
    },
    statStripHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    statDot: {
      width: 8, // accent dot, not on the spacing scale
      height: 8,
      borderRadius: radii.full,
    },
    statStripLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    statStripValue: {
      // 16/700 tabular — one step bolder than typography.bodyBold (16/600);
      // written literal (not spread+override) since the rule reserves
      // spread+override for fontSize-preserving tweaks only.
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
      fontVariant: ["tabular-nums"],
      color: colors.text,
    },

    // ── Last entry ─────────────────────────────────────────
    lastEntryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xl,
      marginHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lastEntryText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      marginRight: spacing.sm,
    },
    lastEntryLabel: {
      color: colors.text,
      fontWeight: "600",
    },

    // ── Actions row (fixed footer) ───────────────────────────
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    scanButton: {
      flex: 1,
    },
  });
