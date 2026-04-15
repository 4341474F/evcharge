import { View, Text, StyleSheet } from 'react-native';
import type { ConnectorType, StationStatus } from '../../types/station';

const CONNECTOR_COLORS: Record<ConnectorType, string> = {
  CCS2: '#3B82F6',
  CHAdeMO: '#F59E0B',
  Type2: '#8B5CF6',
  Type1: '#6B7280',
  Schuko: '#EC4899',
  Tesla: '#EF4444',
};

const STATUS_COLORS: Record<StationStatus, string> = {
  available: '#00D26A',
  occupied: '#F59E0B',
  out_of_service: '#EF4444',
  unknown: '#6B7280',
};

interface ConnectorBadgeProps {
  type: ConnectorType;
  powerKw: number;
  status: StationStatus;
}

export function ConnectorBadge({ type, powerKw, status }: ConnectorBadgeProps) {
  return (
    <View style={[styles.container, { borderColor: CONNECTOR_COLORS[type] + '40' }]}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
      <Text style={[styles.type, { color: CONNECTOR_COLORS[type] }]}>{type}</Text>
      <Text style={styles.power}>{powerKw > 0 ? `${powerKw}kW` : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1117',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
  },
  power: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
