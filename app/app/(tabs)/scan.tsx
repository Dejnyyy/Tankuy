import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import api, { ReceiptScanResult, Vehicle } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { useUnits } from "@/hooks/useUnits";
import { Card, Button } from "@/components/ui";
import { spacing, radii, typography } from "@/constants/Theme";

// Conditionally import Camera (not available on web)
let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== "web") {
  const Camera = require("expo-camera");
  CameraView = Camera.CameraView;
  useCameraPermissions = Camera.useCameraPermissions;
}

type ScanState = "camera" | "processing" | "review" | "form" | "manual";

type StationSuggestion = {
  id: string;
  name: string;
  address: string | null;
  lat?: number;
  lng?: number;
  distance?: number;
};

// Helper to safely format numbers
const formatNum = (val: any, decimals: number = 2): string => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toFixed(decimals);
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function ScanScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const {
    currencySymbol,
    volumeUnit,
    volumeUnitLabel,
    pricePerVolumeUnit,
    distanceUnit,
    toMetricVolume,
    toMetricDistance,
    toMetricPrice,
  } = useUnits();

  const [scanState, setScanState] = useState<ScanState>("camera");
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);

  // Location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Autocomplete state
  const [stationQuery, setStationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const debouncedQuery = useDebounce(stationQuery, 300);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    stationName: "",
    stationAddress: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    pricePerLiter: "",
    totalLiters: "",
    totalCost: "",
    mileage: "",
    notes: "",
  });

  // ... (permissions and effects) ...

  const handleSaveManualEntry = async () => {
    if (!manualForm.totalCost) {
      Alert.alert("Error", "Please enter at least the total cost.");
      return;
    }

    if (!manualForm.pricePerLiter) {
      Alert.alert("Error", "Please enter the price per liter.");
      return;
    }

    const entryData = {
      vehicleId: selectedVehicle,
      stationName: manualForm.stationName || null,
      stationAddress: manualForm.stationAddress || null,
      stationLat: null,
      stationLng: null,
      date: manualForm.date,
      time: manualForm.time || null,
      pricePerLiter: manualForm.pricePerLiter
        ? toMetricPrice(parseFloat(manualForm.pricePerLiter))
        : null,
      totalLiters: manualForm.totalLiters
        ? toMetricVolume(parseFloat(manualForm.totalLiters))
        : null,
      totalCost: parseFloat(manualForm.totalCost),
      mileage: manualForm.mileage
        ? toMetricDistance(parseInt(manualForm.mileage))
        : null,
      receiptImageUrl: null,
      notes: manualForm.notes || null,
    };

    try {
      setSaving(true);
      await api.addEntry(entryData);

      Alert.alert("Success", "Entry saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            resetScan();
            router.replace("/");
          },
        },
      ]);
    } catch (error: any) {
      console.error("Failed to save entry:", error);

      if (
        error.message &&
        (error.message.includes("409") || error.message.includes("Conflict"))
      ) {
        Alert.alert(
          "Duplicate Entry",
          "We found a similar entry with the same date and cost. Do you want to save it anyway?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save Anyway",
              onPress: async () => {
                try {
                  setSaving(true);
                  await api.addEntry(entryData, true);
                  Alert.alert("Success", "Entry saved successfully!", [
                    {
                      text: "OK",
                      onPress: () => {
                        resetScan();
                        router.replace("/");
                      },
                    },
                  ]);
                } catch (retryError) {
                  console.error("Retry save failed:", retryError);
                  Alert.alert(
                    "Error",
                    "Failed to save entry even with force option.",
                  );
                } finally {
                  setSaving(false);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", "Failed to save the entry. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const resetScan = () => {
    setScanState("camera");
    setScanResult(null);
    setStationQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setManualForm({
      stationName: "",
      stationAddress: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      pricePerLiter: "",
      totalLiters: "",
      totalCost: "",
      mileage: "",
      notes: "",
    });
  };

  // Camera permission (only on native)
  const [permission, requestPermission] =
    Platform.OS !== "web" && useCameraPermissions
      ? useCameraPermissions()
      : [{ granted: false }, () => {}];

  useEffect(() => {
    loadVehicles();
    getUserLocation();
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log("Could not get location:", error);
    }
  };

  const fetchSuggestions = async (query: string) => {
    try {
      setLoadingSuggestions(true);
      const result = await api.autocompleteStations(
        query,
        userLocation?.lat,
        userLocation?.lng,
      );
      setSuggestions(result.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: StationSuggestion) => {
    setStationQuery(suggestion.name);
    setManualForm((prev) => ({ ...prev, stationName: suggestion.name }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const loadVehicles = async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setScanState("processing");
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
      });

      if (photo?.base64) {
        const result = await api.scanReceipt(photo.base64, "image/jpeg");

        // Auto-populate manual form with extracted data
        const extracted = result.parsed || result;
        setScanResult(result); // Restore scanResult for Review screen
        setManualForm((prev) => ({
          ...prev,
          stationName: extracted.stationName || prev.stationName,
          date: extracted.date || prev.date,
          time: extracted.time || prev.time,
          pricePerLiter:
            (extracted.pricePerUnit || extracted.pricePerLiter)?.toString() ||
            "",
          totalLiters:
            (extracted.totalUnits || extracted.totalLiters)?.toString() || "",
          totalCost: extracted.totalCost?.toString() || "",
        }));

        // Go to review screen first
        setScanState("review");
      }
    } catch (error) {
      console.error("Failed to scan receipt:", error);
      Alert.alert("Error", "Failed to scan the receipt. Please try again.");
      setScanState("camera");
    }
  };

  const processWebFile = (file: File) => {
    setScanState("processing");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = (ev.target?.result as string).split("base64,")[1];
        const result = await api.scanReceipt(base64, file.type, undefined, file);
        const extracted = result.parsed || result;
        setScanResult(result);
        setManualForm((prev) => ({
          ...prev,
          stationName: extracted.stationName || prev.stationName,
          date: extracted.date || prev.date,
          time: extracted.time || prev.time,
          pricePerLiter:
            (extracted.pricePerUnit || extracted.pricePerLiter)?.toString() || "",
          totalLiters:
            (extracted.totalUnits || extracted.totalLiters)?.toString() || "",
          totalCost: extracted.totalCost?.toString() || "",
        }));
        setScanState("review");
      } catch (error) {
        console.error("Failed to scan:", error);
        Alert.alert("Error", "Failed to scan the image. Please try again.");
        setScanState("camera");
      }
    };
    reader.readAsDataURL(file);
  };

  const takePhotoWeb = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    (input as any).capture = "environment";
    input.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (file) processWebFile(file);
    };
    input.click();
  };

  const pickImageWeb = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (file) processWebFile(file);
    };
    input.click();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8, // Increased quality for better OCR
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setScanState("processing");
        const asset = result.assets[0];
        const webFile = (asset as any).file; // Web often provides native File object
        let base64Data = asset.base64 || "";

        // Sometimes web ImagePicker includes the data URI prefix in the base64 field
        if (base64Data && base64Data.includes("base64,")) {
          base64Data = base64Data.split("base64,")[1];
        }

        const scanData = await api.scanReceipt(
          base64Data,
          asset.mimeType || "image/jpeg",
          asset.uri,
          webFile,
        );

        // Auto-populate manual form with extracted data
        const extracted = scanData.parsed || scanData;
        setScanResult(scanData); // Restore scanResult for Review screen
        setManualForm((prev) => ({
          ...prev,
          stationName: extracted.stationName || prev.stationName,
          date: extracted.date || prev.date,
          time: extracted.time || prev.time,
          pricePerLiter:
            (extracted.pricePerUnit || extracted.pricePerLiter)?.toString() ||
            "",
          totalLiters:
            (extracted.totalUnits || extracted.totalLiters)?.toString() || "",
          totalCost: extracted.totalCost?.toString() || "",
        }));

        // Go to review screen first
        setScanState("review");
      }
    } catch (error) {
      console.error("Failed to scan image:", error);
      Alert.alert("Error", "Failed to scan the image. Please try again.");
      setScanState("camera");
    }
  };

  const handleConfirmScan = () => {
    setScanState("form");
  };

  const handleSaveEntry = async () => {
    if (!scanResult?.parsed) return;

    // We use manualForm because user might have edited the values inline
    if (!manualForm.totalCost) {
      Alert.alert("Error", "Please check the total cost.");
      setSaving(false);
      return;
    }

    const entryData = {
      vehicleId: selectedVehicle,
      stationName:
        manualForm.stationName || scanResult?.parsed.stationName || null,
      stationAddress: manualForm.stationAddress || null,
      stationLat: null,
      stationLng: null,
      date:
        manualForm.date ||
        scanResult?.parsed.date ||
        new Date().toISOString().split("T")[0],
      time: manualForm.time || scanResult?.parsed.time,
      pricePerLiter: manualForm.pricePerLiter
        ? toMetricPrice(parseFloat(manualForm.pricePerLiter))
        : null,
      totalLiters: manualForm.totalLiters
        ? toMetricVolume(parseFloat(manualForm.totalLiters))
        : null,
      totalCost: parseFloat(manualForm.totalCost),
      mileage: manualForm.mileage
        ? toMetricDistance(parseInt(manualForm.mileage))
        : null,
      receiptImageUrl: scanResult?.imageUrl || null,
      notes: manualForm.notes || null,
    };

    try {
      setSaving(true);
      await api.addEntry(entryData);

      Alert.alert("Success", "Entry saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            resetScan();
            router.replace("/");
          },
        },
      ]);
    } catch (error: any) {
      console.error("Failed to save entry:", error);

      if (
        error.message &&
        (error.message.includes("409") || error.message.includes("Conflict"))
      ) {
        Alert.alert(
          "Duplicate Entry",
          "We found a similar entry with the same date and cost. Do you want to save it anyway?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save Anyway",
              onPress: async () => {
                try {
                  setSaving(true);
                  await api.addEntry(entryData, true);
                  Alert.alert("Success", "Entry saved successfully!", [
                    {
                      text: "OK",
                      onPress: () => {
                        resetScan();
                        router.replace("/");
                      },
                    },
                  ]);
                } catch (retryError) {
                  console.error("Retry save failed:", retryError);
                } finally {
                  setSaving(false);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", "Failed to save entry: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Calculate price per liter or total cost automatically.
  // Rule: price/liter is always derived (never the anchor).
  // - Edit liters: if cost known → derive price; else if price known → calc cost
  // - Edit cost:   if liters known → derive price; else if price known → calc liters
  // - Edit price:  if liters known → calc cost; else if cost known → calc liters
  const updateManualForm = (field: string, value: string) => {
    const newForm = { ...manualForm, [field]: value };

    const liters = parseFloat(newForm.totalLiters);
    const cost = parseFloat(newForm.totalCost);
    const price = parseFloat(newForm.pricePerLiter);

    const hasLiters = !isNaN(liters) && liters > 0;
    const hasCost = !isNaN(cost) && cost > 0;
    const hasPrice = !isNaN(price) && price > 0;

    if (field === "totalLiters") {
      if (hasLiters) {
        if (hasCost) {
          newForm.pricePerLiter = String(cost / liters);
        } else if (hasPrice) {
          newForm.totalCost = String(liters * price);
        }
      }
    } else if (field === "totalCost") {
      if (hasCost) {
        if (hasLiters) {
          newForm.pricePerLiter = String(cost / liters);
        } else if (hasPrice) {
          newForm.totalLiters = String(cost / price);
        }
      }
    } else if (field === "pricePerLiter") {
      if (hasPrice) {
        if (hasLiters) {
          newForm.totalCost = String(liters * price);
        } else if (hasCost) {
          newForm.totalLiters = String(cost / price);
        }
      }
    }

    setManualForm(newForm);
  };

  // Processing state
  if (scanState === "processing") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={styles.processingText}>Scanning receipt...</Text>
          <Text style={styles.processingSubtext}>Extracting data with OCR</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Manual Entry Form
  if (scanState === "manual") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.reviewHeader}>
              <TouchableOpacity onPress={resetScan}>
                <FontAwesome name="arrow-left" size={20} color={colors.tint} />
              </TouchableOpacity>
              <Text style={styles.reviewTitle}>Manual Entry</Text>
              <View style={{ width: 20 }} />
            </View>

            {/* Station Brand with Autocomplete */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Station Brand</Text>
              <View style={styles.autocompleteContainer}>
                <View style={styles.inputContainer}>
                  <FontAwesome
                    name="building"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Shell, Benzina, OMV..."
                    placeholderTextColor={colors.textMuted}
                    value={stationQuery}
                    onChangeText={(v) => {
                      setStationQuery(v);
                      setManualForm((prev) => ({ ...prev, stationName: v }));
                    }}
                    onFocus={() =>
                      suggestions.length > 0 && setShowSuggestions(true)
                    }
                  />
                  {loadingSuggestions && (
                    <ActivityIndicator size="small" color={colors.tint} />
                  )}
                </View>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={item.id || index}
                        style={styles.suggestionItem}
                        onPress={() => selectSuggestion(item)}
                      >
                        <FontAwesome
                          name="tint"
                          size={16}
                          color={colors.tint}
                        />
                        <View style={styles.suggestionText}>
                          <Text style={styles.suggestionName}>{item.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Station Location */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                Location
                {userLocation && (
                  <Text style={styles.locationBadge}>
                    {" "}
                    📍 Using your location
                  </Text>
                )}
              </Text>
              <View style={styles.inputContainer}>
                <FontAwesome
                  name="map-marker"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Teplice, Severní terasa..."
                  placeholderTextColor={colors.textMuted}
                  value={manualForm.stationAddress || ""}
                  onChangeText={(v) =>
                    setManualForm((prev) => ({ ...prev, stationAddress: v }))
                  }
                />
              </View>
            </View>

            {/* Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Date</Text>
              <View style={styles.inputContainer}>
                <FontAwesome
                  name="calendar"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={manualForm.date}
                  onChangeText={(v) => updateManualForm("date", v)}
                />
              </View>
            </View>

            {/* Fuel Details */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Fuel Details</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <FontAwesome
                    name="tint"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={volumeUnitLabel}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={manualForm.totalLiters}
                    onChangeText={(v) => updateManualForm("totalLiters", v)}
                  />
                  <Text style={styles.inputUnit}>L</Text>
                </View>
              </View>

              <View style={[styles.inputContainer, { marginTop: 10 }]}>
                <FontAwesome
                  name="euro"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={`Price per ${volumeUnit}`}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={manualForm.pricePerLiter}
                  onChangeText={(v) => updateManualForm("pricePerLiter", v)}
                />
                <Text style={styles.inputUnit}>{pricePerVolumeUnit}</Text>
              </View>

              <View
                style={[
                  styles.inputContainer,
                  styles.highlightedInput,
                  { marginTop: 10 },
                ]}
              >
                <FontAwesome name="credit-card" size={18} color={colors.tint} />
                <TextInput
                  style={[
                    styles.textInput,
                    { color: colors.tint, fontWeight: "600" },
                  ]}
                  placeholder="Total cost *"
                  placeholderTextColor={colors.tint}
                  keyboardType="decimal-pad"
                  value={manualForm.totalCost}
                  onChangeText={(v) => updateManualForm("totalCost", v)}
                />
                <Text style={[styles.inputUnit, { color: colors.tint }]}>
                  {currencySymbol}
                </Text>
              </View>
            </View>

            {/* Vehicle Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.vehicleListHorizontal}>
                  {vehicles.length > 0 ? (
                    vehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.vehicleChip,
                          selectedVehicle === vehicle.id &&
                            styles.vehicleChipSelected,
                        ]}
                        onPress={() => setSelectedVehicle(vehicle.id)}
                      >
                        <FontAwesome
                          name="car"
                          size={14}
                          color={
                            selectedVehicle === vehicle.id
                              ? colors.white
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.vehicleChipText,
                            selectedVehicle === vehicle.id &&
                              styles.vehicleChipTextSelected,
                          ]}
                        >
                          {vehicle.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noVehiclesText}>No vehicles added</Text>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Mileage */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Mileage (Optional)</Text>
              <View style={styles.inputContainer}>
                <FontAwesome
                  name="tachometer"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Current odometer reading"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={manualForm.mileage}
                  onChangeText={(v) => updateManualForm("mileage", v)}
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>
            </View>

            <Button
              title="Save Entry"
              onPress={handleSaveManualEntry}
              loading={saving}
              disabled={!manualForm.totalCost || !manualForm.pricePerLiter}
              icon={<FontAwesome name="check" size={18} color={colors.white} />}
              style={styles.saveButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Review scanned result
  if (scanState === "review" && scanResult) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView style={styles.reviewContainer}>
          <View style={styles.reviewHeader}>
            <TouchableOpacity onPress={resetScan}>
              <FontAwesome name="arrow-left" size={20} color={colors.tint} />
            </TouchableOpacity>
            <Text style={styles.reviewTitle}>Scan Result</Text>
            <View style={{ width: 20 }} />
          </View>

          <Card style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Extracted Data</Text>

            <DataRow
              label="Station"
              value={scanResult.parsed.stationName || "Not detected"}
              icon="building"
              styles={styles}
              colors={colors}
            />
            <DataRow
              label="Date"
              value={manualForm.date}
              icon="calendar"
              editable
              onChangeText={(v: string) => updateManualForm("date", v)}
              styles={styles}
              colors={colors}
            />
            <DataRow
              label="Time"
              value={manualForm.time}
              icon="clock-o"
              editable
              onChangeText={(v: string) => updateManualForm("time", v)}
              styles={styles}
              colors={colors}
            />
            <DataRow
              label="Price/Liter"
              value={manualForm.pricePerLiter}
              icon="euro"
              editable
              onChangeText={(v: string) => updateManualForm("pricePerLiter", v)}
              placeholder="0.00"
              styles={styles}
              colors={colors}
            />
            <DataRow
              label="Total Liters"
              value={manualForm.totalLiters}
              icon="tint"
              editable
              onChangeText={(v: string) => updateManualForm("totalLiters", v)}
              placeholder="0.00"
              styles={styles}
              colors={colors}
            />
            <DataRow
              label="Total Cost"
              value={manualForm.totalCost}
              icon="credit-card"
              highlighted
              editable
              onChangeText={(v: string) => updateManualForm("totalCost", v)}
              placeholder="0"
              styles={styles}
              colors={colors}
            />
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              title="Rescan"
              onPress={resetScan}
              variant="secondary"
              icon={<FontAwesome name="refresh" size={18} color={colors.text} />}
              style={styles.secondaryButton}
            />
            <Button
              title="Confirm"
              onPress={handleConfirmScan}
              variant="primary"
              icon={<FontAwesome name="check" size={18} color={colors.white} />}
              style={styles.primaryButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Form after scan confirmation
  if (scanState === "form" && scanResult) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView style={styles.formContainer}>
            <View style={styles.reviewHeader}>
              <TouchableOpacity onPress={() => setScanState("review")}>
                <FontAwesome name="arrow-left" size={20} color={colors.tint} />
              </TouchableOpacity>
              <Text style={styles.reviewTitle}>Complete Entry</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Select Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.vehicleListHorizontal}>
                  {vehicles.length > 0 ? (
                    vehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.vehicleChip,
                          selectedVehicle === vehicle.id &&
                            styles.vehicleChipSelected,
                        ]}
                        onPress={() => setSelectedVehicle(vehicle.id)}
                      >
                        <FontAwesome
                          name="car"
                          size={14}
                          color={
                            selectedVehicle === vehicle.id
                              ? colors.white
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.vehicleChipText,
                            selectedVehicle === vehicle.id &&
                              styles.vehicleChipTextSelected,
                          ]}
                        >
                          {vehicle.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noVehiclesText}>No vehicles added</Text>
                  )}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Mileage (Optional)</Text>
              <View style={styles.inputContainer}>
                <FontAwesome
                  name="tachometer"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter current mileage"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={manualForm.mileage}
                  onChangeText={(v) => updateManualForm("mileage", v)}
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>
            </View>

            <Card padded={false} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Review & Edit Details</Text>

              <DataRow
                label="Date"
                value={manualForm.date}
                icon="calendar"
                editable
                onChangeText={(v: string) => updateManualForm("date", v)}
                styles={styles}
                colors={colors}
              />
              <DataRow
                label="Time"
                value={manualForm.time}
                icon="clock-o"
                editable
                onChangeText={(v: string) => updateManualForm("time", v)}
                styles={styles}
                colors={colors}
              />
              <DataRow
                label="Price/Liter"
                value={manualForm.pricePerLiter}
                icon="euro"
                editable
                onChangeText={(v: string) =>
                  updateManualForm("pricePerLiter", v)
                }
                placeholder="0.00"
                styles={styles}
                colors={colors}
              />
              <DataRow
                label="Total Liters"
                value={manualForm.totalLiters}
                icon="tint"
                editable
                onChangeText={(v: string) => updateManualForm("totalLiters", v)}
                placeholder="0.00"
                styles={styles}
                colors={colors}
              />
              <DataRow
                label="Total Cost"
                value={manualForm.totalCost}
                icon="credit-card"
                highlighted
                editable
                onChangeText={(v: string) => updateManualForm("totalCost", v)}
                placeholder="0"
                styles={styles}
                colors={colors}
              />
            </Card>

            <Button
              title="Save Entry"
              onPress={handleSaveEntry}
              loading={saving}
              icon={<FontAwesome name="check" size={18} color={colors.white} />}
              style={styles.saveButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // MAIN CAMERA VIEW (default)
  // Web fallback - show image picker option
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>Scan Receipt</Text>
          <Text style={styles.cameraSubtitle}>
            Take a photo or upload from gallery
          </Text>
        </View>

        <View style={styles.webContainer}>
          <View style={styles.webPlaceholder}>
            <FontAwesome name="camera" size={64} color={colors.tint} />
            <Text style={styles.webPlaceholderText}>
              Scan or upload a receipt
            </Text>
          </View>

          <Button
            title="Take Photo"
            onPress={takePhotoWeb}
            variant="primary"
            icon={<FontAwesome name="camera" size={22} color={colors.white} />}
            style={styles.uploadButton}
          />

          <Button
            title="Choose from Gallery"
            onPress={pickImageWeb}
            variant="ghost"
            icon={<FontAwesome name="image" size={22} color={colors.tint} />}
            style={[styles.uploadButton, styles.uploadButtonSecondary]}
          />
        </View>

        {/* Manual entry link */}
        <TouchableOpacity
          style={styles.manualEntryLink}
          onPress={() => setScanState("manual")}
        >
          <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
          <Text style={styles.manualEntryText}>Or enter details manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Native camera view
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContainer}>
          <FontAwesome name="camera" size={64} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your fuel receipts
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            variant="primary"
            style={styles.permissionButton}
          />

          <TouchableOpacity
            style={styles.manualEntryLink}
            onPress={() => setScanState("manual")}
          >
            <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
            <Text style={styles.manualEntryText}>
              Or enter details manually
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.cameraHeader}>
        <Text style={styles.cameraTitle}>Scan Receipt</Text>
        <Text style={styles.cameraSubtitle}>
          Position the receipt within the frame
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {CameraView && (
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        )}
        <View style={[styles.cameraOverlay, StyleSheet.absoluteFill]}>
          <View style={styles.frameLine} />
        </View>
      </View>

      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <FontAwesome name="image" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setScanState("manual")}
        >
          <FontAwesome name="pencil" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DataRow({
  label,
  value,
  icon,
  highlighted,
  editable,
  onChangeText,
  placeholder,
  styles,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  highlighted?: boolean;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  styles: any;
  colors: any;
}) {
  return (
    <View style={[styles.dataRow, highlighted && styles.dataRowHighlighted]}>
      <View style={styles.dataRowIcon}>
        <FontAwesome
          name={icon as any}
          size={16}
          color={highlighted ? colors.tint : colors.textSecondary}
        />
      </View>
      <Text style={styles.dataRowLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={[
            styles.textInput,
            { textAlign: "right", padding: 0 },
            highlighted && styles.dataRowValueHighlighted,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Not detected"}
          placeholderTextColor={colors.textMuted}
          keyboardType={
            label.includes("Date") || label.includes("Time")
              ? "default"
              : "numeric"
          }
        />
      ) : (
        <Text
          style={[
            styles.dataRowValue,
            highlighted && styles.dataRowValueHighlighted,
          ]}
        >
          {value || "Not detected"}
        </Text>
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xxxl, // 32, exact match
    },
    permissionTitle: {
      ...typography.heading, // 20/600, exact match
      color: colors.text,
      marginTop: spacing.xl, // 20, exact match
    },
    permissionText: {
      fontSize: 15, // tie between caption(13)/body(16), kept literal
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.sm, // 8, exact match
    },
    // Style override for the Button (variant="primary") — Button owns
    // background/text, this only restores the original padding rhythm.
    permissionButton: {
      paddingHorizontal: spacing.xxl, // 24, exact match
      paddingVertical: 14, // tie between md(12)/lg(16), kept literal
      marginTop: spacing.xxl, // 24, exact match
    },
    processingText: {
      fontSize: 18, // tie between body(16)/heading(20), kept literal
      fontWeight: "600",
      color: colors.text,
      marginTop: spacing.xl, // 20, exact match
    },
    processingSubtext: {
      fontSize: 14, // tie between caption(13)/body(16), kept literal
      color: colors.textSecondary,
      marginTop: spacing.sm, // 8, exact match
    },
    cameraHeader: {
      padding: spacing.xl, // 20, exact match
      alignItems: "center",
    },
    cameraTitle: {
      fontSize: 24, // tie, not on scale (title is 28), kept literal
      fontWeight: "700",
      color: colors.text,
    },
    cameraSubtitle: {
      fontSize: 14, // tie between caption(13)/body(16), kept literal
      color: colors.textSecondary,
      marginTop: spacing.xs, // 4, exact match
    },
    cameraContainer: {
      flex: 1,
      marginHorizontal: spacing.xl, // 20, exact match
      borderRadius: 20, // tie between lg(16)/full(999), kept literal
      overflow: "hidden",
    },
    camera: {
      flex: 1,
    },
    // Live-camera dimming overlay: fixed black tint for contrast over video,
    // same "camera chrome" precedent as the frame guide below.
    cameraOverlay: {
      flex: 1,
      backgroundColor: `${colors.black}4D`, // ~30% alpha
      justifyContent: "center",
      alignItems: "center",
    },
    frameLine: {
      width: "85%",
      height: "70%",
      borderWidth: 2,
      borderColor: colors.tint,
      borderRadius: radii.lg, // 16, exact match
      borderStyle: "dashed",
    },
    cameraControls: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 30, // tie, not on scale, kept literal
      paddingHorizontal: 40, // tie, not on scale, kept literal
    },
    // Camera-chrome controls (icon-only, no label) — kept as custom
    // TouchableOpacity, not adopted as Button (see report). Fixed circular
    // sizes, not spacing-scale values.
    galleryButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    captureButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.tint,
      justifyContent: "center",
      alignItems: "center",
    },
    // White ring for contrast against the camera preview — camera-chrome
    // exception per the fixed white/black-over-video precedent.
    captureButtonInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.tint,
      borderWidth: 3,
      borderColor: colors.white,
    },
    manualButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    // Plain text link (not a filled button) — Button's "ghost" variant
    // forces colors.tint foreground, which would recolor this from neutral
    // grey to orange; kept custom, per Task 8's nav-link precedent.
    manualEntryLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm, // 8, exact match
      paddingVertical: spacing.xl, // 20, exact match
    },
    manualEntryText: {
      fontSize: 14, // tie between caption(13)/body(16), kept literal
      color: colors.textSecondary,
    },
    webContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40, // tie, not on scale, kept literal
    },
    webPlaceholder: {
      alignItems: "center",
      marginBottom: spacing.xxxl, // 32, exact match
    },
    webPlaceholderText: {
      ...typography.body, // 16/400, exact match
      color: colors.textMuted,
      marginTop: spacing.lg, // 16, exact match
    },
    // Style override for the "Take Photo" Button (variant="primary") —
    // restores the original padding/radius/gap rhythm Button's defaults
    // don't reproduce exactly.
    uploadButton: {
      paddingHorizontal: spacing.xxxl, // 32, exact match
      paddingVertical: spacing.lg, // 16, exact match
      borderRadius: 14, // tie between md(12)/lg(16), kept literal
      gap: spacing.md, // 12, exact match
    },
    // Additional override for "Choose from Gallery" (variant="ghost" +
    // this backgroundColor) — reproduces the original card-bg/tint-text
    // look with zero color delta, same pattern as Task 9's externalNavButton.
    uploadButtonSecondary: {
      backgroundColor: colors.card,
      marginTop: spacing.md, // 12, exact match
    },
    reviewContainer: {
      flex: 1,
      padding: spacing.xl, // 20, exact match
      width: "100%",
      maxWidth: 600, // fixed layout width, not a spacing value
      alignSelf: "center",
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xxl, // 24, exact match
    },
    reviewTitle: {
      ...typography.heading, // 20/600, exact match
      color: colors.text,
    },
    // Card defaults (radii.lg=16, padding=spacing.lg=16) reproduce the
    // original exactly, so this style carries no overrides.
    resultCard: {},
    resultCardTitle: {
      ...typography.bodyBold, // 16/600, exact match
      color: colors.text,
      marginBottom: spacing.lg, // 16, exact match
    },
    dataRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md, // 12, exact match
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dataRowHighlighted: {
      backgroundColor: colors.primaryLight,
      marginHorizontal: -spacing.lg, // -16, exact match
      paddingHorizontal: spacing.lg, // 16, exact match
      borderRadius: 10, // tie between sm(8)/md(12), kept literal
      borderBottomWidth: 0,
      marginTop: spacing.sm, // 8, exact match
    },
    dataRowIcon: {
      width: 32, // fixed icon-container width, not a spacing value
    },
    dataRowLabel: {
      flex: 1,
      fontSize: 15, // tie between caption(13)/body(16), kept literal
      color: colors.textSecondary,
    },
    dataRowValue: {
      fontSize: 15, // tie, kept literal
      fontWeight: "500", // doesn't match a typography weight token
      color: colors.text,
    },
    dataRowValueHighlighted: {
      fontSize: 18, // tie, kept literal
      color: colors.tint,
      fontWeight: "700",
    },
    buttonContainer: {
      flexDirection: "row",
      gap: spacing.md, // 12, exact match
      marginTop: spacing.xxl, // 24, exact match
    },
    // Style override for the "Rescan" Button (variant="secondary", per
    // brief). Restores flex/padding/radius rhythm; foreground shifts from
    // the original colors.tint to secondary's colors.text (flagged in report).
    secondaryButton: {
      flex: 1,
      paddingVertical: spacing.lg, // 16, exact match
      borderRadius: 14, // tie between md(12)/lg(16), kept literal
    },
    // Style override for the "Confirm" Button (variant="primary") — exact
    // color match with the original (tint bg / white fg), only padding/
    // radius restored.
    primaryButton: {
      flex: 1,
      paddingVertical: spacing.lg, // 16, exact match
      borderRadius: 14, // tie between md(12)/lg(16), kept literal
    },
    formContainer: {
      flex: 1,
      padding: spacing.xl, // 20, exact match
      width: "100%",
      maxWidth: 600, // fixed layout width, not a spacing value
      alignSelf: "center",
    },
    formSection: {
      marginBottom: spacing.xxl, // 24, exact match
    },
    formSectionTitle: {
      ...typography.bodyBold, // 16/600, exact match
      color: colors.text,
      marginBottom: spacing.md, // 12, exact match
    },
    locationBadge: {
      fontSize: 12, // tie, not on scale, kept literal
      color: colors.success,
      fontWeight: "400",
    },
    autocompleteContainer: {
      position: "relative",
      zIndex: 100,
    },
    suggestionsContainer: {
      backgroundColor: colors.elevated,
      borderRadius: radii.md, // 12, exact match
      marginTop: spacing.sm, // 8, exact match
      overflow: "hidden",
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14, // tie between md(12)/lg(16), kept literal
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md, // 12, exact match
    },
    suggestionText: {
      flex: 1,
    },
    suggestionName: {
      fontSize: 15, // tie, kept literal
      fontWeight: "500",
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      gap: 10, // tie between sm(8)/md(12), kept literal
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radii.md, // 12, exact match
      paddingHorizontal: spacing.lg, // 16, exact match
      paddingVertical: 14, // tie between md(12)/lg(16), kept literal
      gap: spacing.md, // 12, exact match
    },
    highlightedInput: {
      borderWidth: 1,
      borderColor: `${colors.primary}4D`, // ~30% alpha
      backgroundColor: colors.primaryLight,
    },
    // Deliberately not spread from typography.body — this is a TextInput,
    // not Text; spreading the token's lineHeight risks altering its
    // vertical centering/height (Task 8 precedent).
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    inputUnit: {
      fontSize: 14, // tie, kept literal
      color: colors.textSecondary,
    },
    vehicleListHorizontal: {
      flexDirection: "row",
      gap: 10, // tie between sm(8)/md(12), kept literal
    },
    // Segmented pill, not converted to Button — icon+text combo at tight
    // padding risks clipping against Button's fixed 16px text (Task 8
    // precedent for segmented pills).
    vehicleChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 14, // tie between md(12)/lg(16), kept literal
      paddingVertical: 10, // tie between sm(8)/md(12), kept literal
      borderRadius: 10, // tie between sm(8)/md(12), kept literal
      gap: spacing.sm, // 8, exact match
    },
    vehicleChipSelected: {
      backgroundColor: colors.tint,
    },
    vehicleChipText: {
      fontSize: 14, // tie, kept literal
      color: colors.text,
      fontWeight: "500",
    },
    vehicleChipTextSelected: {
      color: colors.white,
    },
    noVehiclesText: {
      fontSize: 14, // tie, kept literal
      color: colors.textSecondary,
    },
    // Card (padded=false) + this style reproduces the original padding
    // (20, not Card's default spacing.lg=16) exactly.
    summaryCard: {
      padding: spacing.xl, // 20, exact match
      marginBottom: spacing.xxl, // 24, exact match
    },
    summaryTitle: {
      ...typography.bodyBold, // 16/600, exact match
      color: colors.text,
      marginBottom: spacing.lg, // 16, exact match
    },
    // Style override for the "Save Entry" Button (variant="primary") —
    // exact color match with the original (tint bg / white fg), only
    // padding/radius/gap/marginBottom restored.
    saveButton: {
      paddingVertical: 18, // tie between lg(16)/xl(20), kept literal
      borderRadius: 14, // tie between md(12)/lg(16), kept literal
      gap: 10, // tie between sm(8)/md(12), kept literal
      marginBottom: 40, // tie, not on scale, kept literal
    },
  });
