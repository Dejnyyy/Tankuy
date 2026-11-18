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
import { FadeInView, AnimatedPressable } from "@/components/AnimatedComponents";
import { useUnits } from "@/hooks/useUnits";
import { ListRow, Button, Segmented, Section } from "@/components/ui";
import { useData } from "@/context/DataContext";
import {
  isPushSupported,
  isIosBrowser,
  isStandalone,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/services/push";
import { spacing, radii, typography } from "@/constants/Theme";


type FuelType = "petrol" | "diesel" | "lpg" | "electric" | "hybrid";

const FUEL_TYPES: { value: FuelType; label: string; icon: string }[] = [
  { value: "petrol", label: "Natural", icon: "tint" },
  { value: "diesel", label: "Diesel", icon: "tint" },
  { value: "lpg", label: "LPG", icon: "fire" },
  { value: "electric", label: "Electric", icon: "bolt" },
  { value: "hybrid", label: "Hybrid", icon: "leaf" },
];

export default function ProfileScreen() {
  const { colors, isDark, preference, setPreference } = useTheme();
  const { reloadVehicles } = useData();
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

  // Web push notifications state
  const pushSupported = isPushSupported();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;
    getPushSubscription().then((sub) => setPushEnabled(Boolean(sub)));
  }, [pushSupported]);

  const togglePush = async (value: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (value) {
        await subscribeToPush();
        setPushEnabled(true);
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
      }
    } catch (err) {
      console.error("Push toggle failed:", err);
      setPushEnabled(false);
    } finally {
      setPushBusy(false);
    }
  };

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
          reloadVehicles();
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
      reloadVehicles();

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
            tintColor={colors.text}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.title")}</Text>
        </View>

        <FadeInView>
          <View style={styles.userCard}>
            {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} /> : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || "User"}</Text>
              {user?.email ? <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text> : null}
            </View>
          </View>
        </FadeInView>

        {/* Vehicles Section */}
        <View style={styles.section}>
          <Section
            title={t("profile.myVehicles")}
            right={<Button title={t("profile.add")} onPress={openAddModal} variant="secondary" size="sm" />}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            ) : vehicles.length > 0 ? (
              <View>
                {vehicles.map((vehicle, i) => (
                  <AnimatedPressable
                    key={vehicle.id}
                    style={[styles.vehicleCard, i > 0 && styles.rowDivider]}
                    onPress={() => openEditModal(vehicle)}
                    scaleValue={1}
                  >
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>{vehicle.name}</Text>
                      <Text style={styles.vehicleMeta}>
                        {[vehicle.brand, vehicle.model, vehicle.year, vehicle.licensePlate]
                          .filter(Boolean)
                          .join(" ") || vehicle.fuelType}
                      </Text>
                    </View>
                    {vehicleMileages[vehicle.id] != null && (
                      <Text style={styles.vehicleMileageText}>
                        {Number(vehicleMileages[vehicle.id]).toLocaleString("cs-CZ")} {distanceUnit}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.vehicleAction}
                      onPress={() => handleDeleteVehicle(vehicle)}
                      accessibilityLabel={t("common.delete")}
                    >
                      <FontAwesome name="trash-o" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </AnimatedPressable>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={styles.emptyVehicles} onPress={openAddModal}>
                <Text style={styles.emptyText}>{t("profile.noVehicles")}</Text>
                <Text style={styles.emptySubtext}>{t("profile.addFirstVehicle")}</Text>
              </TouchableOpacity>
            )}
          </Section>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Section title={t("profile.settings.title")}>
          <View style={styles.settingsGroup}>
            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.settings.appearance")}
                rightElement={
                  <Segmented
                    size="sm"
                    style={{ width: 210 }}
                    value={preference}
                    onChange={setPreference}
                    options={[
                      { value: "system", label: t("profile.settings.themeSystem") },
                      { value: "light", label: t("profile.settings.themeLight") },
                      { value: "dark", label: t("profile.settings.themeDark") },
                    ]}
                  />
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.settings.language")}
                rightElement={
                  <Segmented
                    size="sm"
                    style={{ width: 150 }}
                    value={i18n.language?.startsWith("en") ? "en" : "cs"}
                    onChange={(v) => changeLanguage(v)}
                    options={[
                      { value: "cs", label: "CZ" },
                      { value: "en", label: "EN" },
                    ]}
                  />
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.settings.notifications")}
                // rightElement (not value): keeps the original secondary value color;
                // ListRow's value slot hardcodes colors.text
                rightElement={
                  pushSupported ? (
                    <Switch
                      value={pushEnabled}
                      disabled={pushBusy}
                      onValueChange={togglePush}
                      trackColor={{ false: colors.border, true: colors.text }}
                      // @ts-expect-error react-native-web specific props
                      activeThumbColor={colors.background}
                      activeTrackColor={colors.text}
                      thumbColor={pushEnabled ? colors.background : colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.settingsValue}>
                      {Platform.OS === "web" && isIosBrowser() && !isStandalone()
                        ? t("profile.settings.notificationsIosHint")
                        : "On"}
                    </Text>
                  )
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.settings.currency")}
                rightElement={
                  <Segmented
                    size="sm"
                    style={{ width: 150 }}
                    value={currency}
                    onChange={(v) => updateUser({ currency: v })}
                    options={[
                      { value: "CZK", label: "CZK" },
                      { value: "USD", label: "USD" },
                    ]}
                  />
                }
              />
            </View>

            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.settings.unitSystem")}
                rightElement={
                  <Segmented
                    size="sm"
                    style={{ width: 150 }}
                    value={unitSystem}
                    onChange={(v) => updateUser({ unitSystem: v })}
                    options={[
                      { value: "metric", label: "km · L" },
                      { value: "imperial", label: "mi · gal" },
                    ]}
                  />
                }
              />
            </View>
          </View>
          </Section>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Section title={t("profile.about.title")}>
          <View style={styles.settingsGroup}>
            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.about.version")}
                // rightElement (not value): keeps the original secondary value color;
                // ListRow's value slot hardcodes colors.text
                rightElement={<Text style={styles.settingsValue}>2.0.0</Text>}
              />
            </View>
            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.about.terms")}
                onPress={() => router.push("/(legal)/terms")}
              />
            </View>
            <View style={styles.settingsRowBorder}>
              <ListRow
                title={t("profile.about.privacy")}
                onPress={() => router.push("/(legal)/privacy")}
              />
            </View>
          </View>
          </Section>
        </View>

        {/* Sign Out */}
        <Button
          title={t("profile.signOut")}
          onPress={handleSignOut}
          disabled={authLoading}
          loading={authLoading}
          variant="destructive"
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
                            ? colors.buttonPrimaryText
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
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
      paddingBottom: 40,
      paddingHorizontal: spacing.lg,
    },
    header: {
      paddingTop: Platform.OS === "web" ? spacing.xxl : spacing.lg,
      paddingBottom: spacing.xxl,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
    },
    avatarContainer: {},
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {},
    userName: {
      ...typography.heading,
      fontSize: 24,
      lineHeight: 28,
      color: colors.text,
    },
    userEmail: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.huge,
    },
    sectionHeader: {},
    sectionTitle: {
      ...typography.heading,
      color: colors.text,
    },
    addButton: {},
    loadingContainer: {
      padding: spacing.xl,
      alignItems: "flex-start",
    },
    vehicleList: {},
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    vehicleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    vehicleIconContainer: {},
    vehicleInfo: {
      flex: 1,
      minWidth: 0,
    },
    vehicleName: {
      ...typography.bodyBold,
      color: colors.text,
    },
    vehicleMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    vehicleMileageRow: {},
    vehicleMileageText: {
      ...typography.statSm,
      color: colors.text,
    },
    vehicleAction: {
      padding: spacing.sm,
    },
    emptyVehicles: {
      paddingVertical: spacing.lg,
    },
    emptyText: {
      ...typography.bodyBold,
      color: colors.text,
    },
    emptySubtext: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    settingsGroup: {},
    // Hairline under each settings row.
    settingsRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsIconContainer: {},
    settingsValue: {
      ...typography.body,
      color: colors.textSecondary,
    },
    pillGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    pill: {},
    pillText: {},
    signOutButton: {
      marginTop: spacing.huge,
      alignSelf: "flex-start",
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
      ...typography.bodyBold,
      color: colors.text,
    },
    modalSave: {
      ...typography.bodyBold,
      color: colors.text,
      textDecorationLine: "underline",
    },
    modalContent: {
      flex: 1,
      padding: spacing.xl,
    },
    formSection: {
      marginBottom: spacing.xxl,
    },
    formLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 48,
      gap: spacing.md,
    },
    textInput: {
      // Not spread from typography.body: this is a TextInput, and the token's
      // lineHeight can alter native input sizing/vertical centering.
      flex: 1,
      fontSize: 16,
      fontFamily: typography.body.fontFamily,
      color: colors.text,
      height: "100%",
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    fuelTypeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10, // tie, not on spacing scale
    },
    fuelTypeOption: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 36,
      borderRadius: radii.md,
      gap: spacing.sm,
    },
    fuelTypeOptionSelected: {
      backgroundColor: colors.buttonPrimary,
      borderColor: colors.buttonPrimary,
    },
    fuelTypeText: {
      ...typography.captionBold,
      color: colors.text,
    },
    fuelTypeTextSelected: {
      color: colors.buttonPrimaryText,
    },
    autocompleteContainer: {
      position: "relative",
    },
    suggestionsContainer: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
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
      ...typography.body,
      color: colors.text,
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
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      width: "100%",
      maxWidth: 380,
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
      ...typography.heading,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    confirmMessage: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xxl,
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
    },
    // Overrides Button's default padding/radius; background comes from the variant
    // (primary/destructive), which already matches the original colors exactly.
    confirmActionBtn: {
      flex: 1,
    },
  });
