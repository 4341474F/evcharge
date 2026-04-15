import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';
import type { ChargingStation } from '../../types/station';

const STATUS_COLORS = {
  available: '#00D26A',
  occupied: '#F59E0B',
  out_of_service: '#EF4444',
  unknown: '#6B7280',
};

interface StationMarkerProps {
  station: ChargingStation;
  onPress: (station: ChargingStation) => void;
  isSelected?: boolean;
}

export function StationMarker({ station, onPress, isSelected }: StationMarkerProps) {
  const color = STATUS_COLORS[station.overallStatus];

  return (
    <Marker
      key={station.id}
      coordinate={{ latitude: station.latitude, longitude: station.longitude }}
      onPress={() => onPress(station)}
      tracksViewChanges={false}
    >
      <View style={[styles.container, isSelected && styles.selected, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.count} numberOfLines={1}>
          {station.totalAvailable}/{station.totalConnectors}
        </Text>
      </View>
      {/* Pointer tip */}
      <View style={[styles.tip, { borderTopColor: color }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  selected: {
    transform: [{ scale: 1.15 }],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tip: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
