import React, { useEffect, useState, useCallback } from 'react';
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
import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api, { GasStation } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

import StationMap from '@/components/StationMap';

const { width, height } = Dimensions.get('window');

export default function FindScreen() {
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
            <FontAwesome name="map" size={16} color={viewMode === 'map' ? '#FFFFFF' : '#8E8E93'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <FontAwesome name="list" size={16} color={viewMode === 'list' ? '#FFFFFF' : '#8E8E93'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={16} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gas stations..."
            placeholderTextColor="#6E6E73"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); refreshNearby(); }}>
              <FontAwesome name="times-circle" size={18} color="#8E8E93" />
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
                <ActivityIndicator size="large" color="#FF9500" />
              ) : (
                <>
                  <FontAwesome name="location-arrow" size={48} color="#3A3A3C" />
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
                  <FontAwesome name="tint" size={20} color="#FF9500" />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{selectedStation.name}</Text>
                  {selectedStation.brand && (
                    <Text style={styles.stationBrand}>{selectedStation.brand}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedStation(null)}>
                  <FontAwesome name="times" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              {selectedStation.address && (
                <Text style={styles.stationAddress}>{selectedStation.address}</Text>
              )}
              <View style={[styles.stationMeta, { justifyContent: 'space-between', alignItems: 'center' }]}>
                {selectedStation.distance !== undefined && (
                  <View style={styles.distanceBadge}>
                    <FontAwesome name="location-arrow" size={12} color="#FF9500" />
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
                <FontAwesome name="tint" size={18} color="#FF9500" />
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
                <ActivityIndicator size="large" color="#FF9500" />
              ) : (
                <>
                  <FontAwesome name="map-marker" size={48} color="#3A3A3C" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    color: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FF9500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#FF9500',
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
    backgroundColor: '#1C1C1E',
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
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
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
    color: '#FFFFFF',
  },
  stationBrand: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  stationAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  stationMeta: {
    flexDirection: 'row',
    marginTop: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
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
    color: '#FFFFFF',
  },
  listItemAddress: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  fuelTypes: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  fuelBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fuelBadgeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  listItemDistance: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9500',
  },
  distanceUnit: {
    fontSize: 11,
    color: '#8E8E93',
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
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 4,
  },
  switchToListButton: {
    backgroundColor: '#FF9500',
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
