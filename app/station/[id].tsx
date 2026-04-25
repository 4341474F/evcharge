import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchStationById } from "../../lib/ocm/client";
import { useSessionStore } from "../../stores/sessionStore";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase/client";
import { ConnectorBadge } from "../../components/station/ConnectorBadge";
import { AvailabilityDot } from "../../components/station/AvailabilityDot";
import type { Connector } from "../../types/station";

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null,
  );
  const [isStarting, setIsStarting] = useState(false);

  const { startSession } = useSessionStore();
  const { user } = useAuthStore();

  const { data: station, isLoading } = useQuery({
    queryKey: ["station", id],
    queryFn: () => fetchStationById(id!),
    enabled: !!id,
  });

  async function handleStartCharge() {
    if (!selectedConnector || !station || !user) return;

    setIsStarting(true);
    try {
      // Create session record in Supabase
      const { data, error } = await supabase
        .from("charging_sessions")
        .insert({
          user_id: user.id,
          station_id: station.id,
          station_name: station.name,
          network: station.network,
          connector_type: selectedConnector.type,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      startSession({
        sessionId: data.id,
        stationId: station.id,
        stationName: station.name,
        network: station.network,
        connectorType: selectedConnector.type,
        startedAt: new Date(),
        elapsedSeconds: 0,
        energyKwh: 0,
        costTl: 0,
        pricePerKwh: selectedConnector.pricePerKwh ?? 8.5,
        powerKw: selectedConnector.powerKw ?? 22,
      });

      router.replace("/session/active");
    } catch {
      Alert.alert("Hata", "Şarj başlatılamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00D26A" size="large" />
      </View>
    );
  }

  if (!station) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "#EF4444", textAlign: "center", marginTop: 40 }}>
          İstasyon bulunamadı.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {station.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status & network */}
        <View style={styles.metaRow}>
          <View style={styles.networkTag}>
            <Text style={styles.networkText}>{station.network}</Text>
          </View>
          <AvailabilityDot status={station.overallStatus} showLabel />
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.address}>
            {station.address}, {station.city}
          </Text>
        </View>

        {/* Connector selection */}
        <Text style={styles.sectionTitle}>Konnektör Seç</Text>
        <Text style={styles.sectionHint}>
          Şarj başlatmak için bir konnektör seçin
        </Text>

        {station.connectors.map((connector, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.connectorRow,
              selectedConnector === connector && styles.connectorRowSelected,
              connector.status === "out_of_service" &&
                styles.connectorRowDisabled,
            ]}
            onPress={() => {
              if (connector.status !== "out_of_service") {
                setSelectedConnector(
                  connector === selectedConnector ? null : connector,
                );
              }
            }}
            disabled={connector.status === "out_of_service"}
          >
            <View style={styles.connectorLeft}>
              <ConnectorBadge
                type={connector.type}
                powerKw={connector.powerKw}
                status={connector.status}
              />
            </View>
            <View style={styles.connectorRight}>
              <Text style={styles.connectorPrice}>
                {connector.pricePerKwh != null
                  ? `₺${connector.pricePerKwh}/kWh`
                  : "Fiyat bilgisi yok"}
              </Text>
              {selectedConnector === connector && (
                <Ionicons name="checkmark-circle" size={20} color="#00D26A" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Start charge button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startBtn,
            (!selectedConnector || isStarting) && styles.startBtnDisabled,
          ]}
          onPress={handleStartCharge}
          disabled={!selectedConnector || isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#0F1117" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#0F1117" />
              <Text style={styles.startBtnText}>
                {selectedConnector ? "Şarjı Başlat" : "Konnektör Seçin"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1117",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 40 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  networkTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#1A2332",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  networkText: { color: "#D1D5DB", fontSize: 13, fontWeight: "600" },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 24,
  },
  address: { color: "#9CA3AF", fontSize: 13, flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sectionHint: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#2D3748",
  },
  connectorRowSelected: {
    borderColor: "#00D26A",
    backgroundColor: "#064E3B20",
  },
  connectorRowDisabled: { opacity: 0.4 },
  connectorLeft: {},
  connectorRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  connectorPrice: { color: "#9CA3AF", fontSize: 13 },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#2D3748",
  },
  startBtn: {
    backgroundColor: "#00D26A",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startBtnDisabled: { backgroundColor: "#374151", opacity: 0.7 },
  startBtnText: { color: "#0F1117", fontSize: 16, fontWeight: "700" },
});
