import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase/client";
import { useAuthStore } from "../../stores/authStore";

// ─── Supabase'den gelen ham oturum tipi ──────────────────────────────────────
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

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
function formatTl(amount: number): string {
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("tr-TR", { month: "short" });
}

// ─── Ağ renkleri ─────────────────────────────────────────────────────────────
const NETWORK_COLORS: Record<string, string> = {
  ZES: "#3B82F6",
  Eşarj: "#10B981",
  Trugo: "#F59E0B",
  Voltrun: "#8B5CF6",
  WAT: "#EF4444",
  "5şarj": "#EC4899",
  EnYakıt: "#F97316",
  Astor: "#06B6D4",
  Otojet: "#84CC16",
  Beefull: "#14B8A6",
  Zeplin: "#A855F7",
  Toroslar: "#6366F1",
  Diğer: "#6B7280",
};

// ─── Rozet tanımları ──────────────────────────────────────────────────────────
interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (sessions: RawSession[]) => boolean;
  progress?: (sessions: RawSession[]) => number; // 0-1
  progressLabel?: (sessions: RawSession[]) => string;
}

const BADGES: Badge[] = [
  {
    id: "first_charge",
    icon: "🔌",
    title: "İlk Şarj",
    description: "İlk şarj oturumunu tamamla",
    check: (s) => s.filter((x) => x.status === "completed").length >= 1,
  },
  {
    id: "ten_charges",
    icon: "⚡",
    title: "10 Şarj",
    description: "10 şarj oturumunu tamamla",
    check: (s) => s.filter((x) => x.status === "completed").length >= 10,
    progress: (s) =>
      Math.min(s.filter((x) => x.status === "completed").length / 10, 1),
    progressLabel: (s) =>
      `${Math.min(s.filter((x) => x.status === "completed").length, 10)}/10`,
  },
  {
    id: "green_driver",
    icon: "🌱",
    title: "Yeşil Sürücü",
    description: "Eşarj istasyonlarında 5 şarj",
    check: (s) =>
      s.filter((x) => x.network === "Eşarj" && x.status === "completed")
        .length >= 5,
    progress: (s) =>
      Math.min(
        s.filter((x) => x.network === "Eşarj" && x.status === "completed")
          .length / 5,
        1,
      ),
    progressLabel: (s) =>
      `${Math.min(s.filter((x) => x.network === "Eşarj" && x.status === "completed").length, 5)}/5`,
  },
  {
    id: "highway_hero",
    icon: "🛣️",
    title: "Kahraman Yolcu",
    description: "Otoyol istasyonunda şarj yap",
    check: (s) =>
      s.some(
        (x) =>
          x.status === "completed" &&
          (x.station_name.toLowerCase().includes("tem") ||
            x.station_name.toLowerCase().includes("otoyol") ||
            x.station_name.toLowerCase().includes("otoban")),
      ),
  },
  {
    id: "fifty_kwh",
    icon: "🏆",
    title: "50 kWh Kulübü",
    description: "Toplamda 50 kWh şarj et",
    check: (s) =>
      s
        .filter((x) => x.status === "completed")
        .reduce((a, x) => a + x.energy_kwh, 0) >= 50,
    progress: (s) => {
      const total = s
        .filter((x) => x.status === "completed")
        .reduce((a, x) => a + x.energy_kwh, 0);
      return Math.min(total / 50, 1);
    },
    progressLabel: (s) => {
      const total = s
        .filter((x) => x.status === "completed")
        .reduce((a, x) => a + x.energy_kwh, 0);
      return `${Math.min(total, 50).toFixed(1)}/50 kWh`;
    },
  },
  {
    id: "multi_network",
    icon: "🌐",
    title: "Ağ Gezgini",
    description: "3 farklı şarj ağı kullan",
    check: (s) =>
      new Set(s.filter((x) => x.status === "completed").map((x) => x.network))
        .size >= 3,
    progress: (s) =>
      Math.min(
        new Set(s.filter((x) => x.status === "completed").map((x) => x.network))
          .size / 3,
        1,
      ),
    progressLabel: (s) =>
      `${Math.min(new Set(s.filter((x) => x.status === "completed").map((x) => x.network)).size, 3)}/3 ağ`,
  },
];

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { user } = useAuthStore();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions_stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*")
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RawSession[];
    },
    enabled: !!user,
  });

  // ─── Hesaplamalar (useMemo) ─────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;

    const completed = sessions.filter((s) => s.status === "completed");
    const totalEnergy = completed.reduce((a, s) => a + s.energy_kwh, 0);
    const totalCost = completed.reduce((a, s) => a + s.cost_tl, 0);
    const sessionCount = completed.length;

    // CO₂ hesabı: karma hesap (kWh × 0.2 kg CO₂)
    const co2SavedKg = totalEnergy * 0.2;
    // Benzin muadili: 1 kWh ≈ 0.12 litre benzin
    const fuelSavedLiters = totalEnergy * 0.12;
    // Finansal tasarruf: kWh × 0.5 L/kWh × 42₺/L
    const gasolineCostTl = totalEnergy * 0.5 * 42;
    const savedTl = gasolineCostTl - totalCost;

    // Ağ dağılımı
    const networkMap: Record<string, { count: number; energy: number }> = {};
    completed.forEach((s) => {
      if (!networkMap[s.network])
        networkMap[s.network] = { count: 0, energy: 0 };
      networkMap[s.network].count += 1;
      networkMap[s.network].energy += s.energy_kwh;
    });
    const networkList = Object.entries(networkMap)
      .map(([name, v]) => ({
        name,
        count: v.count,
        energy: v.energy,
        percent: (v.count / sessionCount) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Son 6 aylık trend
    const now = new Date();
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = getMonthLabel(d);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthSessions = completed.filter((s) => {
        const sd = new Date(s.started_at);
        return sd.getFullYear() === year && sd.getMonth() === month;
      });
      const kwh = monthSessions.reduce((a, s) => a + s.energy_kwh, 0);
      return { label, kwh, count: monthSessions.length };
    });
    const maxKwh = Math.max(...monthlyData.map((m) => m.kwh), 1);

    // En çok kullanılan konnektör
    const connectorMap: Record<string, number> = {};
    completed.forEach((s) => {
      connectorMap[s.connector_type] =
        (connectorMap[s.connector_type] ?? 0) + 1;
    });
    const topConnector =
      Object.entries(connectorMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    // Ortalama oturum süresi
    const durations = completed
      .filter((s) => s.ended_at)
      .map(
        (s) =>
          (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) /
          60000,
      );
    const avgDurationMin =
      durations.length > 0
        ? durations.reduce((a, d) => a + d, 0) / durations.length
        : 0;

    // Ortalama kWh/oturum
    const avgKwh = totalEnergy / sessionCount;

    // Favori istasyon
    const stationMap: Record<string, number> = {};
    completed.forEach((s) => {
      stationMap[s.station_name] = (stationMap[s.station_name] ?? 0) + 1;
    });
    const favoriteStation =
      Object.entries(stationMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      totalEnergy,
      totalCost,
      sessionCount,
      co2SavedKg,
      fuelSavedLiters,
      gasolineCostTl,
      savedTl,
      networkList,
      monthlyData,
      maxKwh,
      topConnector,
      avgDurationMin,
      avgKwh,
      favoriteStation,
    };
  }, [sessions]);

  // ─── Rozet kontrolü ────────────────────────────────────────────────────
  const badgeResults = useMemo(() => {
    const s = sessions ?? [];
    return BADGES.map((badge) => ({
      ...badge,
      earned: badge.check(s),
      progressValue: badge.progress ? badge.progress(s) : null,
      progressText: badge.progressLabel ? badge.progressLabel(s) : null,
    }));
  }, [sessions]);

  // ─── Giriş yapılmamış durumu ───────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1117" />
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>İstatistikleriniz</Text>
          <Text style={styles.emptyText}>
            Şarj geçmişinizi ve çevre katkınızı görmek için giriş yapın.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Ionicons name="person" size={16} color="#0F1117" />
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1117" />
        <View style={styles.emptyState}>
          <ActivityIndicator color="#00D26A" size="large" />
          <Text style={styles.emptyText}>İstatistikler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1117" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Başlık */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="stats-chart" size={26} color="#00D26A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>İstatistiklerim</Text>
              <Text style={styles.headerSubtitle}>
                Çevre ve cüzdanınıza katkınız
              </Text>
            </View>
          </View>

          <View style={styles.emptyStateInline}>
            <Ionicons name="flash-outline" size={56} color="#374151" />
            <Text style={styles.emptyTitle}>Henüz Veri Yok</Text>
            <Text style={styles.emptyText}>
              İlk şarj oturumunuzu tamamladıktan sonra istatistikleriniz burada
              görünecek.
            </Text>
          </View>

          {/* Rozetler — Kilitli */}
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Başarı Rozetleri</Text>
          </View>
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badgeCard, styles.badgeCardLocked]}
              >
                <View style={styles.badgeIconWrap}>
                  <Text style={styles.badgeIconLocked}>🔒</Text>
                </View>
                <Text style={[styles.badgeTitle, styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── BAŞLIK ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="stats-chart" size={26} color="#00D26A" />
          </View>
          <View>
            <Text style={styles.headerTitle}>İstatistiklerim</Text>
            <Text style={styles.headerSubtitle}>
              Çevre ve cüzdanınıza katkınız
            </Text>
          </View>
        </View>

        {/* ─── HERO CO₂ KARTI ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconCircle}>
              <Text style={styles.heroEmoji}>🌱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Toplam CO₂ Tasarrufu</Text>
              <Text style={styles.heroValue}>
                {stats.co2SavedKg.toFixed(1)} kg CO₂
              </Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>
            Toplam {stats.totalEnergy.toFixed(1)} kWh şarjınızla atmosfere{" "}
            <Text style={styles.heroHighlight}>
              {stats.co2SavedKg.toFixed(1)} kg
            </Text>{" "}
            daha az CO₂ salındı.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                ⛽ {stats.fuelSavedLiters.toFixed(1)} L
              </Text>
              <Text style={styles.heroStatLabel}>Benzin yakılmadı</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                ☀️ {stats.totalEnergy.toFixed(1)} kWh
              </Text>
              <Text style={styles.heroStatLabel}>Temiz enerji kullandınız</Text>
            </View>
          </View>
        </View>

        {/* ─── FİNANSAL ÖZET ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="wallet" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Finansal Özet</Text>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Toplam Harcama</Text>
              <Text style={[styles.financialValue, { color: "#F59E0B" }]}>
                ₺{formatTl(stats.totalCost)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Benzinli Alternatif</Text>
              <Text style={[styles.financialValue, { color: "#EF4444" }]}>
                ₺{formatTl(stats.gasolineCostTl)}
              </Text>
            </View>
          </View>

          {stats.savedTl > 0 && (
            <View style={styles.savingsRow}>
              <Ionicons name="trending-down" size={20} color="#00D26A" />
              <Text style={styles.savingsText}>
                ₺{formatTl(stats.savedTl)} tasarruf ettiniz!
              </Text>
            </View>
          )}

          <View style={styles.financialMini}>
            <View style={styles.financialMiniItem}>
              <Text style={styles.financialMiniLabel}>Oturum Sayısı</Text>
              <Text style={styles.financialMiniValue}>
                {stats.sessionCount}
              </Text>
            </View>
            <View style={styles.financialMiniItem}>
              <Text style={styles.financialMiniLabel}>Toplam Enerji</Text>
              <Text style={styles.financialMiniValue}>
                {stats.totalEnergy.toFixed(1)} kWh
              </Text>
            </View>
            <View style={styles.financialMiniItem}>
              <Text style={styles.financialMiniLabel}>Ortalama/Oturum</Text>
              <Text style={styles.financialMiniValue}>
                ₺
                {formatTl(
                  stats.sessionCount > 0
                    ? stats.totalCost / stats.sessionCount
                    : 0,
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── AĞ DAĞILIMI ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pie-chart" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Şarj Ağı Dağılımı</Text>
          </View>

          {stats.networkList.map((net) => (
            <View key={net.name} style={styles.networkRow}>
              <View style={styles.networkRowLeft}>
                <View
                  style={[
                    styles.networkDot,
                    { backgroundColor: NETWORK_COLORS[net.name] ?? "#6B7280" },
                  ]}
                />
                <Text style={styles.networkName}>{net.name}</Text>
              </View>
              <View style={styles.networkBarWrap}>
                <View style={styles.networkBarBg}>
                  <View
                    style={[
                      styles.networkBarFill,
                      {
                        width: `${net.percent}%`,
                        backgroundColor: NETWORK_COLORS[net.name] ?? "#6B7280",
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.networkPercent}>
                {net.percent.toFixed(0)}%
              </Text>
              <Text style={styles.networkCount}>{net.count} oturum</Text>
            </View>
          ))}
        </View>

        {/* ─── AYLIK TREND ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bar-chart" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Aylık Trend</Text>
            <Text style={styles.cardTitleSub}>Son 6 ay</Text>
          </View>

          <View style={styles.chartContainer}>
            {stats.monthlyData.map((month, idx) => {
              const barHeightPercent =
                stats.maxKwh > 0 ? month.kwh / stats.maxKwh : 0;
              const barHeight = Math.max(
                barHeightPercent * 100,
                month.kwh > 0 ? 4 : 2,
              );
              return (
                <View key={idx} style={styles.chartBar}>
                  <Text style={styles.chartBarValue}>
                    {month.kwh > 0 ? `${month.kwh.toFixed(0)}` : ""}
                  </Text>
                  <View style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBarFill,
                        {
                          height: barHeight,
                          backgroundColor:
                            month.kwh > 0 ? "#00D26A" : "#1E293B",
                          opacity: month.kwh > 0 ? 1 : 0.4,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartBarLabel}>{month.label}</Text>
                  {month.count > 0 && (
                    <Text style={styles.chartBarCount}>{month.count}x</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.chartUnit}>kWh değerleri gösterilmektedir</Text>
        </View>

        {/* ─── ARAÇ & ŞARJ PROFİLİ ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="car-sport" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Şarj Profilim</Text>
          </View>

          <View style={styles.profileGrid}>
            <View style={styles.profileItem}>
              <View style={styles.profileItemIcon}>
                <Ionicons name="flash" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.profileItemLabel}>En Çok Konnektör</Text>
              <Text style={styles.profileItemValue}>{stats.topConnector}</Text>
            </View>
            <View style={styles.profileItem}>
              <View style={styles.profileItemIcon}>
                <Ionicons name="time" size={16} color="#A78BFA" />
              </View>
              <Text style={styles.profileItemLabel}>Ort. Oturum Süresi</Text>
              <Text style={styles.profileItemValue}>
                {stats.avgDurationMin < 60
                  ? `${Math.round(stats.avgDurationMin)} dk`
                  : `${Math.floor(stats.avgDurationMin / 60)} sa ${Math.round(stats.avgDurationMin % 60)} dk`}
              </Text>
            </View>
            <View style={styles.profileItem}>
              <View style={styles.profileItemIcon}>
                <Ionicons name="battery-charging" size={16} color="#60A5FA" />
              </View>
              <Text style={styles.profileItemLabel}>Ort. kWh/Oturum</Text>
              <Text style={styles.profileItemValue}>
                {stats.avgKwh.toFixed(1)} kWh
              </Text>
            </View>
            <View style={styles.profileItem}>
              <View style={styles.profileItemIcon}>
                <Ionicons name="star" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.profileItemLabel}>Favori İstasyon</Text>
              <Text style={styles.profileItemValue} numberOfLines={2}>
                {stats.favoriteStation}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── BAŞARI ROZETLERİ ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Başarı Rozetleri</Text>
          <View style={styles.badgeCountBadge}>
            <Text style={styles.badgeCountText}>
              {badgeResults.filter((b) => b.earned).length}/{BADGES.length}
            </Text>
          </View>
        </View>

        <View style={styles.badgeGrid}>
          {badgeResults.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                badge.earned ? styles.badgeCardEarned : styles.badgeCardLocked,
              ]}
            >
              <View
                style={[
                  styles.badgeIconWrap,
                  badge.earned
                    ? styles.badgeIconWrapEarned
                    : styles.badgeIconWrapLocked,
                ]}
              >
                {badge.earned ? (
                  <Text style={styles.badgeIconEarned}>{badge.icon}</Text>
                ) : (
                  <Text style={styles.badgeIconLocked}>🔒</Text>
                )}
              </View>
              <Text
                style={[
                  styles.badgeTitle,
                  badge.earned
                    ? styles.badgeTitleEarned
                    : styles.badgeTitleLocked,
                ]}
              >
                {badge.title}
              </Text>
              <Text style={styles.badgeDesc}>{badge.description}</Text>

              {/* İlerleme barı */}
              {!badge.earned && badge.progressValue !== null && (
                <View style={styles.badgeProgressWrap}>
                  <View style={styles.badgeProgressBg}>
                    <View
                      style={[
                        styles.badgeProgressFill,
                        { width: `${(badge.progressValue ?? 0) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.badgeProgressText}>
                    {badge.progressText}
                  </Text>
                </View>
              )}

              {badge.earned && (
                <View style={styles.badgeEarnedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#00D26A" />
                  <Text style={styles.badgeEarnedText}>Kazanıldı</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    paddingTop: 4,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0D2818",
    borderWidth: 1,
    borderColor: "#00D26A40",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyStateInline: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#D1D5DB",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  loginButtonText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },

  // Hero CO₂ Kartı
  heroCard: {
    backgroundColor: "#0A2015",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#00D26A30",
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0D2818",
    borderWidth: 1,
    borderColor: "#00D26A40",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: {
    fontSize: 24,
  },
  heroLabel: {
    fontSize: 13,
    color: "#6EE7B7",
    fontWeight: "500",
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#00D26A",
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
    marginBottom: 14,
  },
  heroHighlight: {
    color: "#00D26A",
    fontWeight: "700",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "#0F1117",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A3D26",
  },
  heroStatItem: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: "#1A3D26",
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D1FAE5",
    marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    flex: 1,
  },
  cardTitleSub: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Finansal
  financialGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  financialItem: {
    flex: 1,
    backgroundColor: "#0F1117",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  financialLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D2818",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  savingsText: {
    color: "#00D26A",
    fontSize: 15,
    fontWeight: "700",
  },
  financialMini: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#2D3748",
  },
  financialMiniItem: {
    alignItems: "center",
  },
  financialMiniLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  financialMiniValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E5E7EB",
  },

  // Ağ Dağılımı
  networkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  networkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 72,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  networkBarWrap: {
    flex: 1,
  },
  networkBarBg: {
    height: 8,
    backgroundColor: "#0F1117",
    borderRadius: 4,
    overflow: "hidden",
  },
  networkBarFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 4,
  },
  networkPercent: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    width: 32,
    textAlign: "right",
  },
  networkCount: {
    fontSize: 11,
    color: "#6B7280",
    width: 52,
    textAlign: "right",
  },

  // Aylık Chart
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartBarValue: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
  },
  chartBarWrapper: {
    width: "70%",
    alignItems: "center",
    justifyContent: "flex-end",
    height: 100,
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 2,
  },
  chartBarLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
  },
  chartBarCount: {
    fontSize: 9,
    color: "#4B5563",
    marginTop: 2,
    textAlign: "center",
  },
  chartUnit: {
    fontSize: 11,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 4,
  },

  // Profil Grid
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profileItem: {
    width: "47%",
    backgroundColor: "#0F1117",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
    gap: 6,
  },
  profileItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  profileItemLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  profileItemValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 18,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E5E7EB",
    flex: 1,
  },
  badgeCountBadge: {
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeCountText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  badgeCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  badgeCardEarned: {
    backgroundColor: "#0D2818",
    borderColor: "#00D26A40",
  },
  badgeCardLocked: {
    backgroundColor: "#1A2332",
    borderColor: "#2D3748",
    opacity: 0.7,
  },
  badgeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  badgeIconWrapEarned: {
    backgroundColor: "#0F2A18",
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  badgeIconWrapLocked: {
    backgroundColor: "#0F1117",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  badgeIconEarned: {
    fontSize: 22,
  },
  badgeIconLocked: {
    fontSize: 18,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  badgeTitleEarned: {
    color: "#D1FAE5",
  },
  badgeTitleLocked: {
    color: "#6B7280",
  },
  badgeDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  badgeProgressWrap: {
    gap: 4,
    marginTop: 4,
  },
  badgeProgressBg: {
    height: 4,
    backgroundColor: "#0F1117",
    borderRadius: 2,
    overflow: "hidden",
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: "#00D26A",
    borderRadius: 2,
    minWidth: 2,
  },
  badgeProgressText: {
    fontSize: 10,
    color: "#4B5563",
  },
  badgeEarnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  badgeEarnedText: {
    fontSize: 11,
    color: "#00D26A",
    fontWeight: "600",
  },
});
