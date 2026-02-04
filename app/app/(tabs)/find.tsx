import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import api, { GasStation } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import StationMap from '@/components/StationMap';

const { width, height } = Dimensions.get('window');

export default function FindScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null);
  
  const [radius, setRadius] = useState(5000);
  const searchTimeout = React.useRef<any>();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      loadNearbyStations(currentLocation.coords.latitude, currentLocation.coords.longitude);
    })();
  }, []);

  const loadNearbyStations = async (lat: number, lng: number, rad = 5000, append = false) => {
    try {
      if (!append) setLoading(true);
      const result = await api.getNearbyStations(lat, lng, rad);
      
      if (append) {
        setStations(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newStations = result.stations.filter(s => !existingIds.has(s.id));
          return [...prev, ...newStations];
        });
      } else {
        setStations(result.stations);
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const lat = location?.coords.latitude;
      const lng = location?.coords.longitude;
      // Updated to use object signature
      const result = await api.searchStations({ query: searchQuery, lat, lng });
      setStations(result.stations);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Search Timeout', 'The search took too long. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = useCallback((region: any) => {
    // Only fetch if no search query is active
    if (searchQuery.length > 0) return;

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      // Calculate bounding box
      const south = region.latitude - region.latitudeDelta / 2;
      const west = region.longitude - region.longitudeDelta / 2;
      const north = region.latitude + region.latitudeDelta / 2;
      const east = region.longitude + region.longitudeDelta / 2;
      const bounds = `${south},${west},${north},${east}`;

      try {
        const currentLat = location?.coords.latitude;
        const currentLng = location?.coords.longitude;
        const result = await api.searchStations({ 
          bounds, 
          lat: currentLat, 
          lng: currentLng 
        });
        // Don't overwrite if user is typing
        if (searchQuery.length === 0) {
           setStations(result.stations);
        }
      } catch (e) {
        console.log('Map fetch failed silently', e);
      }
    }, 800); // 800ms debounce
  }, [searchQuery, location]);

  const handleLoadMore = () => {
    if (viewMode === 'list' && location && !loading) {
      const newRadius = radius + 5000;
      setRadius(newRadius);
      loadNearbyStations(location.coords.latitude, location.coords.longitude, newRadius, true);
    }
  };

  const refreshNearby = () => {
    if (location) {
      setRadius(5000); // Reset radius
      setSearchQuery('');
      loadNearbyStations(location.coords.latitude, location.coords.longitude);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Stations</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <FontAwesome name="map" size={16} color={viewMode === 'map' ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <FontAwesome name="list" size={16} color={viewMode === 'list' ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gas stations..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); refreshNearby(); }}>
              <FontAwesome name="times-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          {location ? (
            <StationMap
              location={location}
              stations={stations}
              selectedStation={selectedStation}
              onRegionChange={handleRegionChange}
              onStationSelect={(station: GasStation) => setSelectedStation(station)}
              onSwitchToList={() => setViewMode('list')}
              style={styles.map}
            />
          ) : (
            <View style={styles.loadingContainer}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.tint} />
              ) : (
                <>
                  <FontAwesome name="location-arrow" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Location access required</Text>
                  <Text style={styles.emptySubtext}>Enable location to find nearby stations</Text>
                </>
              )}
            </View>
          )}

          {/* Station Details Card */}
          {selectedStation && (
            <View style={styles.stationCard}>
              <View style={styles.stationCardHeader}>
                <View style={styles.stationIconContainer}>
                  <FontAwesome name="tint" size={20} color={colors.tint} />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{selectedStation.name}</Text>
                  {selectedStation.brand && (
                    <Text style={styles.stationBrand}>{selectedStation.brand}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedStation(null)}>
                  <FontAwesome name="times" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedStation.address && (
                <Text style={styles.stationAddress}>{selectedStation.address}</Text>
              )}
              <View style={[styles.stationMeta, { justifyContent: 'space-between', alignItems: 'center' }]}>
                {selectedStation.distance !== undefined && (
                  <View style={styles.distanceBadge}>
                    <FontAwesome name="location-arrow" size={12} color={colors.tint} />
                    <Text style={styles.distanceText}>
                      {(selectedStation.distance / 1000).toFixed(1)} km
                    </Text>
                  </View>
                )}
                {selectedStation.fuelTypes?.length > 0 && (
                   <View style={[styles.fuelTypes, { marginTop: 0 }]}>
                     {selectedStation.fuelTypes.slice(0, 3).map((fuel, idx) => (
                       <View key={idx} style={styles.fuelBadge}>
                         <Text style={styles.fuelBadgeText}>{fuel}</Text>
                       </View>
                     ))}
                   </View>
                )}
              </View>
            </View>
          )}
        </View>
      ) : (
        // List View
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setSelectedStation(item); setViewMode('map'); }}
            >
              <View style={styles.listItemIcon}>
                <FontAwesome name="tint" size={18} color={colors.tint} />
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{item.name}</Text>
                {item.address && (
                  <Text style={styles.listItemAddress} numberOfLines={1}>{item.address}</Text>
                )}
                {item.fuelTypes.length > 0 && (
                  <View style={styles.fuelTypes}>
                    {item.fuelTypes.slice(0, 3).map((fuel, idx) => (
                      <View key={idx} style={styles.fuelBadge}>
                        <Text style={styles.fuelBadgeText}>{fuel}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.listItemDistance}>
                <Text style={styles.distanceValue}>{(item.distance / 1000).toFixed(1)}</Text>
                <Text style={styles.distanceUnit}>km</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.tint} />
              ) : (
                <>
                  <FontAwesome name="map-marker" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No stations found</Text>
                  <Text style={styles.emptySubtext}>Try searching or enable location</Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.tint,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: colors.tint,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 14,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  stationBrand: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  stationMeta: {
    flexDirection: 'row',
    marginTop: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tint,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItemAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fuelTypes: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  fuelBadge: {
    backgroundColor: colors.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fuelBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listItemDistance: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tint,
  },
  distanceUnit: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  switchToListButton: {
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  switchToListText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
