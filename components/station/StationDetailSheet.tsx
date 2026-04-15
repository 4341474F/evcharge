import { forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomSheet, { type BottomSheetHandle } from '../ui/BottomSheet';
import type { ChargingStation } from '../../types/station';
import { ConnectorBadge } from './ConnectorBadge';
import { AvailabilityDot } from './AvailabilityDot';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';

const NETWORK_COLORS: Record<string, string> = {
  ZES: '#00D26A',
  Eşarj: '#3B82F6',
  Trugo: '#F59E0B',
  Voltrun: '#8B5CF6',
  Toroslar: '#EC4899',
  Diğer: '#6B7280',
};

interface StationDetailSheetProps {
  station: ChargingStation | null;
  onClose: () => void;
}

const StationDetailSheet = forwardRef<BottomSheetHandle, StationDetailSheetProps>(
  ({ station, onClose }, ref) => {
    const { activeSession } = useSessionStore();
    const { user } = useAuthStore();

    function handleNavigate() {
      if (!station) return;
      const apple = `maps://app?daddr=${station.latitude},${station.longitude}`;
      Linking.openURL(apple).catch(() =>
        Linking.openURL(`https://maps.google.com/?daddr=${station.latitude},${station.longitude}`)
      );
    }

    function handleStartCharge() {
      if (!station) return;
      if (!user) {
        Alert.alert('Giriş Gerekli', 'Şarj başlatmak için giriş yapın.');
        return;
      }
      if (activeSession) {
        Alert.alert('Aktif Oturum', 'Zaten aktif bir şarj oturumunuz var.');
        return;
      }
      router.push(`/station/${station.id}`);
    }

    const networkColor = station ? (NETWORK_COLORS[station.network] ?? '#6B7280') : '#6B7280';

    return (
      <BottomSheet ref={ref} onClose={onClose} snapPercent={0.55}>
        {station ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.networkTag, { backgroundColor: networkColor + '20', borderColor: networkColor + '40' }]}>
                <Text style={[styles.networkText, { color: networkColor }]}>{station.network}</Text>
              </View>
              <AvailabilityDot status={station.overallStatus} showLabel />
            </View>

            <Text style={styles.name} numberOfLines={2}>{station.name}</Text>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.address}>
                {station.address}{station.city ? `, ${station.city}` : ''}
              </Text>
            </View>

            {station.phone && (
              <TouchableOpacity
                style={styles.phoneRow}
                onPress={() => Linking.openURL(`tel:${station.phone}`)}
              >
                <Ionicons name="call-outline" size={16} color="#00D26A" />
                <Text style={styles.phoneText}>{station.phone}</Text>
              </TouchableOpacity>
            )}

            {/* Connectors */}
            <Text style={styles.sectionTitle}>Konnektörler</Text>
            <View style={styles.connectorGrid}>
              {station.connectors.length > 0 ? (
                station.connectors.map((c, i) => (
                  <ConnectorBadge key={i} type={c.type} powerKw={c.powerKw} status={c.status} />
                ))
              ) : (
                <Text style={styles.noData}>Konnektör bilgisi yok</Text>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="flash" size={18} color="#00D26A" />
                <Text style={styles.statValue}>{station.totalAvailable}</Text>
                <Text style={styles.statLabel}>Müsait</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="hardware-chip-outline" size={18} color="#6B7280" />
                <Text style={styles.statValue}>{station.totalConnectors}</Text>
                <Text style={styles.statLabel}>Toplam</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={18} color="#3B82F6" />
                <Text style={styles.statValue}>
                  {station.connectors.length > 0
                    ? `${Math.max(...station.connectors.map((c) => c.powerKw))}`
                    : '—'}
                  <Text style={styles.unit}> kW</Text>
                </Text>
                <Text style={styles.statLabel}>Max Güç</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate}>
                <Ionicons name="navigate" size={18} color="#3B82F6" />
                <Text style={styles.navigateBtnText}>Yol Tarifi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chargeBtn,
                  station.overallStatus === 'out_of_service' && styles.chargeBtnDisabled,
                ]}
                onPress={handleStartCharge}
                disabled={station.overallStatus === 'out_of_service'}
              >
                <Ionicons name="flash" size={18} color="#0F1117" />
                <Text style={styles.chargeBtnText}>Şarj Başlat</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View />
        )}
      </BottomSheet>
    );
  },
);

StationDetailSheet.displayName = 'StationDetailSheet';
export { StationDetailSheet };

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  networkTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  networkText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, lineHeight: 26 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  address: { color: '#9CA3AF', fontSize: 13, flex: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  phoneText: { color: '#00D26A', fontSize: 13 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noData: { color: '#4B5563', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1117',
    borderRadius: 12,
    marginTop: 20,
    padding: 16,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  unit: { fontSize: 11, color: '#6B7280' },
  statLabel: { color: '#6B7280', fontSize: 11 },
  statDivider: { width: 1, backgroundColor: '#2D3748', alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  navigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#3B82F640',
  },
  navigateBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  chargeBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D26A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  chargeBtnDisabled: { backgroundColor: '#374151', opacity: 0.5 },
  chargeBtnText: { color: '#0F1117', fontSize: 15, fontWeight: '700' },
});
