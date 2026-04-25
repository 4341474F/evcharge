import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

// ─── MenuItem Component ───────────────────────────────────────────────────────

function MenuItem({ icon, label, onPress, danger, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? "#EF4444" : "#9CA3AF"}
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#4B5563" />
      )}
    </TouchableOpacity>
  );
}

// ─── Network data ─────────────────────────────────────────────────────────────

const NETWORKS = [
  { name: "ZES", color: "#00D26A", count: "5.190+" },
  { name: "Eşarj", color: "#3B82F6", count: "2.230+" },
  { name: "Trugo", color: "#F59E0B", count: "3.088+" },
  { name: "Voltrun", color: "#8B5CF6", count: "2.184+" },
  { name: "WAT", color: "#EC4899", count: "713+" },
  { name: "5şarj", color: "#06B6D4", count: "181+" },
  { name: "EnYakıt", color: "#F97316", count: "296+" },
  { name: "Beefull", color: "#84CC16", count: "50+" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  // Araç sayısını çek
  const { data: vehicleCount = 0 } = useQuery<number>({
    queryKey: ["vehicles-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
  });

  async function handleSignOut() {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            signOut();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* ── User card ──────────────────────────────────────────────────── */}
        {user ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userId}>ID: {user.id.slice(0, 8)}…</Text>
              {/* Araç sayısı satırı */}
              <View style={styles.vehicleCountRow}>
                <Ionicons name="car-outline" size={13} color="#00D26A" />
                <Text style={styles.vehicleCountText}>
                  {vehicleCount === 0
                    ? "Araç eklenmedi"
                    : `${vehicleCount} araç kayıtlı`}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => router.push("/(auth)/login")}
          >
            <Ionicons name="person-add-outline" size={24} color="#00D26A" />
            <Text style={styles.loginPromptText}>Giriş Yap / Kayıt Ol</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}

        {/* ── Araçlarım ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARAÇLARIM</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="car-outline"
              label="Araçlarımı Yönet"
              onPress={() => router.push("/vehicles")}
            />
            <MenuItem
              icon="heart-outline"
              label="Favorilerim"
              onPress={() => router.push("/favorites")}
            />
          </View>
        </View>

        {/* ── Desteklenen Ağlar ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTEKLENEN AĞLAR</Text>
          <View style={styles.networksGrid}>
            {NETWORKS.map((n) => (
              <View
                key={n.name}
                style={[styles.networkCard, { borderColor: n.color + "35" }]}
              >
                <Text style={[styles.networkName, { color: n.color }]}>
                  {n.name}
                </Text>
                <Text style={styles.networkCount}>{n.count} istasyon</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Uygulama ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UYGULAMA</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="stats-chart-outline"
              label="İstatistiklerim"
              onPress={() => router.push("/(tabs)/stats")}
            />
            <MenuItem
              icon="notifications-outline"
              label="Bildirimler"
              onPress={() => router.push("/notifications")}
            />
            <MenuItem
              icon="information-circle-outline"
              label="Hakkında"
              onPress={() =>
                Alert.alert(
                  "ŞarjBul v1.0",
                  "Türkiye'nin şarj ağı konsolidatörü.\n\nVeri kaynağı: Open Charge Map",
                )
              }
              badge="v1.0"
            />
          </View>
        </View>

        {/* ── Çıkış ──────────────────────────────────────────────────────── */}
        {user && (
          <View style={styles.section}>
            <View style={styles.menuGroup}>
              <MenuItem
                icon="log-out-outline"
                label="Çıkış Yap"
                onPress={handleSignOut}
                danger
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#FFFFFF" },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A2332",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00D26A20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#00D26A40",
  },
  avatarText: { color: "#00D26A", fontSize: 22, fontWeight: "700" },
  userEmail: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  userId: { color: "#6B7280", fontSize: 12 },
  vehicleCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  vehicleCountText: { color: "#00D26A", fontSize: 12, fontWeight: "500" },

  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A2332",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  loginPromptText: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "500",
  },

  // Section
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Menu group
  menuGroup: {
    backgroundColor: "#1A2332",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconDanger: { backgroundColor: "#7F1D1D20" },
  menuLabel: { flex: 1, color: "#D1D5DB", fontSize: 15 },
  menuLabelDanger: { color: "#EF4444" },
  badge: {
    backgroundColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#9CA3AF", fontSize: 11 },

  // Networks grid — 2 sütun, 4 satır
  networksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  networkCard: {
    // Her satırda 2 kart: (100% - gap) / 2
    width: "47.5%",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  networkName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  networkCount: { color: "#6B7280", fontSize: 12 },
});
