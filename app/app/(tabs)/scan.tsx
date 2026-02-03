import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import api, { ReceiptScanResult, Vehicle } from '@/services/api';

// Conditionally import Camera (not available on web)
let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== 'web') {
  const Camera = require('expo-camera');
  CameraView = Camera.CameraView;
  useCameraPermissions = Camera.useCameraPermissions;
}

type ScanState = 'camera' | 'processing' | 'review' | 'form' | 'manual';

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
  return isNaN(num) ? '0' : num.toFixed(decimals);
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
  const [scanState, setScanState] = useState<ScanState>('camera');
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);
  
  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Autocomplete state
  const [stationQuery, setStationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const debouncedQuery = useDebounce(stationQuery, 300);
  
  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    stationName: '',
    stationAddress: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    pricePerLiter: '',
    totalLiters: '',
    totalCost: '',
    mileage: '',
    notes: '',
  });

  // ... (permissions and effects) ...

  const handleSaveManualEntry = async () => {
    if (!manualForm.totalCost) {
      Alert.alert('Error', 'Please enter at least the total cost.');
      return;
    }

    if (!manualForm.pricePerLiter) {
      Alert.alert('Error', 'Please enter the price per liter.');
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
      pricePerLiter: manualForm.pricePerLiter ? parseFloat(manualForm.pricePerLiter) : null,
      totalLiters: manualForm.totalLiters ? parseFloat(manualForm.totalLiters) : null,
      totalCost: parseFloat(manualForm.totalCost),
      mileage: manualForm.mileage ? parseInt(manualForm.mileage) : null,
      receiptImageUrl: null,
      notes: manualForm.notes || null,
    };

    try {
      setSaving(true);
      await api.addEntry(entryData);

      Alert.alert('Success', 'Entry saved successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            resetScan();
            router.replace('/(tabs)/');
          }
        }
      ]);
    } catch (error: any) {
      console.error('Failed to save entry:', error);
      
      if (error.message && (error.message.includes('409') || error.message.includes('Conflict'))) {
        Alert.alert(
          'Duplicate Entry', 
          'We found a similar entry with the same date and cost. Do you want to save it anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Save Anyway', 
              onPress: async () => {
                try {
                  setSaving(true);
                  await api.addEntry(entryData, true);
                  Alert.alert('Success', 'Entry saved successfully!', [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        resetScan();
                        router.replace('/(tabs)/');
                      }
                    }
                  ]);
                } catch (retryError) {
                  console.error('Retry save failed:', retryError);
                  Alert.alert('Error', 'Failed to save entry even with force option.');
                } finally {
                  setSaving(false);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save the entry. Please try again.');
      }
    } finally {
      // Only set saving false if NOT showing alert (alert handles its own flow roughly, but actually alert is async UI, so we stop spinning)
      // Actually we should stop spinning to show alert
      setSaving(false);
    }
  };

  const resetScan = () => {
    setScanState('camera');
    setScanResult(null);
    setStationQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setManualForm({
      stationName: '',
      stationAddress: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      pricePerLiter: '',
      totalLiters: '',
      totalCost: '',
      mileage: '',
      notes: '',
    });
  };

  // Camera permission (only on native)
  const [permission, requestPermission] = Platform.OS !== 'web' && useCameraPermissions 
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
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Could not get location:', error);
    }
  };

  const fetchSuggestions = async (query: string) => {
    try {
      setLoadingSuggestions(true);
      const result = await api.autocompleteStations(
        query,
        userLocation?.lat,
        userLocation?.lng
      );
      setSuggestions(result.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };
  
  const selectSuggestion = (suggestion: StationSuggestion) => {
    setStationQuery(suggestion.name);
    setManualForm(prev => ({ ...prev, stationName: suggestion.name }));
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
      console.error('Failed to load vehicles:', error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setScanState('processing');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
      });

      if (photo?.base64) {
        const result = await api.scanReceipt(photo.base64, 'image/jpeg');
        
        // Auto-populate manual form with extracted data
        const extracted = result.parsed || result;
        setScanResult(result); // Restore scanResult for Review screen
        setManualForm(prev => ({
          ...prev,
          stationName: extracted.stationName || prev.stationName,
          date: extracted.date || prev.date,
          time: extracted.time || prev.time,
          pricePerLiter: extracted.pricePerLiter?.toString() || '',
          totalLiters: extracted.totalLiters?.toString() || '',
          totalCost: extracted.totalCost?.toString() || '',
        }));
        
        // Go to review screen first
        setScanState('review');
      }
    } catch (error) {
      console.error('Failed to scan receipt:', error);
      Alert.alert('Error', 'Failed to scan the receipt. Please try again.');
      setScanState('camera');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.4,
      });

      if (!result.canceled && result.assets[0].base64) {
        setScanState('processing');
        const scanData = await api.scanReceipt(
          result.assets[0].base64, 
          result.assets[0].mimeType || 'image/jpeg'
        );
        
        // Auto-populate manual form with extracted data
        const extracted = scanData.parsed || scanData;
        setScanResult(scanData); // Restore scanResult for Review screen
        setManualForm(prev => ({
          ...prev,
          stationName: extracted.stationName || prev.stationName,
          date: extracted.date || prev.date,
          time: extracted.time || prev.time,
          pricePerLiter: extracted.pricePerLiter?.toString() || '',
          totalLiters: extracted.totalLiters?.toString() || '',
          totalCost: extracted.totalCost?.toString() || '',
        }));
        
        // Go to review screen first
        setScanState('review');
      }
    } catch (error) {
      console.error('Failed to scan image:', error);
      Alert.alert('Error', 'Failed to scan the image. Please try again.');
      setScanState('camera');
    }
  };

  const handleConfirmScan = () => {
    setScanState('form');
  };

  const handleSaveEntry = async () => {
    if (!scanResult?.parsed) return;

    // We use manualForm because user might have edited the values inline
    if (!manualForm.totalCost) {
      Alert.alert('Error', 'Please check the total cost.');
      setSaving(false);
      return;
    }

    const entryData = {
      vehicleId: selectedVehicle,
      stationName: manualForm.stationName || scanResult?.parsed.stationName || null,
      stationAddress: manualForm.stationAddress || null,
      stationLat: null,
      stationLng: null,
      date: manualForm.date || scanResult?.parsed.date || new Date().toISOString().split('T')[0],
      time: manualForm.time || scanResult?.parsed.time,
      pricePerLiter: manualForm.pricePerLiter ? parseFloat(manualForm.pricePerLiter) : null,
      totalLiters: manualForm.totalLiters ? parseFloat(manualForm.totalLiters) : null,
      totalCost: parseFloat(manualForm.totalCost),
      mileage: manualForm.mileage ? parseInt(manualForm.mileage) : null,
      receiptImageUrl: scanResult?.imageUrl || null,
      notes: manualForm.notes || null,
    };

    try {
      setSaving(true);
      await api.addEntry(entryData);

      Alert.alert('Success', 'Entry saved successfully!', [
        { text: 'OK', onPress: () => {
            resetScan();
            router.replace('/(tabs)/');
          } 
        }
      ]);
    } catch (error: any) {
      console.error('Failed to save entry:', error);

      if (error.message && (error.message.includes('409') || error.message.includes('Conflict'))) {
        Alert.alert(
          'Duplicate Entry', 
          'We found a similar entry with the same date and cost. Do you want to save it anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Save Anyway', 
              onPress: async () => {
                try {
                  setSaving(true);
                  await api.addEntry(entryData, true);
                  Alert.alert('Success', 'Entry saved successfully!', [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        resetScan();
                        router.replace('/(tabs)/');
                      }
                    }
                  ]);
                } catch (retryError) {
                  console.error('Retry save failed:', retryError);
                  Alert.alert('Error', 'Failed to save entry even with force option.');
                } finally {
                  setSaving(false);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save the entry. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };



  // Calculate price per liter or total cost automatically
  const updateManualForm = (field: string, value: string) => {
    // Basic update
    const newForm = { ...manualForm, [field]: value };
    
    // Parse current values (using the new value for the field being updated)
    const liters = parseFloat(newForm.totalLiters);
    const cost = parseFloat(newForm.totalCost);
    const price = parseFloat(newForm.pricePerLiter);
    
    // Logic: Treat Price as anchor if present and positive
    if (field === 'totalLiters') {
      if (!isNaN(liters) && liters > 0) {
        // If we have price, update cost (L * P = C)
        if (!isNaN(price) && price > 0) {
          newForm.totalCost = (liters * price).toFixed(2);
        }
        // If we have cost but no price, calc price (C / L = P)
        else if (!isNaN(cost) && cost > 0) {
          newForm.pricePerLiter = (cost / liters).toFixed(3);
        }
      }
    } else if (field === 'totalCost') {
      if (!isNaN(cost) && cost > 0) {
        // If we have price, update liters (C / P = L)
        if (!isNaN(price) && price > 0) {
          newForm.totalLiters = (cost / price).toFixed(2);
        }
        // If we have liters but no price, calc price (C / L = P)
        else if (!isNaN(liters) && liters > 0) {
          newForm.pricePerLiter = (cost / liters).toFixed(3);
        }
      }
    } else if (field === 'pricePerLiter') {
      if (!isNaN(price) && price > 0) {
        // If we have liters, update cost (L * P = C)
        if (!isNaN(liters) && liters > 0) {
          newForm.totalCost = (liters * price).toFixed(2);
        }
        // If we have cost but no liters, calc liters (C / P = L)
        else if (!isNaN(cost) && cost > 0) {
          newForm.totalLiters = (cost / price).toFixed(2);
        }
      }
    }
    
    setManualForm(newForm);
  };

  // Processing state
  if (scanState === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.processingText}>Scanning receipt...</Text>
          <Text style={styles.processingSubtext}>Extracting data with OCR</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Manual Entry Form
  if (scanState === 'manual') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.reviewHeader}>
              <TouchableOpacity onPress={resetScan}>
                <FontAwesome name="arrow-left" size={20} color="#FF9500" />
              </TouchableOpacity>
              <Text style={styles.reviewTitle}>Manual Entry</Text>
              <View style={{ width: 20 }} />
            </View>

            {/* Station Brand with Autocomplete */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                Station Brand
              </Text>
              <View style={styles.autocompleteContainer}>
                <View style={styles.inputContainer}>
                  <FontAwesome name="building" size={18} color="#8E8E93" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Shell, Benzina, OMV..."
                    placeholderTextColor="#6E6E73"
                    value={stationQuery}
                    onChangeText={(v) => {
                      setStationQuery(v);
                      setManualForm(prev => ({ ...prev, stationName: v }));
                    }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  />
                  {loadingSuggestions && (
                    <ActivityIndicator size="small" color="#FF9500" />
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
                        <FontAwesome name="tint" size={16} color="#FF9500" />
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
                {userLocation && <Text style={styles.locationBadge}> 📍 Using your location</Text>}
              </Text>
              <View style={styles.inputContainer}>
                <FontAwesome name="map-marker" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Teplice, Severní terasa..."
                  placeholderTextColor="#6E6E73"
                  value={manualForm.stationAddress || ''}
                  onChangeText={(v) => setManualForm(prev => ({ ...prev, stationAddress: v }))}
                />
              </View>
            </View>

            {/* Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Date</Text>
              <View style={styles.inputContainer}>
                <FontAwesome name="calendar" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6E6E73"
                  value={manualForm.date}
                  onChangeText={(v) => updateManualForm('date', v)}
                />
              </View>
            </View>

            {/* Fuel Details */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Fuel Details</Text>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <FontAwesome name="tint" size={18} color="#8E8E93" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Liters"
                    placeholderTextColor="#6E6E73"
                    keyboardType="decimal-pad"
                    value={manualForm.totalLiters}
                    onChangeText={(v) => updateManualForm('totalLiters', v)}
                  />
                  <Text style={styles.inputUnit}>L</Text>
                </View>
              </View>

              <View style={[styles.inputContainer, { marginTop: 10 }]}>
                <FontAwesome name="euro" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Price per liter"
                  placeholderTextColor="#6E6E73"
                  keyboardType="decimal-pad"
                  value={manualForm.pricePerLiter}
                  onChangeText={(v) => updateManualForm('pricePerLiter', v)}
                />
                <Text style={styles.inputUnit}>Kč/L</Text>
              </View>

              <View style={[styles.inputContainer, styles.highlightedInput, { marginTop: 10 }]}>
                <FontAwesome name="credit-card" size={18} color="#FF9500" />
                <TextInput
                  style={[styles.textInput, { color: '#FF9500', fontWeight: '600' }]}
                  placeholder="Total cost *"
                  placeholderTextColor="#FF9500"
                  keyboardType="decimal-pad"
                  value={manualForm.totalCost}
                  onChangeText={(v) => updateManualForm('totalCost', v)}
                />
                <Text style={[styles.inputUnit, { color: '#FF9500' }]}>Kč</Text>
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
                          selectedVehicle === vehicle.id && styles.vehicleChipSelected,
                        ]}
                        onPress={() => setSelectedVehicle(vehicle.id)}
                      >
                        <FontAwesome 
                          name="car" 
                          size={14} 
                          color={selectedVehicle === vehicle.id ? '#FFFFFF' : '#8E8E93'} 
                        />
                        <Text style={[
                          styles.vehicleChipText,
                          selectedVehicle === vehicle.id && styles.vehicleChipTextSelected,
                        ]}>
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
                <FontAwesome name="tachometer" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Current odometer reading"
                  placeholderTextColor="#6E6E73"
                  keyboardType="numeric"
                  value={manualForm.mileage}
                  onChangeText={(v) => updateManualForm('mileage', v)}
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (saving || !manualForm.totalCost || !manualForm.pricePerLiter) && styles.saveButtonDisabled
              ]}
              onPress={handleSaveManualEntry}
              disabled={saving || !manualForm.totalCost || !manualForm.pricePerLiter}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Review scanned result
  if (scanState === 'review' && scanResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.reviewContainer}>
          <View style={styles.reviewHeader}>
            <TouchableOpacity onPress={resetScan}>
              <FontAwesome name="arrow-left" size={20} color="#FF9500" />
            </TouchableOpacity>
            <Text style={styles.reviewTitle}>Scan Result</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Extracted Data</Text>
            
            <DataRow 
              label="Station" 
              value={scanResult.parsed.stationName || 'Not detected'} 
              icon="building"
            />
            <DataRow 
              label="Date" 
              value={manualForm.date} 
              icon="calendar"
              editable
              onChangeText={(v: string) => updateManualForm('date', v)}
            />
            <DataRow 
              label="Time" 
              value={manualForm.time} 
              icon="clock-o"
              editable
              onChangeText={(v: string) => updateManualForm('time', v)}
            />
            <DataRow 
              label="Price/Liter" 
              value={manualForm.pricePerLiter} 
              icon="euro"
              editable
              onChangeText={(v: string) => updateManualForm('pricePerLiter', v)}
              placeholder="0.00"
            />
            <DataRow 
              label="Total Liters" 
              value={manualForm.totalLiters} 
              icon="tint"
              editable
              onChangeText={(v: string) => updateManualForm('totalLiters', v)}
              placeholder="0.00"
            />
            <DataRow 
              label="Total Cost" 
              value={manualForm.totalCost} 
              icon="credit-card"
              highlighted
              editable
              onChangeText={(v: string) => updateManualForm('totalCost', v)}
              placeholder="0"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetScan}>
              <FontAwesome name="refresh" size={18} color="#FF9500" />
              <Text style={styles.secondaryButtonText}>Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmScan}>
              <FontAwesome name="check" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Form after scan confirmation
  if (scanState === 'form' && scanResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.formContainer}>
            <View style={styles.reviewHeader}>
              <TouchableOpacity onPress={() => setScanState('review')}>
                <FontAwesome name="arrow-left" size={20} color="#FF9500" />
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
                          selectedVehicle === vehicle.id && styles.vehicleChipSelected,
                        ]}
                        onPress={() => setSelectedVehicle(vehicle.id)}
                      >
                        <FontAwesome 
                          name="car" 
                          size={14} 
                          color={selectedVehicle === vehicle.id ? '#FFFFFF' : '#8E8E93'} 
                        />
                        <Text style={[
                          styles.vehicleChipText,
                          selectedVehicle === vehicle.id && styles.vehicleChipTextSelected,
                        ]}>
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
                <FontAwesome name="tachometer" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter current mileage"
                  placeholderTextColor="#6E6E73"
                  keyboardType="numeric"
                  value={manualForm.mileage}
                  onChangeText={(v) => updateManualForm('mileage', v)}
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Review & Edit Details</Text>
              
              <DataRow 
                label="Date" 
                value={manualForm.date} 
                icon="calendar"
                editable
                onChangeText={(v: string) => updateManualForm('date', v)}
              />
              <DataRow 
                label="Time" 
                value={manualForm.time} 
                icon="clock-o"
                editable
                onChangeText={(v: string) => updateManualForm('time', v)}
              />
              <DataRow 
                label="Price/Liter" 
                value={manualForm.pricePerLiter} 
                icon="euro"
                editable
                onChangeText={(v: string) => updateManualForm('pricePerLiter', v)}
                placeholder="0.00"
              />
              <DataRow 
                label="Total Liters" 
                value={manualForm.totalLiters} 
                icon="tint"
                editable
                onChangeText={(v: string) => updateManualForm('totalLiters', v)}
                placeholder="0.00"
              />
              <DataRow 
                label="Total Cost" 
                value={manualForm.totalCost} 
                icon="credit-card"
                highlighted
                editable
                onChangeText={(v: string) => updateManualForm('totalCost', v)}
                placeholder="0"
              />
            </View>



            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveEntry}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // MAIN CAMERA VIEW (default)
  // Web fallback - show image picker option
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>Scan Receipt</Text>
          <Text style={styles.cameraSubtitle}>Upload an image of your receipt</Text>
        </View>

        <View style={styles.webContainer}>
          <View style={styles.webPlaceholder}>
            <FontAwesome name="camera" size={64} color="#3A3A3C" />
            <Text style={styles.webPlaceholderText}>Camera not available on web</Text>
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <FontAwesome name="image" size={22} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Choose Image</Text>
          </TouchableOpacity>
        </View>

        {/* Manual entry link */}
        <TouchableOpacity 
          style={styles.manualEntryLink}
          onPress={() => setScanState('manual')}
        >
          <FontAwesome name="pencil" size={14} color="#8E8E93" />
          <Text style={styles.manualEntryText}>Or enter details manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Native camera view
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <FontAwesome name="camera" size={64} color="#3A3A3C" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your fuel receipts
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.manualEntryLink}
            onPress={() => setScanState('manual')}
          >
            <FontAwesome name="pencil" size={14} color="#8E8E93" />
            <Text style={styles.manualEntryText}>Or enter details manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.cameraHeader}>
        <Text style={styles.cameraTitle}>Scan Receipt</Text>
        <Text style={styles.cameraSubtitle}>Position the receipt within the frame</Text>
      </View>

      <View style={styles.cameraContainer}>
        {CameraView && (
          <CameraView 
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.frameLine} />
            </View>
          </CameraView>
        )}
      </View>

      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <FontAwesome name="image" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.manualButton} 
          onPress={() => setScanState('manual')}
        >
          <FontAwesome name="pencil" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DataRow({ label, value, icon, highlighted, editable, onChangeText, placeholder }: { 
  label: string; 
  value: string; 
  icon: string;
  highlighted?: boolean;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={[styles.dataRow, highlighted && styles.dataRowHighlighted]}>
      <View style={styles.dataRowIcon}>
        <FontAwesome name={icon as any} size={16} color={highlighted ? '#FF9500' : '#8E8E93'} />
      </View>
      <Text style={styles.dataRowLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={[
            styles.textInput, 
            { textAlign: 'right', padding: 0 },
            highlighted && styles.dataRowValueHighlighted
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || 'Not detected'}
          placeholderTextColor="#666"
          keyboardType={label.includes('Date') || label.includes('Time') ? 'default' : 'numeric'}
        />
      ) : (
        <Text style={[styles.dataRowValue, highlighted && styles.dataRowValueHighlighted]}>
          {value || 'Not detected'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  permissionText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  permissionButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  cameraHeader: {
    padding: 20,
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameLine: {
    width: '85%',
    height: '70%',
    borderWidth: 2,
    borderColor: '#FF9500',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF9500',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  manualButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  manualEntryText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webPlaceholder: {
    alignItems: 'center',
    marginBottom: 32,
  },
  webPlaceholderText: {
    fontSize: 16,
    color: '#6E6E73',
    marginTop: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewContainer: {
    flex: 1,
    padding: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  dataRowHighlighted: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  dataRowIcon: {
    width: 32,
  },
  dataRowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#8E8E93',
  },
  dataRowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dataRowValueHighlighted: {
    fontSize: 18,
    color: '#FF9500',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  locationBadge: {
    fontSize: 12,
    color: '#30D158',
    fontWeight: '400',
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 100,
  },
  suggestionsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
    gap: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  suggestionAddress: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  suggestionDistance: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  highlightedInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputUnit: {
    fontSize: 14,
    color: '#8E8E93',
  },
  vehicleListHorizontal: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  vehicleChipSelected: {
    backgroundColor: '#FF9500',
  },
  vehicleChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  vehicleChipTextSelected: {
    color: '#FFFFFF',
  },
  noVehiclesText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9500',
  },
  summaryValueSmall: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
