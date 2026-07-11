import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import api, { Vehicle } from "@/services/api";
import {
  getBrandSuggestions,
  getModelSuggestions,
  parseCarInput,
} from "@/data/carDatabase";
import { getEngineSuggestions } from "@/data/engineDatabase";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/i18n";
import {
  ScaleInView,
  FadeInView,
  AnimatedPressable,
  StaggeredChildren,
} from "@/components/AnimatedComponents";
import { useUnits } from "@/hooks/useUnits";
import { Card, SectionHeader, ScreenHeader, ListRow, Button } from "@/components/ui";
import { spacing, radii, typography } from "@/constants/Theme";

// Standard RN Switch track/thumb defaults — sanctioned hex exception, not tokens.
const SWITCH_TRACK_FALSE = "#767577";
const SWITCH_THUMB_FALSE = "#f4f3f4";

type FuelType = "petrol" | "diesel" | "lpg" | "electric" | "hybrid";

const FUEL_TYPES: { value: FuelType; label: string; icon: string }[] = [
  { value: "petrol", label: "Natural", icon: "tint" },
  { value: "diesel", label: "Diesel", icon: "tint" },
  { value: "lpg", label: "LPG", icon: "fire" },
  { value: "electric", label: "Electric", icon: "bolt" },
  { value: "hybrid", label: "Hybrid", icon: "leaf" },
];

