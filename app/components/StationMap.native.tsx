import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import MapView, { Marker, Polyline, Region, Camera } from "react-native-maps";
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
// This makes the user appear in the lower part of map, showing more road ahead
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

const NAV_ZOOM = 18;
const NAV_ALTITUDE = 300; // meters above ground - lower = more zoomed in
const NAV_PITCH = 60;
const NAV_ANIMATION_MS = 800;

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

    // Single unified function for all camera updates during navigation
    const updateNavCamera = (
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
    };

    useImperativeHandle(ref, () => ({
      animateToLocation: (lat: number, lng: number, heading?: number) => {
        if (!mapRef.current) return;
        if (isNavigating) {
          const h = heading && heading >= 0 ? heading : lastHeadingRef.current;
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
        const h =
          userHeading && userHeading >= 0
            ? userHeading
            : lastHeadingRef.current;
        updateNavCamera(
          location.coords.latitude,
          location.coords.longitude,
          h,
          1200, // slightly slower initial animation
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
      <MapView
        ref={mapRef}
        style={[styles.map, style]}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onRegionChangeComplete={isNavigating ? undefined : onRegionChange}
        showsUserLocation
        showsMyLocationButton={!isNavigating}
        userInterfaceStyle={isDark ? "dark" : "light"}
        followsUserLocation={false}
        showsCompass={!isNavigating}
        showsTraffic={isNavigating}
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={!isNavigating}
        zoomEnabled={!isNavigating}
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
                    selectedStation?.id === station.id ? colors.tint : "#FFFFFF"
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
              style={[styles.destinationMarker, { backgroundColor: "#FF3B30" }]}
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
});
