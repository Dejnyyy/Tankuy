import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import api, { FuelEntry, Vehicle } from "@/services/api";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { AnimatedPressable } from "@/components/AnimatedComponents";
import { useUnits } from "@/hooks/useUnits";
import { spacing, radii, typography } from "@/constants/Theme";
import { ScreenHeader, SectionHeader, EmptyState, Button, Card } from "@/components/ui";

// Helper to safely format numbers
const formatCurrency = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toFixed(0);
};

const formatDecimal = (val: any, decimals: number = 2) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toFixed(decimals);
};

export default function HistoryScreen() {
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const {
    currencySymbol,
    volumeUnit,
    distanceUnit,
    volumeUnitLabel,
    pricePerVolumeUnit,
    formatVolume,
    formatDistance,
    formatPricePerVolume,
    convertCurrency,
  } = useUnits();

  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Sort State
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Detail Modal State
  const [selectedEntry, setSelectedEntry] = useState<FuelEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize filter from params
  useEffect(() => {
    if (params.date) {
      setFilterDate(params.date as string);
    }
  }, [params.date]);

  const loadData = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
        }

        const [entriesData, vehiclesData] = await Promise.all([
          api.getEntries({
            vehicleId: selectedVehicle || undefined,
            startDate: filterDate || undefined,
            endDate: filterDate || undefined,
            limit: 20,
            offset: reset ? 0 : entries.length,
            sortBy,
            order: sortOrder,
          }),
          vehicles.length === 0 ? api.getVehicles() : Promise.resolve(vehicles),
        ]);

        if (reset) {
          setEntries(entriesData);
        } else {
          setEntries((prev) => [...prev, ...entriesData]);
        }

        setHasMore(entriesData.length === 20);

        if (vehicles.length === 0) {
          setVehicles(vehiclesData);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedVehicle, entries.length, vehicles, sortBy, sortOrder, filterDate],
  );

  useEffect(() => {
    loadData(true);
  }, [selectedVehicle, sortBy, sortOrder, filterDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadData(false);
    }
  };

  const clearDateFilter = () => {
    setFilterDate(null);
    router.setParams({ date: "" });
  };

  const openEntryDetails = (entry: FuelEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const handleDeleteEntry = useCallback(() => {
    if (!selectedEntry) return;

    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this fuel entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setModalVisible(false);
            setLoading(true);
            try {
              await api.deleteEntry(selectedEntry.id);
              await loadData(true);
            } catch (err) {
              console.error("Failed to delete:", err);
              Alert.alert("Error", "Failed to delete entry");
              setLoading(false);
            } finally {
              setSelectedEntry(null);
            }
          },
        },
      ],
    );
  }, [selectedEntry, loadData]);

  const renderEntry = ({ item }: { item: FuelEntry }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString("cs-CZ", {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

    const displayStation =
      item.stationName || item.stationAddress || "Unknown Station";
    const subtext = [
      formattedDate,
      item.vehicleName,
      item.stationName && item.stationAddress ? item.stationAddress : null,
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <AnimatedPressable
        style={styles.entryCard}
        scaleValue={0.97}
        onPress={() => openEntryDetails(item)}
      >
        <View style={styles.entryLeft}>
          <View style={styles.entryIconContainer}>
            <FontAwesome name="tint" size={18} color={colors.tint} />
          </View>
        </View>

        <View style={styles.entryCenter}>
          <Text style={styles.entryStation} numberOfLines={1}>
            {displayStation}
          </Text>
          <Text style={styles.entryMeta} numberOfLines={1}>
            {subtext}
          </Text>
          {item.totalLiters && (
            <Text style={styles.entryDetails}>
              {formatDecimal(formatVolume(item.totalLiters), 1)}
              {volumeUnit} @{" "}
              {formatDecimal(formatPricePerVolume(item.pricePerLiter), 2)}{" "}
              {pricePerVolumeUnit}
            </Text>
          )}
          {item.mileage && (
            <View style={styles.entryMileageRow}>
              <FontAwesome
                name="tachometer"
                size={11}
                color={colors.textMuted}
              />
              <Text style={styles.entryMileage}>
                {Number(formatDistance(item.mileage)).toLocaleString()}{" "}
                {distanceUnit}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.entryRight}>
          <Text style={styles.entryAmount}>
            {formatCurrency(convertCurrency(item.totalCost))} {currencySymbol}
          </Text>
          {item.receiptImageUrl && (
            <View style={styles.receiptBadge}>
              <FontAwesome
                name="image"
                size={10}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.webContainer}>
        {/* Header */}
        <ScreenHeader
          title="History"
          rightElement={
            <Button
              title="Sort"
              onPress={() => setSortModalVisible(true)}
              variant="ghost"
              icon={<FontAwesome name="sort" size={16} color={colors.tint} />}
              style={styles.sortButton}
            />
          }
        />

        {/* Vehicle Filter */}
        <View style={styles.filterContainer}>
          <ScrollableFilter
            options={[
              { id: null, label: "All Vehicles" },
              ...vehicles.map((v) => ({ id: v.id, label: v.name })),
            ]}
            selected={selectedVehicle}
            onSelect={setSelectedVehicle}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Date Filter Banner */}
        {filterDate && (
          <View style={styles.dateFilterContainer}>
            <Text style={styles.dateFilterText}>
              Showing entries for{" "}
              {new Date(filterDate).toLocaleDateString("cs-CZ")}
            </Text>
            <TouchableOpacity
              onPress={clearDateFilter}
              style={styles.clearFilterButton}
            >
              <FontAwesome name="times-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Entries List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntry}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={
                  <FontAwesome name="history" size={48} color={colors.textMuted} />
                }
                title={t("history.empty.title")}
                message={t("history.empty.message")}
                ctaLabel={t("history.empty.cta")}
                onCta={() => router.push("/(tabs)/scan")}
              />
            }
          />
        )}
      </View>

      {/* Entry Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entry Details</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <FontAwesome
                  name="times"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {selectedEntry && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.amountHeader}>
                  <Text style={styles.bigAmount}>
                    {formatCurrency(convertCurrency(selectedEntry.totalCost))}{" "}
                    {currencySymbol}
                  </Text>
                  <Text style={styles.volumeText}>
                    {formatDecimal(formatVolume(selectedEntry.totalLiters), 2)}{" "}
                    {volumeUnitLabel}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <DetailRow
                    icon="building"
                    label="Station"
                    value={selectedEntry.stationName || "Unknown Station"}
                    styles={styles}
                    colors={colors}
                  />
                  {selectedEntry.stationAddress && (
                    <DetailRow
                      icon="map-marker"
                      label="Address"
                      value={selectedEntry.stationAddress}
                      styles={styles}
                      colors={colors}
                    />
                  )}
                  <DetailRow
                    icon="calendar"
                    label="Date"
                    value={new Date(selectedEntry.date).toLocaleDateString()}
                    styles={styles}
                    colors={colors}
                  />
                  {selectedEntry.time && (
                    <DetailRow
                      icon="clock-o"
                      label="Time"
                      value={selectedEntry.time}
                      styles={styles}
                      colors={colors}
                    />
                  )}
                  {selectedEntry.vehicleName && (
                    <DetailRow
                      icon="car"
                      label="Vehicle"
                      value={selectedEntry.vehicleName}
                      styles={styles}
                      colors={colors}
                    />
                  )}
                  {selectedEntry.mileage && (
                    <DetailRow
                      icon="tachometer"
                      label="Mileage"
                      value={`${Number(formatDistance(selectedEntry.mileage)).toLocaleString()} ${distanceUnit}`}
                      styles={styles}
                      colors={colors}
                    />
                  )}
                  <DetailRow
                    icon="money"
                    label={`Price per ${volumeUnitLabel.slice(0, -1)}`}
                    value={`${formatDecimal(formatPricePerVolume(selectedEntry.pricePerLiter), 2)} ${currencySymbol}`}
                    styles={styles}
                    colors={colors}
                  />
                  {selectedEntry.notes && (
                    <View style={styles.noteContainer}>
                      <Text style={styles.noteLabel}>Notes</Text>
                      <Text style={styles.noteText}>{selectedEntry.notes}</Text>
                    </View>
                  )}
                </View>

                {selectedEntry.receiptImageUrl && (
                  <View style={styles.receiptSection}>
                    <SectionHeader title="Receipt Image" />
                    <Image
                      source={{ uri: selectedEntry.receiptImageUrl }}
                      style={styles.receiptImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={{ height: 40 }} />

                <Button
                  title="Delete Entry"
                  onPress={handleDeleteEntry}
                  variant="destructive"
                  icon={<FontAwesome name="trash" size={18} color={colors.white} />}
                  style={styles.deleteButton}
                />

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={sortModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <Card style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort By</Text>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "date" &&
                  sortOrder === "DESC" &&
                  styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("date");
                setSortOrder("DESC");
                setSortModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "date" &&
                    sortOrder === "DESC" &&
                    styles.activeSortText,
                ]}
              >
                Newest Date
              </Text>
              {sortBy === "date" && sortOrder === "DESC" && (
                <FontAwesome name="check" size={14} color={colors.tint} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "date" &&
                  sortOrder === "ASC" &&
                  styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("date");
                setSortOrder("ASC");
                setSortModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "date" &&
                    sortOrder === "ASC" &&
                    styles.activeSortText,
                ]}
              >
                Oldest Date
              </Text>
              {sortBy === "date" && sortOrder === "ASC" && (
                <FontAwesome name="check" size={14} color={colors.tint} />
              )}
            </TouchableOpacity>

            <View style={styles.sortDivider} />

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "price" &&
                  sortOrder === "DESC" &&
                  styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("price");
                setSortOrder("DESC");
                setSortModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "price" &&
                    sortOrder === "DESC" &&
                    styles.activeSortText,
                ]}
              >
                Highest Price
              </Text>
              {sortBy === "price" && sortOrder === "DESC" && (
                <FontAwesome name="check" size={14} color={colors.tint} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "price" &&
                  sortOrder === "ASC" &&
                  styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("price");
                setSortOrder("ASC");
                setSortModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "price" &&
                    sortOrder === "ASC" &&
                    styles.activeSortText,
                ]}
              >
                Lowest Price
              </Text>
              {sortBy === "price" && sortOrder === "ASC" && (
                <FontAwesome name="check" size={14} color={colors.tint} />
              )}
            </TouchableOpacity>
          </Card>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  styles,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <FontAwesome name={icon} size={20} color={colors.tint} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ScrollableFilter({
  options,
  selected,
  onSelect,
  styles,
  colors,
}: {
  options: { id: string | null; label: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  styles: any;
  colors: any;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(item) => item.id || "all"}
      contentContainerStyle={styles.filterList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterChip,
            selected === item.id && styles.filterChipActive,
          ]}
          onPress={() => onSelect(item.id)}
        >
          <Text
            style={[
              styles.filterChipText,
              selected === item.id && styles.filterChipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    webContainer: {
      flex: 1,
      maxWidth: 800,
      width: "100%",
      alignSelf: "center",
    },
    // Overrides ScreenHeader's rightElement Button back to the original
    // compact pill look (bg colors.card, tint text/icon via variant="ghost").
    sortButton: {
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md, // 12
      paddingVertical: spacing.sm, // 8
      borderRadius: radii.sm, // 8
    },
    filterContainer: {
      marginBottom: spacing.sm, // 8
    },
    filterList: {
      paddingHorizontal: spacing.xl, // 20
      gap: spacing.sm, // 8
    },
    filterChip: {
      backgroundColor: colors.card,
      paddingHorizontal: spacing.lg, // 16
      paddingVertical: 10, // tie between sm(8)/md(12), kept literal
      borderRadius: 20, // pill shape, not on radii scale (nearest lg=16 would visibly shrink it)
      marginRight: spacing.sm, // 8
    },
    filterChipActive: {
      backgroundColor: colors.tint,
    },
    filterChipText: {
      fontSize: 14, // no exact token (caption=13); weight 500 isn't a token family either
      fontWeight: "500",
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      padding: spacing.xl, // 20
      paddingBottom: 100, // custom scroll clearance, not a spacing-rhythm value
    },
    entryCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 14, // tie between md(12)/lg(16), kept literal
      padding: 14, // tie between md(12)/lg(16), kept literal
      marginBottom: 10, // tie between sm(8)/md(12), kept literal
    },
    entryLeft: {},
    entryIconContainer: {
      width: 44, // fixed icon-circle size, not a spacing-rhythm value
      height: 44,
      borderRadius: radii.md, // 12
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
    },
    entryCenter: {
      flex: 1,
      marginLeft: 14, // tie between md(12)/lg(16), kept literal
      justifyContent: "center",
    },
    entryStation: {
      ...typography.bodyBold, // exact match: 16/600
      color: colors.text,
    },
    entryMeta: {
      ...typography.caption, // exact match: 13/400
      color: colors.textSecondary,
      marginTop: 3,
    },
    // fontSize 12 is 1px off typography.caption's 13 — kept as a plain
    // literal (no token spread) per the lineHeight rule: spreading a token
    // and then overriding fontSize leaves a lineHeight sized for the
    // token's own fontSize on a different-sized font.
    entryDetails: {
      fontSize: 12,
      fontWeight: "400",
      color: colors.textMuted,
      marginTop: 3,
    },
    entryMileageRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs, // 4
      marginTop: 3,
    },
    // fontSize 11 matches typography.label's size, but label adds
    // uppercase + letterSpacing which would alter the mileage text's
    // appearance — kept as a plain literal instead.
    entryMileage: {
      fontSize: 11,
      color: colors.textMuted,
    },
    entryRight: {
      alignItems: "flex-end",
      justifyContent: "center",
    },
    // fontSize 17 is 1px off typography.bodyBold's 16 — literal per the
    // lineHeight rule (see entryDetails comment above).
    entryAmount: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    receiptBadge: {
      marginTop: 6, // tie between xs(4)/sm(8), kept literal
      backgroundColor: colors.elevated,
      padding: spacing.xs, // 4
      borderRadius: 4, // small badge corner, not on radii scale
    },
    footerLoader: {
      paddingVertical: spacing.xl, // 20
      alignItems: "center",
    },
    // Modal Styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.card,
      maxWidth: 600, // screen-specific constraint, not a spacing value
      width: "100%" as any,
      alignSelf: "center" as const,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.xl, // 20
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    // weight 700 doesn't match typography.heading's 600 — kept literal.
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    closeButton: {
      padding: 5, // tie between xs(4)/sm(8), kept literal
    },
    modalContent: {
      flex: 1,
    },
    amountHeader: {
      alignItems: "center",
      paddingVertical: 30, // screen-specific hero spacing, not on scale
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    // Hero display size, far off the type scale — kept literal.
    bigAmount: {
      fontSize: 42,
      fontWeight: "700",
      color: colors.tint,
    },
    volumeText: {
      ...typography.body, // exact match: 16/400
      color: colors.textSecondary,
      marginTop: 5,
    },
    detailSection: {
      padding: spacing.xl, // 20
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xl, // 20
    },
    detailIcon: {
      width: 40, // fixed icon-column width, not a spacing-rhythm value
      alignItems: "center",
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      ...typography.caption, // exact match: 13/400
      color: colors.textSecondary,
    },
    detailValue: {
      ...typography.body, // exact match: 16/400
      color: colors.text,
      marginTop: 2,
    },
    noteContainer: {
      marginTop: 10, // tie between sm(8)/md(12), kept literal
      backgroundColor: colors.elevated,
      padding: 15, // tie between md(12)/lg(16), kept literal
      borderRadius: 10, // tie between sm(8)/md(12), kept literal
    },
    noteLabel: {
      ...typography.caption, // exact match: 13/400
      color: colors.textSecondary,
      marginBottom: 5,
    },
    // fontSize 15 is 1px off typography.body's 16 — literal per the
    // lineHeight rule (see entryDetails comment above).
    noteText: {
      fontSize: 15,
      color: colors.text,
    },
    receiptSection: {
      padding: spacing.xl, // 20
      paddingTop: 0,
    },
    receiptImage: {
      width: "100%",
      height: 300, // media dimension, not a spacing value
      borderRadius: 10, // tie between sm(8)/md(12), kept literal
      backgroundColor: colors.black,
    },
    // Only supplies the spacing Button's default padding/radius don't
    // cover; background/padding/radius/layout now come from the
    // destructive-variant Button itself.
    deleteButton: {
      marginHorizontal: spacing.xl, // 20
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: `${colors.black}80`, // ~50% alpha, matches rgba(0,0,0,0.5)
      justifyContent: "center",
      alignItems: "center",
    },
    // Card supplies backgroundColor: colors.card and borderRadius: radii.lg
    // (16, exact match to the original). Only the deltas are listed here.
    sortModalContent: {
      width: "80%",
      padding: spacing.xl, // 20, overrides Card's default lg(16) padding
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    // fontSize 18 sits between heading(20)/body(16); weight 700 doesn't
    // match heading's 600 either — kept literal.
    sortModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.lg, // 16
      textAlign: "center",
    },
    sortOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14, // tie between md(12)/lg(16), kept literal
      paddingHorizontal: spacing.md, // 12
      borderRadius: 10, // tie between sm(8)/md(12), kept literal
    },
    activeSortOption: {
      backgroundColor: colors.primaryLight,
    },
    sortOptionText: {
      ...typography.body, // exact match: 16/400
      color: colors.text,
    },
    activeSortText: {
      color: colors.tint,
      fontWeight: "600",
    },
    sortDivider: {
      height: 1, // hairline
      backgroundColor: colors.border,
      marginVertical: spacing.sm, // 8
    },
    dateFilterContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: spacing.xl, // 20
      marginTop: spacing.md, // 12
      backgroundColor: colors.primaryLight,
      padding: spacing.md, // 12
      borderRadius: radii.sm, // 8
      borderWidth: 1,
      borderColor: `${colors.primary}4D`, // ~30% alpha, matches rgba(255,149,0,0.3)
    },
    // fontSize 14 is 2px off typography.bodyBold's 16 — literal per the
    // lineHeight rule (see entryDetails comment above).
    dateFilterText: {
      color: colors.tint,
      fontSize: 14,
      fontWeight: "600",
    },
    clearFilterButton: {
      padding: spacing.xs, // 4
    },
  });
