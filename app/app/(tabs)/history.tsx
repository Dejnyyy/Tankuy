import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import api, { FuelEntry, Vehicle } from '@/services/api';
import { router, useLocalSearchParams } from 'expo-router';

// Helper to safely format numbers
const formatCurrency = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toFixed(0);
};

const formatDecimal = (val: any, decimals: number = 2) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toFixed(decimals);
};

export default function HistoryScreen() {
  const params = useLocalSearchParams();
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null); // New filter state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Sort State
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
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

  const loadData = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      
      const [entriesData, vehiclesData] = await Promise.all([
        api.getEntries({ 
          vehicleId: selectedVehicle || undefined,
          startDate: filterDate || undefined, // Use filter
          endDate: filterDate || undefined,   // Exact match
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
        setEntries(prev => [...prev, ...entriesData]);
      }
      
      setHasMore(entriesData.length === 20);
      
      if (vehicles.length === 0) {
        setVehicles(vehiclesData);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedVehicle, entries.length, vehicles, sortBy, sortOrder, filterDate]);

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
    router.setParams({ date: '' });
  };

  const openEntryDetails = (entry: FuelEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const handleDeleteEntry = useCallback(() => {
    if (!selectedEntry) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this fuel entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
             // Close modal first to avoid UI glitch
             setModalVisible(false);
             setLoading(true);
             try {
                await api.deleteEntry(selectedEntry.id);
                // Reload data
                await loadData(true);
             } catch (err) {
                console.error('Failed to delete:', err);
                Alert.alert('Error', 'Failed to delete entry');
                setLoading(false); // only if failed, success loadData handles loading
             } finally {
               setSelectedEntry(null);
             }
          }
        }
      ]
    );
  }, [selectedEntry, loadData]);

  const renderEntry = ({ item }: { item: FuelEntry }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('cs-CZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric', // Added year
    });

    // Smart Station Display
    // Prioritize Name. If Name is missing, use Address. If both, show Name (Address in subtitle).
    const displayStation = item.stationName || item.stationAddress || 'Unknown Station';
    const subtext = [
      formattedDate,
      item.vehicleName,
      item.stationName && item.stationAddress ? item.stationAddress : null
    ].filter(Boolean).join(' • ');

    return (
      <TouchableOpacity 
        style={styles.entryCard} 
        activeOpacity={0.7}
        onPress={() => openEntryDetails(item)}
      >
        <View style={styles.entryLeft}>
          <View style={styles.entryIconContainer}>
            <FontAwesome name="tint" size={18} color="#FF9500" />
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
              {formatDecimal(item.totalLiters, 1)}L @ {formatDecimal(item.pricePerLiter, 2)} Kč/L
            </Text>
          )}
        </View>
        
        <View style={styles.entryRight}>
          <Text style={styles.entryAmount}>{formatCurrency(item.totalCost)} Kč</Text>
          {item.receiptImageUrl && (
            <View style={styles.receiptBadge}>
              <FontAwesome name="image" size={10} color="#8E8E93" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity onPress={() => setSortModalVisible(true)} style={styles.sortButton}>
           <FontAwesome name="sort" size={16} color="#FF9500" />
           <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Filter */}
      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { id: null, label: 'All Vehicles' },
            ...vehicles.map(v => ({ id: v.id, label: v.name })),
          ]}
          selected={selectedVehicle}
          onSelect={setSelectedVehicle}
        />
      </View>

      {/* Date Filter Banner */}
      {filterDate && (
        <View style={styles.dateFilterContainer}>
          <Text style={styles.dateFilterText}>
            Showing entries for {new Date(filterDate).toLocaleDateString('cs-CZ')}
          </Text>
          <TouchableOpacity onPress={clearDateFilter} style={styles.clearFilterButton}>
            <FontAwesome name="times-circle" size={20} color="#FF375F" />
          </TouchableOpacity>
        </View>
      )}

      {/* Entries List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
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
              tintColor="#FF9500"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FF9500" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="history" size={48} color="#3A3A3C" />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a receipt to add your first fuel entry
              </Text>
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={() => router.push('/(tabs)/scan')}
              >
                <Text style={styles.scanButtonText}>Scan Receipt</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Entry Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Entry Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                    <FontAwesome name="times" size={24} color="#8E8E93" />
                </TouchableOpacity>
            </View>
            
            {selectedEntry && (
                <ScrollView style={styles.modalContent}>
                    <View style={styles.amountHeader}>
                         <Text style={styles.bigAmount}>{formatCurrency(selectedEntry.totalCost)} Kč</Text>
                         <Text style={styles.volumeText}>{formatDecimal(selectedEntry.totalLiters, 2)} Liters</Text>
                    </View>

                    <View style={styles.detailSection}>
                        <DetailRow 
                            icon="building" 
                            label="Station" 
                            value={selectedEntry.stationName || 'Unknown Station'} 
                        />
                         {selectedEntry.stationAddress && (
                            <DetailRow 
                                icon="map-marker" 
                                label="Address" 
                                value={selectedEntry.stationAddress} 
                            />
                        )}
                        <DetailRow 
                            icon="calendar" 
                            label="Date" 
                            value={new Date(selectedEntry.date).toLocaleDateString()} 
                        />
                        {selectedEntry.time && (
                             <DetailRow 
                                icon="clock-o" 
                                label="Time" 
                                value={selectedEntry.time} 
                            />
                        )}
                        <DetailRow 
                            icon="car" 
                            label="Vehicle" 
                            value={selectedEntry.vehicleName || 'Unknown Vehicle'} 
                        />
                        <DetailRow 
                            icon="euro" 
                            label="Price per Liter" 
                            value={`${formatDecimal(selectedEntry.pricePerLiter, 2)} Kč`} 
                        />
                         {selectedEntry.mileage && (
                            <DetailRow 
                                icon="tachometer" 
                                label="Mileage" 
                                value={`${selectedEntry.mileage} km`} 
                            />
                        )}
                         {selectedEntry.notes && (
                            <View style={styles.noteContainer}>
                                <Text style={styles.noteLabel}>Notes</Text>
                                <Text style={styles.noteText}>{selectedEntry.notes}</Text>
                            </View>
                        )}
                    </View>

                    {selectedEntry.receiptImageUrl && (
                        <View style={styles.receiptSection}>
                            <Text style={styles.sectionTitle}>Receipt Image</Text>
                            <Image 
                                source={{ uri: selectedEntry.receiptImageUrl }} 
                                style={styles.receiptImage}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                    
                    <View style={{ height: 40 }} />
                    
                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={handleDeleteEntry}
                    >
                      <FontAwesome name="trash" size={18} color="#FF3B30" />
                      <Text style={styles.deleteButtonText}>Delete Entry</Text>
                    </TouchableOpacity>
                    
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
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
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'date' && sortOrder === 'DESC' && styles.activeSortOption]}
              onPress={() => { setSortBy('date'); setSortOrder('DESC'); setSortModalVisible(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'date' && sortOrder === 'DESC' && styles.activeSortText]}>Newest Date</Text>
              {sortBy === 'date' && sortOrder === 'DESC' && <FontAwesome name="check" size={14} color="#FF9500" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'date' && sortOrder === 'ASC' && styles.activeSortOption]}
              onPress={() => { setSortBy('date'); setSortOrder('ASC'); setSortModalVisible(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'date' && sortOrder === 'ASC' && styles.activeSortText]}>Oldest Date</Text>
              {sortBy === 'date' && sortOrder === 'ASC' && <FontAwesome name="check" size={14} color="#FF9500" />}
            </TouchableOpacity>

            <View style={styles.sortDivider} />

            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'price' && sortOrder === 'DESC' && styles.activeSortOption]}
              onPress={() => { setSortBy('price'); setSortOrder('DESC'); setSortModalVisible(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price' && sortOrder === 'DESC' && styles.activeSortText]}>Highest Price</Text>
              {sortBy === 'price' && sortOrder === 'DESC' && <FontAwesome name="check" size={14} color="#FF9500" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'price' && sortOrder === 'ASC' && styles.activeSortOption]}
              onPress={() => { setSortBy('price'); setSortOrder('ASC'); setSortModalVisible(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price' && sortOrder === 'ASC' && styles.activeSortText]}>Lowest Price</Text>
              {sortBy === 'price' && sortOrder === 'ASC' && <FontAwesome name="check" size={14} color="#FF9500" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
                <FontAwesome name={icon} size={20} color="#FF9500" />
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
  onSelect 
}: { 
  options: { id: string | null; label: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(item) => item.id || 'all'}
      contentContainerStyle={styles.filterList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterChip,
            selected === item.id && styles.filterChipActive,
          ]}
          onPress={() => onSelect(item.id)}
        >
          <Text style={[
            styles.filterChipText,
            selected === item.id && styles.filterChipTextActive,
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sortButtonText: {
    color: '#FF9500',
    fontWeight: '600',
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  entryLeft: {},
  entryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryCenter: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  entryStation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entryMeta: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 3,
  },
  entryDetails: {
    fontSize: 12,
    color: '#6E6E73',
    marginTop: 3,
  },
  entryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  entryAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  receiptBadge: {
    marginTop: 6,
    backgroundColor: '#2C2C2E',
    padding: 4,
    borderRadius: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
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
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
  },
  closeButton: {
      padding: 5,
  },
  modalContent: {
      flex: 1,
  },
  amountHeader: {
      alignItems: 'center',
      paddingVertical: 30,
      borderBottomWidth: 1,
      borderBottomColor: '#2C2C2E',
  },
  bigAmount: {
      fontSize: 42,
      fontWeight: '700',
      color: '#FF9500',
  },
  volumeText: {
      fontSize: 16,
      color: '#8E8E93',
      marginTop: 5,
  },
  detailSection: {
      padding: 20,
  },
  detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
  },
  detailIcon: {
      width: 40,
      alignItems: 'center',
  },
  detailContent: {
      flex: 1,
  },
  detailLabel: {
      fontSize: 13,
      color: '#8E8E93',
  },
  detailValue: {
      fontSize: 16,
      color: '#FFFFFF',
      marginTop: 2,
  },
  noteContainer: {
      marginTop: 10,
      backgroundColor: '#2C2C2E',
      padding: 15,
      borderRadius: 10,
  },
  noteLabel: {
      fontSize: 13,
      color: '#8E8E93',
      marginBottom: 5,
  },
  noteText: {
      fontSize: 15,
      color: '#FFFFFF',
  },
  receiptSection: {
      padding: 20,
      paddingTop: 0,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 15,
  },
  receiptImage: {
      width: '100%',
      height: 300,
      borderRadius: 10,
      backgroundColor: '#000',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#1C1C1E',
    width: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  activeSortOption: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  activeSortText: {
    color: '#FF9500',
    fontWeight: '600',
  },
  sortDivider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 8,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  dateFilterText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    padding: 4,
  },
});
