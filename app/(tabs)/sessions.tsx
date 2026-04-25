import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase/client";
import { useAuthStore } from "../../stores/authStore";
import { useSessionStore } from "../../stores/sessionStore";
import type { ChargingSession } from "../../types/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawSession {
  id: string;
  user_id: string;
  station_id: string;
  station_name: string;
  network: string;
  connector_type: string;
  started_at: string;
  ended_at: string | null;
  energy_kwh: number;
  cost_tl: number;
  status: "active" | "completed" | "cancelled";
}

type SortKey = "date_desc" | "date_asc" | "cost_desc" | "energy_desc";
type StatusFilter = "all" | "completed" | "active" | "cancelled";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date_desc", label: "En Yeni" },
  { key: "date_asc", label: "En Eski" },
  { key: "cost_desc", label: "En Pahalı" },
  { key: "energy_desc", label: "En Çok Enerji" },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "completed", label: "Tamamlandı" },
  { key: "active", label: "Aktif" },
  { key: "cancelled", label: "İptal" },
];

const NETWORK_COLORS: Record<string, string> = {
  ZES: "#00D26A",
  Eşarj: "#3B82F6",
  Trugo: "#F59E0B",
  Voltrun: "#8B5CF6",
  WAT: "#06B6D4",
  "5şarj": "#10B981",
  EnYakıt: "#EF4444",
  Beefull: "#F97316",
  Otojet: "#6366F1",
  Astor: "#EC4899",
  Zeplin: "#14B8A6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRawSession(raw: RawSession): ChargingSession {
  return {
    id: raw.id,
    userId: raw.user_id,
    stationId: raw.station_id,
    stationName: raw.station_name,
    network: raw.network,
    connectorType: raw.connector_type,
    startedAt: raw.started_at,
    endedAt: raw.ended_at,
    energyKwh: raw.energy_kwh,
    costTl: raw.cost_tl,
    status: raw.status,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return "Devam ediyor";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins <= 0) return "< 1 dk";
  if (mins < 60) return `${mins} dk`;
  return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
}

