import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/context/AuthContext';
import api, { Stats, FuelEntry } from '@/services/api';
import { router } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

// Helper function to safely format numbers
const formatNumber = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return '0';
  }
  return num.toFixed(decimals);
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPoint, setSelectedPoint] = useState<any>(null); // For chart tooltip

  const loadData = useCallback(async () => {
    try {
      const [statsData, entriesData] = await Promise.all([
        api.getStats(period, currentDate.toISOString()),
        api.getEntries({ limit: 5 }),
      ]);
      setStats(statsData);
      setRecentEntries(entriesData);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  }, [period, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (period === 'week') {
      newDate.setDate(newDate.getDate() + (amount * 7));
    } else if (period === 'month') {
      newDate.setMonth(newDate.getMonth() + amount);
    } else {
      newDate.setFullYear(newDate.getFullYear() + amount);
    }
    setCurrentDate(newDate);
  };

  const formattedPeriod = () => {
    if (period === 'year') {
      return currentDate.getFullYear().toString();
    } else if (period === 'month') {
      return currentDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
    } else {
      // Week display
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getDate()}.${startOfWeek.getMonth()+1}. - ${endOfWeek.getDate()}.${endOfWeek.getMonth()+1}.`;
    }
  };

  const chartData = {
    labels: stats?.chart?.labels && stats.chart.labels.length > 0 
      ? stats.chart.labels 
      : ['No Data'],
    datasets: [{
      data: stats?.chart?.data && stats.chart.data.length > 0 
        ? stats.chart.data 
        : [0],
      strokeWidth: 2,
    }],
  };

  const hasData = stats?.summary?.total_tanks && stats.summary.total_tanks > 0;

  const handleDataPointClick = (data: any) => {
    const isSamePoint = selectedPoint && selectedPoint.index === data.index;

    if (isSamePoint) {
      // Navigate to History for this specific date
      if (period === 'month' && chartData.labels[data.index]) {
         const label = chartData.labels[data.index];
         const [day, month] = label.split('.');
         // Construct date string YYYY-MM-DD
         // Note: currentDate holds the correct year
         const year = currentDate.getFullYear();
         // Ensure month/day are padded if needed (though split likely gives strings)
         const dateStr = `${year}-${month}-${day}`;
         
         router.push({ pathname: '/(tabs)/history', params: { date: dateStr } });
         setSelectedPoint(null);
      }
    } else {
      setSelectedPoint({
        text: `${data.value} Kč`,
        ...data
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
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
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
            <Text style={styles.subGreeting}>Track your fuel expenses</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelectorContainer}>
          <View style={styles.periodSwitcher}>
            {(['week', 'month', 'year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
                onPress={() => { setPeriod(p); setCurrentDate(new Date()); }}
              >
                <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Navigation */}
          <View style={styles.dateNavigation}>
             <TouchableOpacity style={styles.navButton} onPress={() => changeDate(-1)}>
               <FontAwesome name="chevron-left" size={16} color="#FF9500" />
             </TouchableOpacity>
             <Text style={styles.dateLabel}>{formattedPeriod()}</Text>
             <TouchableOpacity style={styles.navButton} onPress={() => changeDate(1)}>
               <FontAwesome name="chevron-right" size={16} color="#FF9500" />
             </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatsCard
            icon="credit-card"
            label="Total Spent"
            value={`${formatNumber(stats?.summary?.total_spent, 0)} Kč`}
            color="#FF9500"
          />
          <StatsCard
            icon="tint"
            label="Total Liters"
            value={`${formatNumber(stats?.summary?.total_liters, 1)}L`}
            color="#30D158"
          />
          <StatsCard
            icon="tag"
            label="Avg Price/L"
            value={`${formatNumber(stats?.summary?.avg_price_per_liter, 2)} Kč`}
            color="#32ADE6"
          />
          <StatsCard
            icon="dashboard"
            label="Avg Liters"
            value={`${formatNumber(stats?.summary?.avg_liters_per_tank, 1)}L`}
            color="#5AC8FA"
          />
          <StatsCard
            icon="bar-chart"
            label="Avg/Tank"
            value={`${formatNumber(stats?.summary?.avg_per_tank, 0)} Kč`}
            color="#5E5CE6"
          />
          <StatsCard
            icon="hashtag"
            label="Fill-ups"
            value={`${stats?.summary?.total_tanks || 0}`}
            color="#FF375F"
          />
        </View>

        {/* Spending Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending Overview</Text>
          {hasData ? (
            <LineChart
              data={chartData}
              width={screenWidth} // Set to exact screen width
              height={220}
              segments={4}
              onDataPointClick={handleDataPointClick}
              decorator={() => {
                return selectedPoint ? (
                  <View>
                    <View style={{
                        position: 'absolute',
                        left: selectedPoint.x - 40,
                        top: selectedPoint.y - 50,
                        backgroundColor: '#FF9500',
                        padding: 8,
                        borderRadius: 8,
                        width: 80,
                        alignItems: 'center',
                        zIndex: 10,
                    }}>
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                        {selectedPoint.text}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>
                        Tap to open
                      </Text>
                    </View>
                    {/* Arrow */}
                    <View style={{
                        position: 'absolute',
                        left: selectedPoint.x - 6,
                        top: selectedPoint.y - 18,
                        width: 0, 
                        height: 0, 
                        borderLeftWidth: 6,
                        borderRightWidth: 6,
                        borderTopWidth: 6,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: '#FF9500',
                    }}/>
                  </View>
                ) : null;
              }}
              chartConfig={{
                backgroundColor: '#1C1C1E',
                backgroundGradientFrom: '#1C1C1E',
                backgroundGradientTo: '#1C1C1E',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#FF9500',
                },
              }}
              bezier
              style={{
                ...styles.chart,
                marginLeft: 4, // Pull chart to left to reduce label gap
              }}
              fromZero
            />
          ) : (
            <View style={styles.emptyChart}>
              <FontAwesome name="line-chart" size={48} color="#3A3A3C" />
              <Text style={styles.emptyText}>No data yet</Text>
              <Text style={styles.emptySubtext}>Start tracking to see your spending</Text>
            </View>
          )}
        </View>

        {/* Recent Entries */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <FontAwesome name="tint" size={32} color="#3A3A3C" />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to add your first entry</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatsCard({ icon, label, value, color }: { 
  icon: string; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIconContainer, { backgroundColor: `${color}20` }]}>
        <FontAwesome name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}

function EntryCard({ entry }: { entry: FuelEntry }) {
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <TouchableOpacity style={styles.entryCard} activeOpacity={0.7}>
      <View style={styles.entryIconContainer}>
        <FontAwesome name="tint" size={18} color="#FF9500" />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryStation} numberOfLines={1}>
          {entry.stationName || 'Gas Station'}
        </Text>
        <Text style={styles.entryDate}>{formattedDate}</Text>
      </View>
      <View style={styles.entryAmount}>
        <Text style={styles.entryAmountText}>{Number(entry.totalCost).toFixed(0)} Kč</Text>
        {entry.totalLiters && (
          <Text style={styles.entryLiters}>{Number(entry.totalLiters).toFixed(1)}L</Text>
        )}
      </View>
    </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  periodSelectorContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  periodSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  dateLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#FF9500',
  },
  periodButtonText: {
    color: '#8E8E93',
    fontWeight: '600',
    fontSize: 14,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 20,
    gap: 8,
  },
  statsCard: {
    width: (screenWidth - 32) / 2,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  statsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  chartCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    overflow: 'hidden', // Ensure chart doesn't bleed
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  emptyChart: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  entryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
    marginLeft: 14,
  },
  entryStation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entryDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  entryAmount: {
    alignItems: 'flex-end',
  },
  entryAmountText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entryLiters: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 4,
    textAlign: 'center',
  },
});