export default function ProfileScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { user, signOut, isLoading: authLoading, updateUser } = useAuth();
  const { currencySymbol, distanceUnit, currency, unitSystem } = useUnits();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Custom Confirmation Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    confirmText: t("profile.modal.save"),
    cancelText: t("profile.modal.cancel"),
    isDestructive: false,
    onConfirm: () => {},
  });
  const [vehicleForm, setVehicleForm] = useState({
    name: "",
    licensePlate: "",
    fuelType: "petrol" as FuelType,
    brand: "",
    model: "",
    year: "",
    engine: "",
    enginePower: "",
  });

  // Autocomplete state
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [engineSuggestions, setEngineSuggestions] = useState<
    { name: string; power: string; fuel: string }[]
  >([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showEngineSuggestions, setShowEngineSuggestions] = useState(false);

  const [vehicleMileages, setVehicleMileages] = useState<
    Record<string, number | null>
  >({});

  const loadVehicles = useCallback(async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data);

      // Fetch latest mileage for each vehicle
      const mileageMap: Record<string, number | null> = {};
      await Promise.all(
        data.map(async (v: Vehicle) => {
          try {
            const entries = await api.getEntries({
              vehicleId: v.id,
              limit: 1,
              sortBy: "date",
              order: "DESC",
            });
            mileageMap[v.id] =
              entries.length > 0 && entries[0].mileage
                ? entries[0].mileage
                : null;
          } catch {
            mileageMap[v.id] = null;
          }
        }),
      );
      setVehicleMileages(mileageMap);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    setConfirmConfig({
      visible: true,
      title: t("profile.alerts.signOutTitle"),
      message: t("profile.alerts.signOutMessage"),
      confirmText: t("profile.signOut"),
      cancelText: t("profile.modal.cancel"),
      isDestructive: true,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, visible: false }));
        signOut();
      },
    });
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setConfirmConfig({
      visible: true,
      title: t("profile.alerts.deleteTitle"),
      message: t("profile.alerts.deleteMessage", { name: vehicle.name }),
      confirmText: t("profile.modal.save"), // using save keyword translation per existing schema, represents destructive OK
      cancelText: t("profile.modal.cancel"),
      isDestructive: true,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, visible: false }));
        try {
          await api.deleteVehicle(vehicle.id);
          setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
        } catch (error) {
          if (Platform.OS === "web") {
            window.alert(t("profile.alerts.deleteError"));
          } else {
            Alert.alert(
              t("profile.alerts.error"),
              t("profile.alerts.deleteError"),
            );
          }
        }
      },
    });
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setVehicleForm({
      name: "",
      licensePlate: "",
      fuelType: "petrol",
      brand: "",
      model: "",
      year: "",
      engine: "",
      enginePower: "",
    });
    setBrandSuggestions([]);
    setModelSuggestions([]);
    setEngineSuggestions([]);
    setShowBrandSuggestions(false);
    setShowModelSuggestions(false);
    setShowEngineSuggestions(false);
    setShowModal(true);
  };

  // Handle brand input with autocomplete
  const handleBrandChange = (text: string) => {
    setVehicleForm((prev) => ({ ...prev, brand: text }));

    // Try to parse smart input (e.g., "vw golf")
    const parsed = parseCarInput(text);
    if (parsed.brand && parsed.model) {
      setVehicleForm((prev) => ({
        ...prev,
        brand: parsed.brand!,
        model: parsed.model!,
        name: prev.name || `${parsed.brand} ${parsed.model}`,
      }));
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      return;
    }

    // Get brand suggestions
    const suggestions = getBrandSuggestions(text);
    setBrandSuggestions(suggestions);
    setShowBrandSuggestions(suggestions.length > 0);

    // If we matched a brand from abbreviation, update the field
    if (parsed.brand && !parsed.model) {
      setVehicleForm((prev) => ({ ...prev, brand: parsed.brand! }));
      // Load model suggestions for this brand
      const modelSugs = getModelSuggestions(parsed.brand, "");
      setModelSuggestions(modelSugs);
    }
  };

  const selectBrand = (brand: string) => {
    setVehicleForm((prev) => ({
      ...prev,
      brand,
      name: prev.name || brand,
    }));
    setBrandSuggestions([]);
    setShowBrandSuggestions(false);
    // Load models for this brand
    const modelSugs = getModelSuggestions(brand, "");
    setModelSuggestions(modelSugs);
    setShowModelSuggestions(true);
  };

  // Handle model input with autocomplete
  const handleModelChange = (text: string) => {
    setVehicleForm((prev) => ({ ...prev, model: text }));

    if (vehicleForm.brand) {
      const suggestions = getModelSuggestions(vehicleForm.brand, text);
      setModelSuggestions(suggestions);
      setShowModelSuggestions(suggestions.length > 0);
    }
  };

  const selectModel = (model: string) => {
    setVehicleForm((prev) => ({
      ...prev,
      model,
      name: prev.name || `${prev.brand} ${model}`,
    }));
    setModelSuggestions([]);
    setShowModelSuggestions(false);

    // Load engine suggestions for this brand+model
    if (vehicleForm.brand) {
      const engines = getEngineSuggestions(vehicleForm.brand, model);
      setEngineSuggestions(engines);
      setShowEngineSuggestions(engines.length > 0);
    }
  };

  const selectEngine = (engine: {
    name: string;
    power: string;
    fuel: string;
  }) => {
    // Map 'natural' from engine database to 'petrol' for fuelType value
    const fuelTypeValue = engine.fuel === "natural" ? "petrol" : engine.fuel;
    setVehicleForm((prev) => ({
      ...prev,
      engine: engine.name,
      enginePower: engine.power,
      fuelType: fuelTypeValue as FuelType,
    }));
    setEngineSuggestions([]);
    setShowEngineSuggestions(false);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate || "",
      fuelType: vehicle.fuelType,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      engine: vehicle.engine || "",
      enginePower: vehicle.enginePower || "",
    });
    setShowModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.name.trim()) {
      Alert.alert(t("profile.alerts.error"), t("profile.alerts.nameError"));
      return;
    }

    try {
      setSaving(true);

      const vehicleData = {
        name: vehicleForm.name.trim(),
        licensePlate: vehicleForm.licensePlate.trim() || null,
        fuelType: vehicleForm.fuelType,
        brand: vehicleForm.brand.trim() || null,
        model: vehicleForm.model.trim() || null,
        year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
        engine: vehicleForm.engine.trim() || null,
        enginePower: vehicleForm.enginePower.trim() || null,
      };

      if (editingVehicle) {
        const updated = await api.updateVehicle(editingVehicle.id, vehicleData);
        setVehicles((prev) =>
          prev.map((v) => (v.id === editingVehicle.id ? updated : v)),
        );
      } else {
        const newVehicle = await api.addVehicle(vehicleData);
        setVehicles((prev) => [...prev, newVehicle]);
      }

      setShowModal(false);
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      Alert.alert(t("profile.alerts.error"), t("profile.alerts.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <ScreenHeader title={t("profile.title")} />

        {/* User Card */}
        <ScaleInView delay={100}>
          <Card padded={false} style={styles.userCard}>
            <View style={styles.avatarContainer}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome name="user" size={32} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </Card>
        </ScaleInView>

        {/* Vehicles Section */}
        <View style={styles.section}>
          {/* Not SectionHeader: the "+" icon has no slot in actionLabel (text-only) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.myVehicles")}</Text>
            <Button
              title={t("profile.add")}
              onPress={openAddModal}
              variant="ghost"
              icon={<FontAwesome name="plus" size={14} color={colors.primary} />}
              style={styles.addButton}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : vehicles.length > 0 ? (
            <View style={styles.vehicleList}>
              <StaggeredChildren stagger={80} baseDelay={200}>
                {vehicles.map((vehicle) => (
                  <AnimatedPressable
                    key={vehicle.id}
                    style={styles.vehicleCard}
                    onPress={() => openEditModal(vehicle)}
                    scaleValue={0.97}
                  >
                    <View style={styles.vehicleIconContainer}>
                      <FontAwesome name="car" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>{vehicle.name}</Text>
                      <Text style={styles.vehicleMeta}>
                        {[vehicle.brand, vehicle.model, vehicle.year]
                          .filter(Boolean)
                          .join(" • ") || vehicle.fuelType}
                      </Text>
                      {vehicleMileages[vehicle.id] != null && (
                        <View style={styles.vehicleMileageRow}>
                          <FontAwesome
                            name="tachometer"
                            size={12}
                            color={colors.textMuted}
                          />
                          <Text style={styles.vehicleMileageText}>
                            {Number(
                              vehicleMileages[vehicle.id],
                            ).toLocaleString()}{" "}
                            {distanceUnit}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.vehicleAction}
                      onPress={() => handleDeleteVehicle(vehicle)}
                    >
                      <FontAwesome name="trash-o" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </AnimatedPressable>
                ))}
              </StaggeredChildren>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyVehicles}
              onPress={openAddModal}
            >
              <FontAwesome name="car" size={32} color={colors.elevated} />
              <Text style={styles.emptyText}>{t("profile.noVehicles")}</Text>
              <Text style={styles.emptySubtext}>
                {t("profile.addFirstVehicle")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <SectionHeader title={t("profile.settings.title")} />

          <Card padded={false} style={styles.settingsGroup}>
            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name={isDark ? "moon-o" : "sun-o"}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.settings.darkMode")}
                rightElement={
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: SWITCH_TRACK_FALSE, true: colors.tint }}
                    // @ts-expect-error react-native-web specific props
                    activeThumbColor={colors.tint}
                    activeTrackColor={colors.tint + "80"}
                    thumbColor={isDark ? colors.tint : SWITCH_THUMB_FALSE}
                  />
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name="language"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.settings.language")}
                rightElement={
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      onPress={() => changeLanguage("cs")}
                      style={[
                        styles.pill,
                        i18n.language === "cs" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color:
                              i18n.language === "cs" ? colors.white : colors.textSecondary,
                          },
                        ]}
                      >
                        CS
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => changeLanguage("en")}
                      style={[
                        styles.pill,
                        i18n.language === "en" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color:
                              i18n.language === "en" ? colors.white : colors.textSecondary,
                          },
                        ]}
                      >
                        EN
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome name="bell" size={16} color={colors.textSecondary} />
                  </View>
                }
                title={t("profile.settings.notifications")}
                value="On"
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name="money"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.settings.currency")}
                rightElement={
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      onPress={() => updateUser({ currency: "CZK" })}
                      style={[
                        styles.pill,
                        currency === "CZK" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: currency === "CZK" ? colors.white : colors.textSecondary },
                        ]}
                      >
                        CZK
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateUser({ currency: "USD" })}
                      style={[
                        styles.pill,
                        currency === "USD" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: currency === "USD" ? colors.white : colors.textSecondary },
                        ]}
                      >
                        USD
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name="tachometer"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.settings.unitSystem")}
                rightElement={
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      onPress={() => updateUser({ unitSystem: "metric" })}
                      style={[
                        styles.pill,
                        unitSystem === "metric" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color:
                              unitSystem === "metric" ? colors.white : colors.textSecondary,
                          },
                        ]}
                      >
                        Metric
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateUser({ unitSystem: "imperial" })}
                      style={[
                        styles.pill,
                        unitSystem === "imperial" && { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color:
                              unitSystem === "imperial" ? colors.white : colors.textSecondary,
                          },
                        ]}
                      >
                        Imperial
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </View>
          </Card>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <SectionHeader title={t("profile.about.title")} />

          <Card padded={false} style={styles.settingsGroup}>
            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name="info-circle"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.about.version")}
                value="1.0.3"
              />
            </View>
            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome
                      name="file-text-o"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                }
                title={t("profile.about.terms")}
                onPress={() => router.push("/(legal)/terms")}
              />
            </View>
            <View style={styles.settingsRowBorder}>
              <ListRow
                icon={
                  <View style={styles.settingsIconContainer}>
                    <FontAwesome name="lock" size={16} color={colors.textSecondary} />
                  </View>
                }
                title={t("profile.about.privacy")}
                onPress={() => router.push("/(legal)/privacy")}
              />
            </View>
          </Card>
        </View>

        {/* Sign Out */}
        <Button
          title={t("profile.signOut")}
          onPress={handleSignOut}
          disabled={authLoading}
          loading={authLoading}
          variant="destructive"
          icon={<FontAwesome name="sign-out" size={18} color={colors.white} />}
          style={styles.signOutButton}
        />

        <View style={styles.footer} />
      </ScrollView>

      {/* Add/Edit Vehicle Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancel}>
                  {t("profile.modal.cancel")}
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingVehicle
                  ? t("profile.modal.editVehicle")
                  : t("profile.modal.addVehicle")}
              </Text>
              <TouchableOpacity onPress={handleSaveVehicle} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text style={styles.modalSave}>
                    {t("profile.modal.save")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Vehicle Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  {t("profile.modal.vehicleName")}
                </Text>
                <View style={styles.inputContainer}>
                  <FontAwesome
                    name="car"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t("profile.modal.namePlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={vehicleForm.name}
                    onChangeText={(v) =>
                      setVehicleForm((prev) => ({ ...prev, name: v }))
                    }
                  />
                </View>
              </View>

              {/* Fuel Type */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  {t("profile.modal.fuelType")}
                </Text>
                <View style={styles.fuelTypeGrid}>
                  {FUEL_TYPES.map((fuel) => (
                    <TouchableOpacity
                      key={fuel.value}
                      style={[
                        styles.fuelTypeOption,
                        vehicleForm.fuelType === fuel.value &&
                          styles.fuelTypeOptionSelected,
                      ]}
                      onPress={() =>
                        setVehicleForm((prev) => ({
                          ...prev,
                          fuelType: fuel.value,
                        }))
                      }
                    >
                      <FontAwesome
                        name={fuel.icon as any}
                        size={16}
                        color={
                          vehicleForm.fuelType === fuel.value
                            ? colors.white
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.fuelTypeText,
                          vehicleForm.fuelType === fuel.value &&
                            styles.fuelTypeTextSelected,
                        ]}
                      >
                        {fuel.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Brand */}
              <View style={[styles.formSection, { zIndex: 20 }]}>
                <Text style={styles.formLabel}>{t("profile.modal.brand")}</Text>
                <View style={styles.autocompleteContainer}>
                  <View style={styles.inputContainer}>
                    <FontAwesome
                      name="industry"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t("profile.modal.brandPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      value={vehicleForm.brand}
                      onChangeText={handleBrandChange}
                      onFocus={() => {
                        if (brandSuggestions.length > 0)
                          setShowBrandSuggestions(true);
                      }}
                    />
                  </View>

                  {/* Brand Suggestions */}
                  {showBrandSuggestions && brandSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {brandSuggestions.map((brand, index) => (
                        <TouchableOpacity
                          key={brand}
                          style={[
                            styles.suggestionItem,
                            index === brandSuggestions.length - 1 && {
                              borderBottomWidth: 0,
                            },
                          ]}
                          onPress={() => selectBrand(brand)}
                        >
                          <FontAwesome
                            name="car"
                            size={14}
                            color={colors.tint}
                          />
                          <Text style={styles.suggestionText}>{brand}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Model */}
              <View style={[styles.formSection, { zIndex: 10 }]}>
                <Text style={styles.formLabel}>{t("profile.modal.model")}</Text>
                <View style={styles.autocompleteContainer}>
                  <View style={styles.inputContainer}>
                    <FontAwesome
                      name="tag"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        vehicleForm.brand
                          ? t("profile.modal.modelPlaceholderBrand", {
                              brand: vehicleForm.brand,
                            })
                          : t("profile.modal.modelPlaceholderNoBrand")
                      }
                      placeholderTextColor={colors.textMuted}
                      value={vehicleForm.model}
                      onChangeText={handleModelChange}
                      onFocus={() => {
                        if (vehicleForm.brand) {
                          const sugs = getModelSuggestions(
                            vehicleForm.brand,
                            vehicleForm.model,
                          );
                          setModelSuggestions(sugs);
                          setShowModelSuggestions(sugs.length > 0);
                        }
                      }}
                    />
                  </View>

                  {/* Model Suggestions */}
                  {showModelSuggestions && modelSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled
                      >
                        {modelSuggestions.map((model, index) => (
                          <TouchableOpacity
                            key={model}
                            style={[
                              styles.suggestionItem,
                              index === modelSuggestions.length - 1 && {
                                borderBottomWidth: 0,
                              },
                            ]}
                            onPress={() => selectModel(model)}
                          >
                            <FontAwesome
                              name="tag"
                              size={14}
                              color={colors.tint}
                            />
                            <Text style={styles.suggestionText}>{model}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Engine */}
              <View style={[styles.formSection, { zIndex: 5 }]}>
                <Text style={styles.formLabel}>
                  {t("profile.modal.engine")}
                </Text>
                <View style={styles.autocompleteContainer}>
                  <View style={styles.inputContainer}>
                    <FontAwesome
                      name="cog"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        vehicleForm.model
                          ? t("profile.modal.enginePlaceholderModel")
                          : t("profile.modal.enginePlaceholderNoModel")
                      }
                      placeholderTextColor={colors.textMuted}
                      value={
                        vehicleForm.engine
                          ? `${vehicleForm.engine} (${vehicleForm.enginePower})`
                          : ""
                      }
                      onFocus={() => {
                        if (vehicleForm.brand && vehicleForm.model) {
                          const engines = getEngineSuggestions(
                            vehicleForm.brand,
                            vehicleForm.model,
                          );
                          setEngineSuggestions(engines);
                          setShowEngineSuggestions(engines.length > 0);
                        }
                      }}
                      editable={false}
                    />
                  </View>

                  {/* Engine Suggestions */}
                  {showEngineSuggestions && engineSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled
                      >
                        {engineSuggestions.map((engine, index) => (
                          <TouchableOpacity
                            key={`${engine.name}-${engine.power}`}
                            style={[
                              styles.suggestionItem,
                              index === engineSuggestions.length - 1 && {
                                borderBottomWidth: 0,
                              },
                            ]}
                            onPress={() => selectEngine(engine)}
                          >
                            <FontAwesome
                              name="cog"
                              size={14}
                              color={colors.tint}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.suggestionText}>
                                {engine.name}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.textSecondary,
                                }}
                              >
                                {engine.power} •{" "}
                                {engine.fuel === "natural"
                                  ? "Natural"
                                  : engine.fuel.charAt(0).toUpperCase() +
                                    engine.fuel.slice(1)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Year */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t("profile.modal.year")}</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome
                    name="calendar"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="2020"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={4}
                    value={vehicleForm.year}
                    onChangeText={(v) =>
                      setVehicleForm((prev) => ({ ...prev, year: v }))
                    }
                  />
                </View>
              </View>

              {/* License Plate */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  {t("profile.modal.licensePlate")}
                </Text>
                <View style={styles.inputContainer}>
                  <FontAwesome
                    name="id-card"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="ABC 1234"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    value={vehicleForm.licensePlate}
                    onChangeText={(v) =>
                      setVehicleForm((prev) => ({ ...prev, licensePlate: v }))
                    }
                  />
                </View>
              </View>

              <View style={{ height: 50 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmConfig.visible}
        onRequestClose={() =>
          setConfirmConfig((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmHeader}>
              <View
                style={[
                  styles.confirmIconBg,
                  confirmConfig.isDestructive &&
                    styles.confirmIconBgDestructive,
                ]}
              >
                <FontAwesome
                  name={
                    confirmConfig.isDestructive
                      ? "exclamation-triangle"
                      : "info"
                  }
                  size={24}
                  color={
                    confirmConfig.isDestructive ? colors.error : colors.tint
                  }
                />
              </View>
            </View>
            <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
            <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>

            <View style={styles.confirmActions}>
              <Button
                title={confirmConfig.cancelText}
                onPress={() =>
                  setConfirmConfig((prev) => ({ ...prev, visible: false }))
                }
                variant="secondary"
                style={styles.confirmCancelBtn}
              />

              <Button
                title={confirmConfig.confirmText}
                onPress={confirmConfig.onConfirm}
                variant={confirmConfig.isDestructive ? "destructive" : "primary"}
                style={styles.confirmActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      maxWidth: 800,
      width: "100%",
      alignSelf: "center",
      paddingBottom: 40,
    },
    userCard: {
      alignItems: "center",
      paddingVertical: spacing.xxl,
      marginHorizontal: spacing.xl,
      borderRadius: 20, // tie, not on radii scale (between lg=16 and full=999)
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: colors.tint,
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.elevated,
      justifyContent: "center",
      alignItems: "center",
    },
    userName: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.text,
    },
    userEmail: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    section: {
      marginTop: 28, // tie, not on spacing scale (between xxl=24 and xxxl=32)
      paddingHorizontal: spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 18, // no exact typography match (heading is 20/600)
      fontWeight: "600",
      color: colors.text,
    },
    addButton: {
      // Overrides Button's default padding/gap to match the original inline add-action look
      paddingVertical: 0,
      paddingHorizontal: 0,
      gap: 6, // tie, not on spacing scale
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: "center",
    },
    vehicleList: {
      gap: 10, // tie, not on spacing scale
    },
    vehicleCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14, // tie, not on radii scale
      padding: 14, // tie, not on spacing scale
    },
    vehicleIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
    },
    vehicleInfo: {
      flex: 1,
      marginLeft: 14, // tie, not on spacing scale
    },
    vehicleName: {
      ...typography.bodyBold,
      color: colors.text,
    },
    vehicleMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    vehicleMileageRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      marginTop: 3,
    },
    vehicleMileageText: {
      fontSize: 12, // no exact typography match
      color: colors.textMuted,
      fontWeight: "500" as const,
    },
    vehicleAction: {
      padding: spacing.sm,
    },
    emptyVehicles: {
      backgroundColor: colors.card,
      borderRadius: 14, // tie, not on radii scale
      padding: spacing.xxxl,
      alignItems: "center",
    },
    emptyText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    emptySubtext: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    // Card supplies backgroundColor (colors.card); SectionHeader above supplies the
    // top gap, so no marginTop here (avoids doubling the spacing).
    settingsGroup: {
      paddingHorizontal: spacing.lg,
      borderRadius: 14, // tie, not on radii scale
      overflow: "hidden",
    },
    // Border wrapper around each ListRow — ListRow itself has no divider slot.
    settingsRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsIconContainer: {
      width: 32,
    },
    pillGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    pill: {
      paddingHorizontal: 10, // tie, not on spacing scale
      paddingVertical: 4, // tie, not on spacing scale
      borderRadius: radii.md,
      backgroundColor: "transparent",
    },
    pillText: {
      // no exact typography match; avoid spreading a token and overriding fontSize
      fontSize: 13,
      fontWeight: "600",
    },
    // Overrides Button's default padding/radius/gap to match the original pill look;
    // backgroundColor comes from the destructive variant.
    signOutButton: {
      marginHorizontal: spacing.xl,
      marginTop: 32, // tie, not on spacing scale
      paddingVertical: spacing.lg,
      paddingHorizontal: 0,
      borderRadius: 14, // tie, not on radii scale
      gap: 10, // tie, not on spacing scale
    },
    footer: {
      height: 100,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCancel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    modalTitle: {
      fontSize: 17, // no exact typography match (bodyBold is 16/600)
      fontWeight: "600",
      color: colors.text,
    },
    modalSave: {
      ...typography.bodyBold,
      color: colors.tint,
    },
    modalContent: {
      flex: 1,
      padding: spacing.xl,
    },
    formSection: {
      marginBottom: spacing.xxl,
    },
    formLabel: {
      fontSize: 14, // no exact typography match
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 10, // tie, not on spacing scale
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14, // tie, not on spacing scale
      gap: spacing.md,
    },
    textInput: {
      // Not spread from typography.body: this is a TextInput, and the token's
      // lineHeight can alter native input sizing/vertical centering.
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    fuelTypeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10, // tie, not on spacing scale
    },
    fuelTypeOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 14, // tie, not on spacing scale
      paddingVertical: spacing.md,
      borderRadius: 10, // tie, not on radii scale
      gap: spacing.sm,
    },
    fuelTypeOptionSelected: {
      backgroundColor: colors.tint,
    },
    fuelTypeText: {
      fontSize: 14, // no exact typography match
      color: colors.text,
      fontWeight: "500",
    },
    fuelTypeTextSelected: {
      color: colors.white, // Always white when selected
    },
    autocompleteContainer: {
      position: "relative",
    },
    suggestionsContainer: {
      backgroundColor: colors.elevated,
      borderRadius: radii.md,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14, // tie, not on spacing scale
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      fontSize: 15, // no exact typography match
      color: colors.text,
      fontWeight: "500",
    },
    // Custom Confirmation Modal Styles
    confirmOverlay: {
      flex: 1,
      backgroundColor: `${colors.black}80`, // ~50% alpha
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    confirmBox: {
      backgroundColor: colors.card,
      borderRadius: 24, // tie, not on radii scale
      padding: spacing.xxl,
      width: "100%",
      maxWidth: 380,
      alignItems: "center",
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 20,
    },
    confirmHeader: {
      marginBottom: spacing.lg,
    },
    confirmIconBg: {
      width: 60,
      height: 60,
      borderRadius: 30, // fixed circle (size / 2), not on radii scale
      backgroundColor: `${colors.primary}1A`, // ~10% alpha
      justifyContent: "center",
      alignItems: "center",
    },
    confirmIconBgDestructive: {
      backgroundColor: `${colors.error}1A`, // ~10% alpha
    },
    confirmTitle: {
      fontSize: 20, // no exact typography match (weight 700 vs heading's 600)
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: "center",
    },
    confirmMessage: {
      fontSize: 15, // no exact typography match
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.xxl,
      paddingHorizontal: spacing.sm,
      lineHeight: 22,
    },
    confirmActions: {
      flexDirection: "row",
      gap: spacing.md,
      width: "100%",
    },
    // Overrides Button's default padding/radius/background to match the original pill;
    // secondary variant's default bg (colors.elevated) differs from inputBackground here.
    confirmCancelBtn: {
      flex: 1,
      paddingVertical: 14, // tie, not on spacing scale
      borderRadius: 14, // tie, not on radii scale
      backgroundColor: colors.inputBackground,
    },
    // Overrides Button's default padding/radius; background comes from the variant
    // (primary/destructive), which already matches the original colors exactly.
    confirmActionBtn: {
      flex: 1,
      paddingVertical: 14, // tie, not on spacing scale
      borderRadius: 14, // tie, not on radii scale
    },
  });
