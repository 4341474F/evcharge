import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "../../stores/sessionStore";
import { supabase } from "../../lib/supabase/client";

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function ActiveSessionScreen() {
  const { activeSession, updateSession, endSession } = useSessionStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for the charging indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Konektör gücünden gerçekçi şarj hızı hesapla
  // Gerçek dünyada: DC verimlilik ~%92, AC ~%88
  // Simülasyon 10x hızlandırılmış (demo için)
  const SIMULATION_SPEED = 10;

  function calcKwhPerSecond(powerKw: number): number {
    const clampedKw = Math.max(1.4, Math.min(powerKw, 350)); // 1.4–350 kW arası
    const efficiency = clampedKw >= 50 ? 0.92 : 0.88; // DC vs AC verimi
    return (clampedKw * efficiency * SIMULATION_SPEED) / 3600;
  }

  // Simulate charging progress
  useEffect(() => {
    if (!activeSession) return;

    const pricePerKwh = activeSession.pricePerKwh || 8.5;
    // powerKw activeSession'da varsa kullan, yoksa connector tipinden tahmin et
    const powerKw = activeSession.powerKw ?? 22;
    const kwhPerSecond = calcKwhPerSecond(powerKw);

    intervalRef.current = setInterval(() => {
      updateSession((prev: typeof activeSession) => {
        if (!prev) return prev;
        const newElapsed = prev.elapsedSeconds + 1;
        const newEnergy = prev.energyKwh + kwhPerSecond;
        const newCost = newEnergy * pricePerKwh;
        return {
          ...prev,
          elapsedSeconds: newElapsed,
          energyKwh: newEnergy,
          costTl: newCost,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession?.sessionId]);

  async function handleStop() {
    Alert.alert(
      "Şarjı Durdur",
      "Şarj oturumunu bitirmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Durdur",
          style: "destructive",
          onPress: async () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (activeSession) {
              await supabase
                .from("charging_sessions")
                .update({
                  ended_at: new Date().toISOString(),
                  energy_kwh: activeSession.energyKwh,
                  cost_tl: activeSession.costTl,
                  status: "completed",
                })
                .eq("id", activeSession.sessionId);
            }
            endSession();
            router.replace("/(tabs)/sessions");
          },
        },
      ],
    );
  }

  if (!activeSession) {
    router.replace("/(tabs)");
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aktif Şarj</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* Station info */}
        <View style={styles.stationCard}>
          <View style={styles.networkBadge}>
            <Text style={styles.networkText}>{activeSession.network}</Text>
          </View>
          <Text style={styles.stationName} numberOfLines={2}>
            {activeSession.stationName}
          </Text>
          <Text style={styles.connectorType}>
            {activeSession.connectorType}
          </Text>
        </View>

        {/* Charging animation */}
        <View style={styles.chargeVisual}>
          <Animated.View
            style={[styles.chargeRing, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.chargeInner}>
              <Ionicons name="flash" size={48} color="#00D26A" />
            </View>
          </Animated.View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatDuration(activeSession.elapsedSeconds)}
            </Text>
            <Text style={styles.metricLabel}>Süre</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {activeSession.energyKwh.toFixed(2)}
              <Text style={styles.metricUnit}> kWh</Text>
            </Text>
            <Text style={styles.metricLabel}>Enerji</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: "#00D26A" }]}>
              ₺{activeSession.costTl.toFixed(2)}
            </Text>
            <Text style={styles.metricLabel}>Maliyet</Text>
          </View>
        </View>

        {/* Price + power info */}
        <View style={styles.priceInfoRow}>
          <View style={styles.priceInfo}>
            <Ionicons name="flash-outline" size={14} color="#F59E0B" />
            <Text style={styles.priceText}>
              {activeSession.powerKw ?? 22} kW şarj gücü
            </Text>
          </View>
          <View style={styles.priceInfo}>
            <Ionicons name="card-outline" size={14} color="#6B7280" />
            <Text style={styles.priceText}>
              ₺{(activeSession.pricePerKwh || 8.5).toFixed(2)}/kWh
            </Text>
          </View>
        </View>

        {/* Stop button */}
        <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
          <Ionicons name="stop-circle" size={22} color="#EF4444" />
          <Text style={styles.stopBtnText}>Şarjı Durdur</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  stationCard: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 32,
  },
  networkBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#00D26A20",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  networkText: { color: "#00D26A", fontSize: 12, fontWeight: "700" },
  stationName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  connectorType: { color: "#6B7280", fontSize: 13 },
  chargeVisual: {
    alignItems: "center",
    marginBottom: 32,
  },
  chargeRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#00D26A15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00D26A40",
  },
  chargeInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00D26A20",
    justifyContent: "center",
    alignItems: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 16,
  },
  metricCard: { flex: 1, alignItems: "center" },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  metricUnit: { fontSize: 14, color: "#9CA3AF" },
  metricLabel: { color: "#6B7280", fontSize: 12 },
  metricDivider: { width: 1, backgroundColor: "#2D3748", alignSelf: "stretch" },
  priceInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceText: { color: "#6B7280", fontSize: 13 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#7F1D1D20",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#EF444440",
  },
  stopBtnText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
});
