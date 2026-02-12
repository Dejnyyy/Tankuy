import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Location from "expo-location";
import api, { GasStation } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

import StationMap, { StationMapHandle } from "@/components/StationMap";
import NavigationOverlay, {
  NavigationStep,
} from "@/components/NavigationOverlay";

const { width, height } = Dimensions.get("window");

export default function FindScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(
    null,
  );
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(0);
  const [totalDistanceRemaining, setTotalDistanceRemaining] = useState(0);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(0);
  const [userHeading, setUserHeading] = useState(0);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<StationMapHandle>(null);

  const [radius, setRadius] = useState(5000);
  const searchTimeout = React.useRef<any>();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      loadNearbyStations(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
      );
    })();
  }, []);

  const loadNearbyStations = async (
    lat: number,
    lng: number,
    rad = 5000,
    append = false,
  ) => {
    try {
      if (!append) setLoading(true);
      const result = await api.getNearbyStations(lat, lng, rad);

      if (append) {
        setStations((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newStations = result.stations.filter(
            (s) => !existingIds.has(s.id),
          );
          return [...prev, ...newStations];
        });
      } else {
        setStations(result.stations);
      }
    } catch (error) {
      console.error("Failed to load stations:", error);
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
      console.error("Search failed:", error);
      Alert.alert(
        "Search Timeout",
        "The search took too long. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = useCallback(
    (region: any) => {
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
            lng: currentLng,
          });
          // Don't overwrite if user is typing
          if (searchQuery.length === 0) {
            setStations(result.stations);
          }
        } catch (e) {
          console.log("Map fetch failed silently", e);
        }
      }, 800); // 800ms debounce
    },
    [searchQuery, location],
  );

  const handleLoadMore = () => {
    if (viewMode === "list" && location && !loading) {
      const newRadius = radius + 5000;
      setRadius(newRadius);
      loadNearbyStations(
        location.coords.latitude,
        location.coords.longitude,
        newRadius,
        true,
      );
    }
  };

  const refreshNearby = () => {
    if (location) {
      setRadius(5000); // Reset radius
      setSearchQuery("");
      loadNearbyStations(location.coords.latitude, location.coords.longitude);
    }
  };

  const openNavigation = (station: GasStation) => {
    const { lat, lng, name } = station;
    const encodedName = encodeURIComponent(name);

    if (Platform.OS === "ios") {
      // Open Apple Maps with driving directions
      const url = `maps://app?daddr=${lat},${lng}&dirflg=d&t=m`;
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        );
      });
    } else if (Platform.OS === "android") {
      // Open Google Maps with navigation
      const url = `google.navigation:q=${lat},${lng}`;
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        );
      });
    } else {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      );
    }
  };

  // Decode Google Polyline encoding (used by OSRM)
  const decodePolyline = (encoded: string) => {
    const points: { latitude: number; longitude: number }[] = [];
    let index = 0,
      lat = 0,
      lng = 0;
    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const fetchRoute = async (station: GasStation) => {
    if (!location) return;
    setRouteLoading(true);
    try {
      const fromLng = location.coords.longitude;
      const fromLat = location.coords.latitude;
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${station.lng},${station.lat}?overview=full&geometries=polyline&steps=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoordinates(decodePolyline(route.geometry));
        setRouteInfo({
          distance: `${(route.distance / 1000).toFixed(1)} km`,
          duration: `${Math.round(route.duration / 60)} min`,
        });

        // Parse steps for navigation
        if (route.legs && route.legs[0]?.steps) {
          const steps: NavigationStep[] = route.legs[0].steps.map((s: any) => ({
            instruction: s.maneuver?.instruction || s.name || "Continue",
            distance: s.distance,
            duration: s.duration,
            maneuver: {
              type: s.maneuver?.type || "continue",
              modifier: s.maneuver?.modifier,
            },
          }));
          setNavigationSteps(steps);
        }
      }
    } catch (error) {
      console.error("Failed to fetch route:", error);
      openNavigation(station);
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setRouteCoordinates([]);
    setRouteInfo(null);
    setNavigationSteps([]);
  };

  // Calculate distance between two coords
  const getDistanceBetween = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startNavigation = async () => {
    if (!selectedStation || routeCoordinates.length === 0) return;

    setIsNavigating(true);
    setCurrentStepIndex(0);
    setViewMode("map");

    // Calculate initial totals
    const totalDist = navigationSteps.reduce((sum, s) => sum + s.distance, 0);
    const totalTime = navigationSteps.reduce((sum, s) => sum + s.duration, 0);
    setTotalDistanceRemaining(totalDist);
    setTotalTimeRemaining(totalTime);
    if (navigationSteps.length > 0) {
      setDistanceToNextTurn(navigationSteps[0].distance);
    }

    // Start watching position
    try {
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (newLocation) => {
          setLocation(newLocation);
          const heading = newLocation.coords.heading;
          if (heading !== null && heading >= 0) {
            setUserHeading(heading);
          }

          // Animate map to follow user
          if (mapRef.current) {
            mapRef.current.animateToLocation(
              newLocation.coords.latitude,
              newLocation.coords.longitude,
              heading && heading >= 0 ? heading : undefined,
            );
          }

          // Update navigation progress
          updateNavigationProgress(newLocation);
        },
      );
      locationWatcherRef.current = watcher;
    } catch (error) {
      console.error("Failed to start location watching:", error);
      Alert.alert("Navigation Error", "Could not start location tracking.");
      setIsNavigating(false);
    }
  };

  const updateNavigationProgress = (newLocation: Location.LocationObject) => {
    if (!selectedStation) return;

    const userLat = newLocation.coords.latitude;
    const userLng = newLocation.coords.longitude;

    // Check if arrived at destination (within 50m)
    const distToDest = getDistanceBetween(
      userLat,
      userLng,
      selectedStation.lat,
      selectedStation.lng,
    );
    if (distToDest < 50) {
      Alert.alert("🎉 Arrived!", `You have arrived at ${selectedStation.name}`);
      stopNavigation();
      return;
    }

    setTotalDistanceRemaining(distToDest);
    // Rough ETA based on average 50 km/h
    const speed =
      newLocation.coords.speed && newLocation.coords.speed > 0
        ? newLocation.coords.speed
        : 13.9;
    setTotalTimeRemaining(distToDest / speed);

    // Find which step we're closest to and update
    setCurrentStepIndex((prevIndex) => {
      // Check if we should advance to next step
      // Simple heuristic: if within 30m of the next step's start, advance
      if (prevIndex < navigationSteps.length - 1) {
        const nextStepDist = navigationSteps[prevIndex].distance;
        // Calculate progress along current step
        if (routeCoordinates.length > 0) {
          // Use cumulative step distances
          let cumulativeDist = 0;
          for (let i = 0; i <= prevIndex; i++) {
            cumulativeDist += navigationSteps[i].distance;
          }
          const remainingToStep = Math.max(
            0,
            cumulativeDist -
              (navigationSteps.reduce((sum, s) => sum + s.distance, 0) -
                distToDest),
          );
          setDistanceToNextTurn(
            Math.max(
              0,
              navigationSteps[prevIndex].distance -
                (navigationSteps[prevIndex].distance -
                  Math.min(
                    remainingToStep,
                    navigationSteps[prevIndex].distance,
                  )),
            ),
          );

          if (remainingToStep < 30 && prevIndex < navigationSteps.length - 1) {
            setDistanceToNextTurn(navigationSteps[prevIndex + 1].distance);
            return prevIndex + 1;
          }
        }
      }
      return prevIndex;
    });
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Stations</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "map" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("map")}
          >
            <FontAwesome
              name="map"
              size={16}
              color={viewMode === "map" ? "#FFFFFF" : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "list" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <FontAwesome
              name="list"
              size={16}
              color={viewMode === "list" ? "#FFFFFF" : colors.textSecondary}
            />
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
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                refreshNearby();
              }}
            >
              <FontAwesome
                name="times-circle"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          {location ? (
            <StationMap
              ref={mapRef}
              location={location}
              stations={isNavigating ? [] : stations}
              selectedStation={selectedStation}
              routeCoordinates={routeCoordinates}
              isNavigating={isNavigating}
              userHeading={userHeading}
              onRegionChange={handleRegionChange}
              onStationSelect={(station: GasStation) => {
                setSelectedStation(station);
                clearRoute();
              }}
              onSwitchToList={() => setViewMode("list")}
              style={styles.map}
            />
          ) : (
            <View style={styles.loadingContainer}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.tint} />
              ) : (
                <>
                  <FontAwesome
                    name="location-arrow"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>Location access required</Text>
                  <Text style={styles.emptySubtext}>
                    Enable location to find nearby stations
                  </Text>
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
                    <Text style={styles.stationBrand}>
                      {selectedStation.brand}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedStation(null);
                    clearRoute();
                  }}
                >
                  <FontAwesome
                    name="times"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {selectedStation.address && (
                <Text style={styles.stationAddress}>
                  {selectedStation.address}
                </Text>
              )}
              <View
                style={[
                  styles.stationMeta,
                  { justifyContent: "space-between", alignItems: "center" },
                ]}
              >
                {selectedStation.distance !== undefined && (
                  <View style={styles.distanceBadge}>
                    <FontAwesome
                      name="location-arrow"
                      size={12}
                      color={colors.tint}
                    />
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
              {routeInfo && (
                <View style={styles.routeInfoContainer}>
                  <FontAwesome name="road" size={14} color={colors.tint} />
                  <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
                  <Text style={styles.routeInfoDivider}>·</Text>
                  <FontAwesome name="clock-o" size={14} color={colors.tint} />
                  <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
                </View>
              )}
              <View style={styles.stationActions}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => fetchRoute(selectedStation)}
                  activeOpacity={0.7}
                  disabled={routeLoading}
                >
                  <FontAwesome
                    name={routeLoading ? "spinner" : "road"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.navigateButtonText}>
                    {routeCoordinates.length > 0 ? "Recalculate" : "Show Route"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.externalNavButton}
                  onPress={() => openNavigation(selectedStation)}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name="external-link"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={styles.externalNavText}>Maps</Text>
                </TouchableOpacity>
              </View>
              {/* Go Now button - only show when route is loaded */}
              {routeCoordinates.length > 0 && navigationSteps.length > 0 && (
                <TouchableOpacity
                  style={styles.goNowButton}
                  onPress={startNavigation}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name="location-arrow"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.goNowText}>Go Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Navigation Overlay */}
          {isNavigating && (
            <NavigationOverlay
              currentStep={navigationSteps[currentStepIndex] || null}
              nextStep={navigationSteps[currentStepIndex + 1] || null}
              distanceToNextTurn={distanceToNextTurn}
              totalDistanceRemaining={totalDistanceRemaining}
              totalTimeRemaining={totalTimeRemaining}
              stationName={selectedStation?.name || ""}
              onStop={stopNavigation}
            />
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
              onPress={() => {
                setSelectedStation(item);
                setViewMode("map");
              }}
            >
              <View style={styles.listItemIcon}>
                <FontAwesome name="tint" size={18} color={colors.tint} />
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{item.name}</Text>
                {item.address && (
                  <Text style={styles.listItemAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
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
              <View style={styles.listItemRight}>
                <View style={styles.listItemDistance}>
                  <Text style={styles.distanceValue}>
                    {(item.distance / 1000).toFixed(1)}
                  </Text>
                  <Text style={styles.distanceUnit}>km</Text>
                </View>
                <TouchableOpacity
                  style={styles.listNavigateButton}
                  onPress={() => openNavigation(item)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="car" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.tint} />
              ) : (
                <>
                  <FontAwesome
                    name="map-marker"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No stations found</Text>
                  <Text style={styles.emptySubtext}>
                    Try searching or enable location
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    viewToggle: {
      flexDirection: "row",
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
      flexDirection: "row",
      alignItems: "center",
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
      position: "relative",
    },
    map: {
      flex: 1,
    },
    markerContainer: {
      backgroundColor: colors.tint,
      padding: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    stationCard: {
      position: "absolute",
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    stationCardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    stationIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
    },
    stationInfo: {
      flex: 1,
      marginLeft: 14,
    },
    stationName: {
      fontSize: 17,
      fontWeight: "600",
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
      flexDirection: "row",
      marginTop: 12,
    },
    distanceBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
    },
    distanceText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.tint,
    },
    listContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
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
      justifyContent: "center",
      alignItems: "center",
    },
    listItemInfo: {
      flex: 1,
      marginLeft: 14,
    },
    listItemName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    listItemAddress: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    fuelTypes: {
      flexDirection: "row",
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
      fontWeight: "500",
    },
    listItemRight: {
      alignItems: "center",
      gap: 8,
    },
    listItemDistance: {
      alignItems: "center",
    },
    distanceValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.tint,
    },
    distanceUnit: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    navigateButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.tint,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      gap: 8,
      marginTop: 12,
      alignSelf: "flex-end",
    },
    navigateButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 14,
    },
    listNavigateButton: {
      backgroundColor: colors.tint,
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    routeInfoContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
      gap: 6,
    },
    routeInfoText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.tint,
    },
    routeInfoDivider: {
      fontSize: 14,
      color: colors.textSecondary,
      marginHorizontal: 2,
    },
    stationActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      gap: 10,
    },
    externalNavButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.tint,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      gap: 8,
    },
    externalNavText: {
      color: colors.tint,
      fontWeight: "600",
      fontSize: 14,
    },
    goNowButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#34C759",
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 12,
      gap: 10,
      shadowColor: "#34C759",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    goNowText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 17,
    },
    emptyList: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
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
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 15,
    },
  });
