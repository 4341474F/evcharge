import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase/client';
import { useAuthStore } from '../../stores/authStore';
import { useSessionStore } from '../../stores/sessionStore';
import type { ChargingSession } from '../../types/session';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return '—';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
}

function SessionCard({ session }: { session: ChargingSession }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.networkBadge}>
          <Text style={styles.networkText}>{session.network}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          session.status === 'completed' ? styles.statusCompleted : styles.statusActive,
        ]}>
          <Text style={[
            styles.statusText,
            session.status === 'completed' ? styles.statusTextCompleted : styles.statusTextActive,
          ]}>
            {session.status === 'completed' ? 'Tamamlandı' : 'Aktif'}
          </Text>
        </View>
      </View>

      <Text style={styles.stationName} numberOfLines={1}>{session.station_name}</Text>
      <Text style={styles.date}>{formatDate(session.started_at)}</Text>

      <View style={styles.cardMetrics}>
        <View style={styles.metric}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.metricText}>{formatDuration(session.started_at, session.ended_at)}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="flash-outline" size={14} color="#6B7280" />
          <Text style={styles.metricText}>{session.energy_kwh.toFixed(2)} kWh</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="card-outline" size={14} color="#00D26A" />
          <Text style={[styles.metricText, { color: '#00D26A', fontWeight: '600' }]}>
            ₺{session.cost_tl.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SessionsScreen() {
  const { user } = useAuthStore();
  const { activeSession } = useSessionStore();

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charging_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ChargingSession[];
    },
    enabled: !!user,
  });

  const totalSpent = sessions?.reduce((sum, s) => sum + s.cost_tl, 0) ?? 0;
  const totalEnergy = sessions?.reduce((sum, s) => sum + s.energy_kwh, 0) ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Şarj Geçmişi</Text>
      </View>

      {/* Active session banner */}
      {activeSession && (
        <TouchableOpacity style={styles.activeBanner} onPress={() => router.push('/session/active')}>
          <View style={styles.activeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBannerTitle}>Aktif Şarj Oturumu</Text>
            <Text style={styles.activeBannerSub}>{activeSession.stationName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00D26A" />
        </TouchableOpacity>
      )}

      {/* Summary */}
      {sessions && sessions.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{sessions.length}</Text>
            <Text style={styles.summaryLabel}>Oturum</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalEnergy.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>kWh</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#00D26A' }]}>₺{totalSpent.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Harcama</Text>
          </View>
        </View>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#00D26A" />
        </View>
      )}

      {!user && (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={60} color="#374151" />
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptyText}>Şarj geçmişinizi görmek için giriş yapın</Text>
        </View>
      )}

      {user && !isLoading && sessions?.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="flash-outline" size={60} color="#374151" />
          <Text style={styles.emptyTitle}>Henüz Şarj Yok</Text>
          <Text style={styles.emptyText}>İlk şarj oturumunuzu başlatın</Text>
        </View>
      )}

      {sessions && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionCard session={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00D26A40',
    marginBottom: 12,
    gap: 10,
  },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00D26A' },
  activeBannerTitle: { color: '#D1FAE5', fontSize: 14, fontWeight: '600' },
  activeBannerSub: { color: '#6EE7B7', fontSize: 12 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#1A2332',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D3748',
    marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#2D3748' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#1A2332',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  networkBadge: {
    backgroundColor: '#0F1117',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  networkText: { color: '#D1D5DB', fontSize: 12, fontWeight: '600' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusCompleted: { backgroundColor: '#064E3B' },
  statusActive: { backgroundColor: '#1E3A5F' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextCompleted: { color: '#00D26A' },
  statusTextActive: { color: '#3B82F6' },
  stationName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  date: { color: '#6B7280', fontSize: 12, marginBottom: 12 },
  cardMetrics: { flexDirection: 'row', gap: 16 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricText: { color: '#9CA3AF', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { color: '#D1D5DB', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
});
