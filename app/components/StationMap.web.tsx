import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { GasStation } from '@/services/api';

interface StationMapProps {
  location: any;
  stations: GasStation[];
  selectedStation: GasStation | null;
  onRegionChange: (region: any) => void;
  onStationSelect: (station: GasStation) => void;
  style?: any;
  onSwitchToList?: () => void;
}

export default function StationMap({
  onSwitchToList,
}: StationMapProps) {
  return (
    <View style={styles.loadingContainer}>
      <FontAwesome name="map" size={48} color="#3A3A3C" />
      <Text style={styles.emptyText}>Map not available on web</Text>
      <Text style={styles.emptySubtext}>Use the list view or test on mobile</Text>
      {onSwitchToList && (
        <TouchableOpacity 
          style={styles.switchToListButton}
          onPress={onSwitchToList}
        >
          <Text style={styles.switchToListText}>Switch to List View</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6E6E73',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 24,
  },
  switchToListButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  switchToListText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
