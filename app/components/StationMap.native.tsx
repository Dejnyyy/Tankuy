import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GasStation } from "@/services/api";
import { LocationObject } from "expo-location";
import { useTheme } from "@/context/ThemeContext";

interface RouteCoord {
  latitude: number;
  longitude: number;
}

interface StationMapProps {
  location: LocationObject | null;
  stations: GasStation[];
  selectedStation: GasStation | null;
  routeCoordinates?: RouteCoord[];
  isNavigating?: boolean;
  userHeading?: number;
  onRegionChange: (region: Region) => void;
  onStationSelect: (station: GasStation) => void;
  style?: any;
  onSwitchToList?: () => void;
}

export interface StationMapHandle {
  animateToLocation: (lat: number, lng: number, heading?: number) => void;
}

// Offset center point slightly ahead of user in their heading direction
const offsetCenter = (
  lat: number,
  lng: number,
  heading: number,
  offsetMeters: number = 150,
) => {
  const headingRad = (heading * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = (offsetMeters * Math.cos(headingRad)) / earthRadius;
  const dLng =
    (offsetMeters * Math.sin(headingRad)) /
    (earthRadius * Math.cos((lat * Math.PI) / 180));
  return {
    latitude: lat + (dLat * 180) / Math.PI,
    longitude: lng + (dLng * 180) / Math.PI,
  };
};

// Calculate bearing between two coordinates
const getBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const NAV_ZOOM = 18;
const NAV_ALTITUDE = 300;
const NAV_PITCH = 60;
const NAV_ANIMATION_MS = 800;
const RECENTER_DELAY_MS = 5000; // 5 seconds before auto-recentering

const StationMap = forwardRef<StationMapHandle, StationMapProps>(
  (
    {
      location,
      stations,
      selectedStation,
      routeCoordinates,
      isNavigating,
      userHeading,
      onRegionChange,
      onStationSelect,
      style,
      onSwitchToList,
    },
    ref,
  ) => {
    const { colors, isDark } = useTheme();
    const mapRef = useRef<MapView>(null);
    const lastHeadingRef = useRef<number>(0);

    // "Free look" state: user is manually panning/zooming during navigation
    const [isFreeLook, setIsFreeLook] = useState(false);
    const freeLookTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFreeLookRef = useRef(false); // Ref for use in callbacks without stale closures

    // Track the last valid heading to avoid snapping to north
    useEffect(() => {
      if (
        userHeading !== undefined &&
        userHeading !== null &&
        userHeading >= 0
      ) {
        lastHeadingRef.current = userHeading;
      }
    }, [userHeading]);

    // Calculate heading from route if GPS heading unavailable
    const getEffectiveHeading = useCallback(
      (lat: number, lng: number, gpsHeading?: number): number => {
        // Use GPS heading if available
        if (gpsHeading !== undefined && gpsHeading >= 0) {
          return gpsHeading;
        }

        // Fall back to calculating from route coordinates
        if (routeCoordinates && routeCoordinates.length > 1) {
          // Find nearest point on route
          let minDist = Infinity;
          let nearestIdx = 0;
          for (let i = 0; i < routeCoordinates.length; i++) {
            const d =
              Math.pow(routeCoordinates[i].latitude - lat, 2) +
              Math.pow(routeCoordinates[i].longitude - lng, 2);
            if (d < minDist) {
              minDist = d;
              nearestIdx = i;
            }
          }
          // Get bearing to next point on route
          const nextIdx = Math.min(nearestIdx + 1, routeCoordinates.length - 1);
          if (nextIdx !== nearestIdx) {
            return getBearing(
              routeCoordinates[nearestIdx].latitude,
              routeCoordinates[nearestIdx].longitude,
              routeCoordinates[nextIdx].latitude,
              routeCoordinates[nextIdx].longitude,
            );
          }
        }

        // Last resort: use last known heading
        return lastHeadingRef.current;
      },
      [routeCoordinates],
    );

    // Single unified function for all camera updates during navigation
    const updateNavCamera = useCallback(
      (
        lat: number,
        lng: number,
        heading: number,
        duration: number = NAV_ANIMATION_MS,
      ) => {
        if (!mapRef.current) return;
        const center = offsetCenter(lat, lng, heading);
        mapRef.current.animateCamera(
          {
            center,
            heading,
            pitch: NAV_PITCH,
            altitude: NAV_ALTITUDE,
            zoom: NAV_ZOOM,
          },
          { duration },
        );
      },
      [],
    );

    // Handle user touching the map during navigation
    const handleMapPanDrag = useCallback(() => {
      if (!isNavigating) return;

      isFreeLookRef.current = true;
      setIsFreeLook(true);

      // Clear any existing recenter timer
      if (freeLookTimerRef.current) {
        clearTimeout(freeLookTimerRef.current);
      }

      // Set timer to recenter after delay
      freeLookTimerRef.current = setTimeout(() => {
        isFreeLookRef.current = false;
        setIsFreeLook(false);

        // Snap back to user location
        if (location && mapRef.current) {
          const h = getEffectiveHeading(
            location.coords.latitude,
            location.coords.longitude,
            userHeading,
          );
          updateNavCamera(
            location.coords.latitude,
            location.coords.longitude,
            h,
            1000,
          );
        }
      }, RECENTER_DELAY_MS);
    }, [
      isNavigating,
      location,
      userHeading,
      getEffectiveHeading,
      updateNavCamera,
    ]);

    // Manual recenter button
    const handleRecenter = useCallback(() => {
      if (freeLookTimerRef.current) {
        clearTimeout(freeLookTimerRef.current);
        freeLookTimerRef.current = null;
      }
      isFreeLookRef.current = false;
      setIsFreeLook(false);

      if (location && mapRef.current) {
        const h = getEffectiveHeading(
          location.coords.latitude,
          location.coords.longitude,
          userHeading,
        );
        updateNavCamera(
          location.coords.latitude,
          location.coords.longitude,
          h,
          800,
        );
      }
    }, [location, userHeading, getEffectiveHeading, updateNavCamera]);

    // Clean up free look timer
    useEffect(() => {
      return () => {
        if (freeLookTimerRef.current) {
          clearTimeout(freeLookTimerRef.current);
        }
      };
    }, []);

    // Reset free look when exiting navigation
    useEffect(() => {
      if (!isNavigating) {
        isFreeLookRef.current = false;
        setIsFreeLook(false);
        if (freeLookTimerRef.current) {
          clearTimeout(freeLookTimerRef.current);
          freeLookTimerRef.current = null;
        }
      }
    }, [isNavigating]);

    useImperativeHandle(ref, () => ({
      animateToLocation: (lat: number, lng: number, heading?: number) => {
        if (!mapRef.current) return;
        if (isNavigating) {
          // Don't update camera if user is freely looking around
          if (isFreeLookRef.current) return;

          const h = getEffectiveHeading(lat, lng, heading);
          updateNavCamera(lat, lng, h);
        } else {
          mapRef.current.animateCamera(
            {
              center: { latitude: lat, longitude: lng },
              heading: 0,
              pitch: 0,
              altitude: 5000,
              zoom: 15,
            },
            { duration: 500 },
          );
        }
      },
    }));

    // When entering navigation mode, immediately set up the camera
    useEffect(() => {
      if (isNavigating && location && mapRef.current) {
        const h = getEffectiveHeading(
          location.coords.latitude,
          location.coords.longitude,
          userHeading,
        );
        updateNavCamera(
          location.coords.latitude,
          location.coords.longitude,
          h,
          1200,
        );
      }
    }, [isNavigating]);

    // Fit to route when route coordinates update (and not navigating)
    useEffect(() => {
      if (
        !isNavigating &&
        routeCoordinates &&
        routeCoordinates.length > 0 &&
        mapRef.current
      ) {
        mapRef.current.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 180, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }, [routeCoordinates, isNavigating]);

    if (!location) return null;

    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={[styles.map, style]}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onRegionChangeComplete={
            isNavigating
              ? () => {
                  // If navigating, treat any region change as potential user interaction
                  if (!isFreeLookRef.current) return;
                  // Reset the auto-recenter timer on continued interaction
                  handleMapPanDrag();
                }
              : onRegionChange
          }
          onPanDrag={handleMapPanDrag}
          showsUserLocation
          showsMyLocationButton={!isNavigating}
          userInterfaceStyle={isDark ? "dark" : "light"}
          followsUserLocation={false}
          showsCompass={!isNavigating}
          showsTraffic={isNavigating}
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Station markers - hidden during navigation */}
          {!isNavigating &&
            stations.map((station) => (
              <Marker
                key={station.id}
                coordinate={{ latitude: station.lat, longitude: station.lng }}
                title={station.name}
                description={station.address || undefined}
                onPress={() => onStationSelect(station)}
              >
                <View
                  style={[
                    styles.markerContainer,
                    { backgroundColor: colors.tint, borderColor: "#FFFFFF" },
                    selectedStation?.id === station.id && {
                      backgroundColor: "#FFFFFF",
                      borderColor: colors.tint,
                      transform: [{ scale: 1.2 }],
                    },
                  ]}
                >
                  <FontAwesome
                    name="tint"
                    size={16}
                    color={
                      selectedStation?.id === station.id
                        ? colors.tint
                        : "#FFFFFF"
                    }
                  />
                </View>
              </Marker>
            ))}

          {/* Destination marker during navigation */}
          {isNavigating && selectedStation && (
            <Marker
              coordinate={{
                latitude: selectedStation.lat,
                longitude: selectedStation.lng,
              }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                style={[
                  styles.destinationMarker,
                  { backgroundColor: "#FF3B30" },
                ]}
              >
                <FontAwesome name="flag-checkered" size={18} color="#FFFFFF" />
              </View>
            </Marker>
          )}

          {/* Route polyline */}
          {routeCoordinates && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={isNavigating ? "#FF9500" : colors.tint}
              strokeWidth={isNavigating ? 8 : 4}
              lineDashPattern={undefined}
            />
          )}
        </MapView>

        {/* Recenter button - shown when user pans away during navigation */}
        {isNavigating && isFreeLook && (
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={handleRecenter}
            activeOpacity={0.8}
          >
            <FontAwesome name="location-arrow" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

StationMap.displayName = "StationMap";
export default StationMap;

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationMarker: {
    padding: 10,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  recenterButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF9500",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
