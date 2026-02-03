import React from 'react';
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

declare const StationMap: React.FC<StationMapProps>;
export default StationMap;
