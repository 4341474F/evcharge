import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import { useFavorites } from "../hooks/useFavorites";

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
  Diğer: "#6B7280",
};

function getNetworkColor(network: string | null): string {
  if (!network) return "#6B7280";
  return NETWORK_COLORS[network] ?? "#6B7280";
}

function getNetworkInitial(network: string | null): string {
  if (!network) return "?";
  return network.charAt(0).toUpperCase();
}

interface FavoriteRow {
  id: string;
  station_ocm_id: string;
  station_name: string;
  network: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  added_at: string;
}

export default function FavoritesScreen() {
  const { user } = useAuthStore();
  const { favorites, isLoading, toggleFavorite } = useFavorites();

  function handleDelete(item: FavoriteRow) {
    Alert.alert(
      "Favoriden Kaldır",
      `"${item.station_name}" favorilerden kaldırılsın mı?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: () => {
            // toggleFavorite bir ChargingStation bekliyor; sadece gerekli alanları sağlıyoruz
            toggleFavorite({
              id: item.station_ocm_id,
              name: item.station_name,
              network: (item.network as any) ?? "Diğer",
              city: item.city ?? "",
              address: "",
              district: null,
              latitude: item.latitude ?? 0,
              longitude: item.longitude ?? 0,
              connectors: [],
              overallStatus: "available",
              phone: null,
              totalAvailable: 0,
              totalConnectors: 0,
              isGreenEnergy: false,
              locationType: "other",
              openingHours: { is24h: true },
              venueName: null,
              hasToggPriority: false,
              hasBlockingFee: false,
            });
          },
        },
      ],
    );
  }

  function handleCardPress(item: FavoriteRow) {
    Alert.alert(
      item.station_name,
      "Harita ekranına gidip bu istasyonu görmek ister misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Haritaya Git",
          onPress: () => router.push("/(tabs)"),
        },
      ],
    );
  }

  // ── Giriş yapılmamış ──────────────────────────────────────────────────────

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header count={0} />
        <View style={styles.emptyContainer}>
          <Ionicons name="person-circle-outline" size={72} color="#374151" />
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptySubtitle}>
            Favorileri görmek için hesabınıza giriş yapmanız gerekiyor.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#0F1117" />
            <Text style={styles.actionBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Yükleniyor ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header count={0} />
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#00D26A" />
          <Text style={styles.loadingText}>Favoriler yükleniyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Boş liste ─────────────────────────────────────────────────────────────

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header count={0} />
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={72} color="#374151" />
          <Text style={styles.emptyTitle}>Henüz favori istasyon yok</Text>
          <Text style={styles.emptySubtitle}>
            İstasyon kartından ❤️ butonuna basarak favorilere ekleyin.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="map-outline" size={18} color="#0F1117" />
            <Text style={styles.actionBtnText}>Haritaya Git</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Liste ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header count={favorites.length} />
      <FlatList
        data={favorites as FavoriteRow[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const color = getNetworkColor(item.network);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleCardPress(item)}
              activeOpacity={0.75}
            >
              {/* Sol: ağ rengi dairesi */}
              <View
                style={[
                  styles.networkCircle,
                  { backgroundColor: color + "25", borderColor: color + "55" },
                ]}
              >
                <Text style={[styles.networkInitial, { color }]}>
                  {getNetworkInitial(item.network)}
                </Text>
              </View>

              {/* Orta: bilgiler */}
              <View style={styles.cardInfo}>
                <Text style={styles.stationName} numberOfLines={2}>
                  {item.station_name}
                </Text>
                <View style={styles.metaRow}>
                  {item.city ? (
                    <>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#6B7280"
                      />
                      <Text style={styles.metaText}>{item.city}</Text>
                    </>
                  ) : null}
                  {item.city && item.network ? (
                    <Text style={styles.metaDot}>·</Text>
                  ) : null}
                  {item.network ? (
                    <Text style={[styles.metaNetwork, { color }]}>
                      {item.network}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Sağ: aksiyon ikonları */}
              <View style={styles.cardActions}>
                {/* Pembe kalp — zaten favori göstergesi */}
                <View style={styles.heartBadge}>
                  <Ionicons name="heart" size={14} color="#EC4899" />
                </View>
                {/* Kırmızı çöp — sil */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ count }: { count: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Favorilerim</Text>

      {count > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 36,
  },
  countBadge: {
    minWidth: 36,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3D0B1E",
    borderWidth: 1,
    borderColor: "#EC489960",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    color: "#EC4899",
    fontSize: 13,
    fontWeight: "700",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 10,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2332",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
    gap: 12,
  },
  networkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    flexShrink: 0,
  },
  networkInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  stationName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  metaDot: {
    fontSize: 12,
    color: "#4B5563",
  },
  metaNetwork: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardActions: {
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  heartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3D0B1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EC489940",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#7F1D1D20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF444430",
  },

  // Empty / Loading
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D1D5DB",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  actionBtnText: {
    color: "#0F1117",
    fontSize: 15,
    fontWeight: "700",
  },
});
