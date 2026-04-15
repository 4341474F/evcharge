import { View, Text, StyleSheet } from 'react-native';
import type { StationStatus } from '../../types/station';

const STATUS_CONFIG: Record<StationStatus, { color: string; label: string }> = {
  available: { color: '#00D26A', label: 'Müsait' },
  occupied: { color: '#F59E0B', label: 'Meşgul' },
  out_of_service: { color: '#EF4444', label: 'Arızalı' },
  unknown: { color: '#6B7280', label: 'Bilinmiyor' },
};

interface AvailabilityDotProps {
  status: StationStatus;
  showLabel?: boolean;
}

export function AvailabilityDot({ status, showLabel = false }: AvailabilityDotProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      {showLabel && <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 13, fontWeight: '500' },
});
