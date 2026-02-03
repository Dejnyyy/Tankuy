import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { GasStation } from '@/services/api';
import { LocationObject } from 'expo-location';

interface StationMapProps {
  location: LocationObject | null;
  stations: GasStation[];
  selectedStation: GasStation | null;
  onRegionChange: (region: Region) => void;
  onStationSelect: (station: GasStation) => void;
  style?: any;
  onSwitchToList?: () => void;
}

export default function StationMap({
  location,
  stations,
  selectedStation,
  onRegionChange,
  onStationSelect,
  style,
  onSwitchToList,
}: StationMapProps) {
  if (!location) return null;

  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation
      showsMyLocationButton
      userInterfaceStyle="dark"
    >
      {stations.map((station) => (
        <Marker
          key={station.id}
          coordinate={{ latitude: station.lat, longitude: station.lng }}
          title={station.name}
          description={station.address || undefined}
          onPress={() => onStationSelect(station)}
        >
          <View style={[
            styles.markerContainer,
            selectedStation?.id === station.id && styles.markerActive
          ]}>
            <FontAwesome 
              name="tint" 
              size={16} 
              color={selectedStation?.id === station.id ? '#000000' : '#FFFFFF'} 
            />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    padding: 8,
    backgroundColor: '#FF9500',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF9500',
    transform: [{ scale: 1.2 }],
  },
});