function getNetworkColor(network: string): string {
  return NETWORK_COLORS[network] ?? "#6B7280";
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onPress,
}: {
  session: ChargingSession;
  onPress?: () => void;
}) {
  const networkColor = getNetworkColor(session.network);
  const isCompleted = session.status === "completed";
  const isActive = session.status === "active";
  const isCancelled = session.status === "cancelled";

  const statusLabel = isCompleted ? "Tamamlandı" : isActive ? "Aktif" : "İptal";
  const statusColor = isCompleted
    ? "#00D26A"
    : isActive
      ? "#3B82F6"
      : "#6B7280";
  const statusBg = isCompleted ? "#064E3B" : isActive ? "#1E3A5F" : "#1F2937";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCancelled && styles.cardCancelled,
        isActive && styles.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Üst satır: ağ + durum */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.networkPill,
            {
              backgroundColor: networkColor + "20",
              borderColor: networkColor + "50",
            },
          ]}
        >
          <View
            style={[styles.networkDot, { backgroundColor: networkColor }]}
          />
          <Text style={[styles.networkText, { color: networkColor }]}>
            {session.network}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          {isActive && <View style={styles.activePulseDot} />}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* İstasyon adı */}
      <Text style={styles.stationName} numberOfLines={2}>
        {session.stationName}
      </Text>

      {/* Tarih + konnektör */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color="#4B5563" />
        <Text style={styles.dateText}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Ionicons name="hardware-chip-outline" size={12} color="#4B5563" />
        <Text style={styles.dateText}>{session.connectorType}</Text>
      </View>

      {/* Metrik çubuğu */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={13} color="#6B7280" />
          <Text style={styles.metricValue}>
            {formatDuration(session.startedAt, session.endedAt)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Ionicons name="flash-outline" size={13} color="#6B7280" />
          <Text style={styles.metricValue}>
            {session.energyKwh.toFixed(2)} kWh
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Ionicons name="card-outline" size={13} color="#00D26A" />
          <Text style={[styles.metricValue, styles.metricCost]}>
            ₺{session.costTl.toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionsScreen() {
  const { user } = useAuthStore();
  const { activeSession } = useSessionStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [networkFilter, setNetworkFilter] = useState<string>("Tümü");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const { data: allSessions, isLoading } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as RawSession[]).map(mapRawSession);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Ağ listesi — mevcut oturumlardan dinamik
  const availableNetworks = useMemo(() => {
    if (!allSessions) return [];
    const nets = Array.from(new Set(allSessions.map((s) => s.network))).sort();
    return ["Tümü", ...nets];
  }, [allSessions]);

  // Filtre + sıralama uygulanmış liste
  const sessions = useMemo(() => {
    if (!allSessions) return [];

    let list = [...allSessions];

    // Durum filtresi
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }

    // Ağ filtresi
    if (networkFilter !== "Tümü") {
      list = list.filter((s) => s.network === networkFilter);
    }

    // Sıralama
    switch (sortKey) {
      case "date_asc":
        list.sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
        );
        break;
      case "date_desc":
        list.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        );
        break;
      case "cost_desc":
        list.sort((a, b) => b.costTl - a.costTl);
        break;
      case "energy_desc":
        list.sort((a, b) => b.energyKwh - a.energyKwh);
        break;
    }

    return list;
  }, [allSessions, statusFilter, networkFilter, sortKey]);

  // Özet — tüm oturumlara göre (filtre uygulanmamış)
  const totalSpent = allSessions?.reduce((s, x) => s + x.costTl, 0) ?? 0;
  const totalEnergy = allSessions?.reduce((s, x) => s + x.energyKwh, 0) ?? 0;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (networkFilter !== "Tümü" ? 1 : 0);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sırala";

  function resetFilters() {
    setStatusFilter("all");
    setNetworkFilter("Tümü");
    setSortKey("date_desc");
  }

  // ── Giriş yapılmamış ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Şarj Geçmişi</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-circle-outline" size={40} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptyText}>
            Şarj geçmişinizi görmek için giriş yapın
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#0F1117" />
            <Text style={styles.loginBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Başlık ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Şarj Geçmişi</Text>
        {/* Sıralama butonu */}
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="swap-vertical" size={15} color="#9CA3AF" />
          <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Aktif şarj banner ──────────────────────────────────────────────── */}
      {activeSession && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push("/session/active")}
        >
          <View style={styles.activeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBannerTitle}>Aktif Şarj Oturumu</Text>
            <Text style={styles.activeBannerSub} numberOfLines={1}>
              {activeSession.stationName}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00D26A" />
        </TouchableOpacity>
      )}

      {/* ── Özet kartı ─────────────────────────────────────────────────────── */}
      {allSessions && allSessions.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{allSessions.length}</Text>
            <Text style={styles.summaryLabel}>Oturum</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalEnergy.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>kWh</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#00D26A" }]}>
              ₺{totalSpent.toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Toplam</Text>
          </View>
        </View>
      )}

      {/* ── Filtre çubuğu ──────────────────────────────────────────────────── */}
      {allSessions && allSessions.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {/* Sıfırla — aktif filtre varsa */}
            {activeFilterCount > 0 && (
              <>
                <TouchableOpacity
                  style={styles.resetChip}
                  onPress={resetFilters}
                >
                  <Ionicons name="close-circle" size={13} color="#EF4444" />
                  <Text style={styles.resetChipText}>Sıfırla</Text>
                  <View style={styles.resetCountBadge}>
                    <Text style={styles.resetCountText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.filterDivider} />
              </>
            )}

            {/* Durum filtresi */}
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.filterChip,
                  statusFilter === opt.key && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(opt.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === opt.key && styles.filterChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            {availableNetworks.length > 1 && (
              <View style={styles.filterDivider} />
            )}

            {/* Ağ filtresi — sadece birden fazla ağ varsa göster */}
            {availableNetworks.length > 1 &&
              availableNetworks.map((net) => {
                const color = net === "Tümü" ? undefined : getNetworkColor(net);
                const isActive = networkFilter === net;
                return (
                  <TouchableOpacity
                    key={net}
                    style={[
                      styles.filterChip,
                      isActive &&
                        (color
                          ? {
                              backgroundColor: color + "25",
                              borderColor: color + "60",
                            }
                          : styles.filterChipActive),
                    ]}
                    onPress={() => setNetworkFilter(net)}
                  >
                    {color && (
                      <View
                        style={[
                          styles.netFilterDot,
                          { backgroundColor: color },
                        ]}
                      />
                    )}
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive &&
                          (color
                            ? { color, fontWeight: "700" }
                            : styles.filterChipTextActive),
                      ]}
                    >
                      {net}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      )}

      {/* ── Yükleniyor ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#00D26A" size="large" />
          <Text style={styles.loadingText}>Geçmiş yükleniyor…</Text>
        </View>
      )}

      {/* ── Boş ────────────────────────────────────────────────────────────── */}
      {!isLoading && allSessions?.length === 0 && (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="flash-outline" size={40} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Henüz Şarj Yok</Text>
          <Text style={styles.emptyText}>
            İlk şarj oturumunuzu harita ekranından başlatın
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="map-outline" size={18} color="#0F1117" />
            <Text style={styles.loginBtnText}>Haritaya Git</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtre sonucu boş ───────────────────────────────────────────────── */}
      {!isLoading &&
        allSessions &&
        allSessions.length > 0 &&
        sessions.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="filter-outline" size={40} color="#4B5563" />
            </View>
            <Text style={styles.emptyTitle}>Sonuç Bulunamadı</Text>
            <Text style={styles.emptyText}>
              Seçili filtrelere uyan oturum yok
            </Text>
            <TouchableOpacity style={styles.loginBtn} onPress={resetFilters}>
              <Ionicons name="refresh" size={18} color="#0F1117" />
              <Text style={styles.loginBtnText}>Filtreleri Sıfırla</Text>
            </TouchableOpacity>
          </View>
        )}

      {/* ── Liste ──────────────────────────────────────────────────────────── */}
      {!isLoading && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={
                item.status === "active"
                  ? () => router.push("/session/active")
                  : undefined
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sessions.length > 0 ? (
              <Text style={styles.listFooter}>
                {sessions.length} oturum gösteriliyor
              </Text>
            ) : null
          }
        />
      )}

      {/* ── Sıralama Modalı ────────────────────────────────────────────────── */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sıralama</Text>

            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortKey === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSortKey(opt.key);
                    setSortModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#00D26A" />
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 24 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#FFFFFF" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1A2332",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  sortBtnText: { color: "#9CA3AF", fontSize: 12, fontWeight: "500" },

  // Active banner
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#00D26A40",
    marginBottom: 12,
    gap: 10,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00D26A",
  },
  activeBannerTitle: { color: "#D1FAE5", fontSize: 14, fontWeight: "600" },
  activeBannerSub: { color: "#6EE7B7", fontSize: 12 },

  // Summary
  summary: {
    flexDirection: "row",
    backgroundColor: "#1A2332",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  summaryLabel: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#2D3748" },

  // Filter bar
  filterSection: { marginBottom: 8 },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#1A2332CC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  filterChipActive: {
    backgroundColor: "#00D26A",
    borderColor: "#00D26A",
  },
  filterChipText: { color: "#D1D5DB", fontSize: 12, fontWeight: "500" },
  filterChipTextActive: { color: "#0F1117", fontWeight: "700" },
  filterDivider: { width: 1, height: 20, backgroundColor: "#374151" },
  netFilterDot: { width: 6, height: 6, borderRadius: 3 },

  // Reset chip
  resetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#7F1D1D30",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EF444450",
  },
  resetChipText: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  resetCountBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  resetCountText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  listFooter: {
    textAlign: "center",
    color: "#374151",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },

  // Card
  card: {
    backgroundColor: "#1A2332",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
    gap: 8,
  },
  cardCancelled: { opacity: 0.6 },
  cardActive: {
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  networkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  networkDot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { fontSize: 12, fontWeight: "700" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  stationName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  dateText: { color: "#4B5563", fontSize: 11 },
  metaDot: { color: "#374151", fontSize: 11 },
  metricsBar: {
    flexDirection: "row",
    backgroundColor: "#0F1117",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  metricValue: { color: "#9CA3AF", fontSize: 12, fontWeight: "500" },
  metricCost: { color: "#00D26A", fontWeight: "700" },
  metricDivider: { width: 1, backgroundColor: "#1F2937", alignSelf: "stretch" },

  // Empty / loading
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  loadingText: { color: "#6B7280", fontSize: 14, marginTop: 8 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 4,
  },
  emptyTitle: { color: "#D1D5DB", fontSize: 18, fontWeight: "600" },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loginBtnText: { color: "#0F1117", fontSize: 15, fontWeight: "700" },

  // Sort modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A2332",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "#2D3748",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#4B5563",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  modalOptionSelected: { backgroundColor: "#064E3B20", borderRadius: 8 },
  modalOptionText: { color: "#D1D5DB", fontSize: 15 },
  modalOptionTextSelected: { color: "#00D26A", fontWeight: "700" },
});
