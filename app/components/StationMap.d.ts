import React from "react";
import { GasStation } from "@/services/api";

interface StationMapProps {
  location: any;
  stations: GasStation[];
  selectedStation: GasStation | null;
  routeCoordinates?: { latitude: number; longitude: number }[];
  isNavigating?: boolean;
  userHeading?: number;
  onRegionChange: (region: any) => void;
  onStationSelect: (station: GasStation) => void;
  style?: any;
  onSwitchToList?: () => void;
}

export interface StationMapHandle {
  animateToLocation: (lat: number, lng: number, heading?: number) => void;
}

declare const StationMap: React.ForwardRefExoticComponent<
  StationMapProps & React.RefAttributes<StationMapHandle>
>;
export default StationMap;
