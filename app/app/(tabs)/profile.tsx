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
  const { user, signOut, isLoading: authLoading } = useAuth();
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
            tintColor="#FF9500"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.title")}</Text>
        </View>

        {/* User Card */}
        <ScaleInView delay={100}>
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome name="user" size={32} color="#8E8E93" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </View>
        </ScaleInView>

        {/* Vehicles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.myVehicles")}</Text>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <FontAwesome name="plus" size={14} color="#FF9500" />
              <Text style={styles.addButtonText}>{t("profile.add")}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF9500" />
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
                      <FontAwesome name="car" size={20} color="#FF9500" />
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
                            km
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.vehicleAction}
                      onPress={() => handleDeleteVehicle(vehicle)}
                    >
                      <FontAwesome name="trash-o" size={18} color="#FF453A" />
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
              <FontAwesome name="car" size={32} color="#3A3A3C" />
              <Text style={styles.emptyText}>{t("profile.noVehicles")}</Text>
              <Text style={styles.emptySubtext}>
                {t("profile.addFirstVehicle")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.settings.title")}</Text>

          <View style={styles.settingsGroup}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsIconContainer}>
                  <FontAwesome
                    name={isDark ? "moon-o" : "sun-o"}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={styles.settingsLabel}>
                  {t("profile.settings.darkMode")}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: colors.tint }}
                // @ts-expect-error react-native-web specific props
                activeThumbColor={colors.tint}
                // @ts-expect-error react-native-web specific props
                activeTrackColor={colors.tint + "80"}
                thumbColor={isDark ? colors.tint : "#f4f3f4"}
              />
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsIconContainer}>
                  <FontAwesome
                    name="language"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={styles.settingsLabel}>
                  {t("profile.settings.language")}
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <TouchableOpacity
                  onPress={() => changeLanguage("cs")}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor:
                      i18n.language === "cs" ? colors.tint : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        i18n.language === "cs" ? "#FFF" : colors.textSecondary,
                    }}
                  >
                    CS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeLanguage("en")}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor:
                      i18n.language === "en" ? colors.tint : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        i18n.language === "en" ? "#FFF" : colors.textSecondary,
                    }}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <SettingsItem
              icon="bell"
              label={t("profile.settings.notifications")}
              value="On"
              styles={styles}
              colors={colors}
            />
            <SettingsItem
              icon="money"
              label={t("profile.settings.currency")}
              value="CZK"
              styles={styles}
              colors={colors}
            />
            <SettingsItem
              icon="tachometer"
              label={t("profile.settings.unitSystem")}
              value="Metric"
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.about.title")}</Text>

          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="info-circle"
              label={t("profile.about.version")}
              value="1.0.2"
              styles={styles}
              colors={colors}
            />
            <SettingsItem
              icon="file-text-o"
              label={t("profile.about.terms")}
              showArrow
              styles={styles}
              colors={colors}
              onPress={() => router.push("/(legal)/terms")}
            />
            <SettingsItem
              icon="lock"
              label={t("profile.about.privacy")}
              showArrow
              styles={styles}
              colors={colors}
              onPress={() => router.push("/(legal)/privacy")}
            />
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <FontAwesome name="sign-out" size={18} color={colors.error} />
              <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
            </>
          )}
        </TouchableOpacity>

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
                            ? "#FFFFFF"
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
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() =>
                  setConfirmConfig((prev) => ({ ...prev, visible: false }))
                }
              >
                <Text style={styles.confirmCancelText}>
                  {confirmConfig.cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  confirmConfig.isDestructive &&
                    styles.confirmActionBtnDestructive,
                ]}
                onPress={confirmConfig.onConfirm}
              >
                <Text style={styles.confirmActionText}>
                  {confirmConfig.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon,
  label,
  value,
  showArrow,
  styles,
  colors,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  showArrow?: boolean;
  styles: any;
  colors: any;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIconContainer}>
          <FontAwesome
            name={icon as any}
            size={16}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        {showArrow && (
          <FontAwesome
            name="chevron-right"
            size={12}
            color={colors.textMuted}
          />
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
    scrollContent: {
      maxWidth: 800,
      width: "100%",
      alignSelf: "center",
      paddingBottom: 40,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    userCard: {
      alignItems: "center",
      paddingVertical: 24,
      marginHorizontal: 20,
      backgroundColor: colors.card,
      borderRadius: 20,
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
      marginTop: 28,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.tint,
    },
    loadingContainer: {
      padding: 20,
      alignItems: "center",
    },
    vehicleList: {
      gap: 10,
    },
    vehicleCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
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
      marginLeft: 14,
    },
    vehicleName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    vehicleMeta: {
      fontSize: 13,
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
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500" as const,
    },
    vehicleAction: {
      padding: 8,
    },
    emptyVehicles: {
      backgroundColor: colors.card,
      borderRadius: 14,
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
    },
    settingsGroup: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginTop: 12,
      overflow: "hidden",
    },
    settingsItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsItemLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingsIconContainer: {
      width: 32,
    },
    settingsLabel: {
      fontSize: 16,
      color: colors.text,
    },
    settingsItemRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    settingsValue: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    signOutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 20,
      marginTop: 32,
      backgroundColor: "rgba(255, 69, 58, 0.15)", // Keep red tint for destructive act
      paddingVertical: 16,
      borderRadius: 14,
      gap: 10,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.error,
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCancel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    modalSave: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.tint,
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    formSection: {
      marginBottom: 24,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 10,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    fuelTypeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    fuelTypeOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    fuelTypeOptionSelected: {
      backgroundColor: colors.tint,
    },
    fuelTypeText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    fuelTypeTextSelected: {
      color: "#FFFFFF", // Always white when selected
    },
    autocompleteContainer: {
      position: "relative",
    },
    suggestionsContainer: {
      backgroundColor: colors.elevated,
      borderRadius: 12,
      marginTop: 8,
      overflow: "hidden",
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
    },
    // Custom Confirmation Modal Styles
    confirmOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    confirmBox: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      width: "100%",
      maxWidth: 380,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 20,
    },
    confirmHeader: {
      marginBottom: 16,
    },
    confirmIconBg: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "rgba(255, 149, 0, 0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
    confirmIconBgDestructive: {
      backgroundColor: "rgba(255, 69, 58, 0.1)",
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    confirmMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      paddingHorizontal: 8,
      lineHeight: 22,
    },
    confirmActions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    confirmCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.inputBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    confirmActionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.tint,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmActionBtnDestructive: {
      backgroundColor: colors.error,
    },
    confirmActionText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
