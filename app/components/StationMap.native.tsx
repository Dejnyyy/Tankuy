import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet } from "react-native";
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

    useImperativeHandle(ref, () => ({
      animateToLocation: (lat: number, lng: number, heading?: number) => {
        if (mapRef.current) {
          mapRef.current.animateCamera(
            {
              center: { latitude: lat, longitude: lng },
              heading: heading || 0,
              pitch: isNavigating ? 45 : 0,
              zoom: isNavigating ? 17 : 15,
            },
            { duration: 500 },
          );
        }
      },
    }));

    // When entering navigation mode, tilt the camera
    useEffect(() => {
      if (isNavigating && location && mapRef.current) {
        mapRef.current.animateCamera(
          {
            center: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            heading: userHeading || 0,
            pitch: 45,
            zoom: 17,
          },
          { duration: 800 },
        );
      }
    }, [isNavigating]);

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
        followsUserLocation={isNavigating}
        showsCompass={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {stations.map((station) => (
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
            strokeColor={colors.tint}
            strokeWidth={isNavigating ? 6 : 4}
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
