import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type { Database } from "../lib/supabase/types";
import { useAuthStore } from "../stores/authStore";
import { POPULAR_EV_MODELS, type EVModel } from "../types/user";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBVehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  battery_capacity_kwh: number;
  connector_types: string[];
  range_km: number;
  max_charge_kw: number;
  is_togg: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

// Togg araçlarını ilk sıraya al
const sortedModels = [
  ...POPULAR_EV_MODELS.filter((m) => m.brand === "Togg"),
  ...POPULAR_EV_MODELS.filter((m) => m.brand !== "Togg"),
];

// ─── Connector Badge ──────────────────────────────────────────────────────────

function ConnectorBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    CCS2: "#3B82F6",
    Tesla: "#EF4444",
    Type2: "#F59E0B",
    CHAdeMO: "#8B5CF6",
  };
  const color = colorMap[type] ?? "#6B7280";
  return (
    <View
      style={[
        styles.connectorBadge,
        { borderColor: color + "60", backgroundColor: color + "20" },
      ]}
    >
      <Text style={[styles.connectorBadgeText, { color }]}>{type}</Text>
    </View>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  onDelete,
}: {
  vehicle: DBVehicle;
  onDelete: (id: string) => void;
}) {
  const isTogg = vehicle.is_togg;

  function confirmDelete() {
    Alert.alert(
      "Aracı Sil",
      `${vehicle.brand} ${vehicle.model} (${vehicle.year}) aracını silmek istediğinizden emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => onDelete(vehicle.id),
        },
      ],
    );
  }

  return (
    <View style={[styles.vehicleCard, isTogg && styles.vehicleCardTogg]}>
      {/* Sol: ikon */}
      <View
        style={[
          styles.vehicleIconWrapper,
          isTogg && styles.vehicleIconWrapperTogg,
        ]}
      >
        <Ionicons name="car" size={28} color={isTogg ? "#F59E0B" : "#00D26A"} />
      </View>

      {/* Orta: bilgiler */}
      <View style={styles.vehicleInfo}>
        {/* Başlık + Togg badge */}
        <View style={styles.vehicleTitleRow}>
          <Text style={styles.vehicleName}>
            {vehicle.brand} {vehicle.model}
          </Text>
          {isTogg && (
            <View style={styles.toggBadge}>
              <Text style={styles.toggBadgeText}>🇹🇷 Yerli Üretim</Text>
            </View>
          )}
        </View>
        <Text style={styles.vehicleYear}>{vehicle.year}</Text>

        {/* İstatistikler */}
        <View style={styles.vehicleStats}>
          <Text style={styles.vehicleStat}>
            ⚡ {vehicle.battery_capacity_kwh} kWh
          </Text>
          <Text style={styles.vehicleStat}>🏁 {vehicle.range_km} km</Text>
          <Text style={styles.vehicleStat}>⚡ {vehicle.max_charge_kw} kW</Text>
        </View>

        {/* Konektörler */}
        <View style={styles.connectorRow}>
          {vehicle.connector_types.map((c) => (
            <ConnectorBadge key={c} type={c} />
          ))}
        </View>
      </View>

      {/* Sağ: sil */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Model Card (Modal grid) ──────────────────────────────────────────────────

function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: EVModel;
  selected: boolean;
  onSelect: (m: EVModel) => void;
}) {
  const isTogg = model.brand === "Togg";
  return (
    <TouchableOpacity
      style={[
        styles.modelCard,
        isTogg && styles.modelCardTogg,
        selected && styles.modelCardSelected,
      ]}
      onPress={() => onSelect(model)}
      activeOpacity={0.75}
    >
      {isTogg && <Text style={styles.modelCardFlag}>🇹🇷</Text>}
      <Ionicons
        name="car"
        size={22}
        color={isTogg ? "#F59E0B" : selected ? "#00D26A" : "#9CA3AF"}
        style={{ marginBottom: 6 }}
      />
      <Text style={[styles.modelCardBrand, isTogg && { color: "#F59E0B" }]}>
        {model.brand}
      </Text>
      <Text style={styles.modelCardName}>{model.model}</Text>
      <Text style={styles.modelCardStat}>🏁 {model.range_km} km</Text>
      <Text style={styles.modelCardStat}>⚡ {model.battery_kwh} kWh</Text>
      {selected && (
        <View style={styles.modelCardCheck}>
          <Ionicons name="checkmark-circle" size={18} color="#00D26A" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VehiclesScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedModel, setSelectedModel] = useState<EVModel | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [saving, setSaving] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────

  const {
    data: vehicles = [],
    isLoading,
    isError,
  } = useQuery<DBVehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DBVehicle[];
    },
    enabled: !!user,
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(vehicleId: string) {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);
    if (error) {
      Alert.alert("Hata", "Araç silinirken bir sorun oluştu.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  }

  // ── Add ────────────────────────────────────────────────────────────────────

  function openModal() {
    setStep(1);
    setSelectedModel(null);
    setSelectedYear(2024);
    setModalVisible(true);
  }

  function handleModelSelect(model: EVModel) {
    setSelectedModel(model);
    setStep(2);
  }

  async function handleSave() {
    if (!selectedModel || !user) return;
    setSaving(true);
    try {
      type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
      const payload: VehicleInsert = {
        user_id: user.id,
        brand: selectedModel.brand,
        model: selectedModel.model,
        year: selectedYear,
        battery_capacity_kwh: selectedModel.battery_kwh,
        connector_types: selectedModel.connector_types,
        range_km: selectedModel.range_km,
        max_charge_kw: selectedModel.max_charge_kw,
        is_togg: selectedModel.brand === "Togg",
      };
      const { error } = await supabase.from("vehicles").insert(payload);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setModalVisible(false);
    } catch {
      Alert.alert(
        "Hata",
        "Araç eklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Araçlarım</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openModal}
          hitSlop={8}
        >
          <Ionicons name="add" size={24} color="#00D26A" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00D26A" />
          <Text style={styles.loadingText}>Araçlar yükleniyor…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Araçlar yüklenemedi</Text>
        </View>
      ) : vehicles.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="car-outline" size={56} color="#374151" />
          </View>
          <Text style={styles.emptyTitle}>Henüz araç yok</Text>
          <Text style={styles.emptySubtitle}>
            Türkiye'nin en popüler EV modellerinden seçin ve şarj deneyiminizi
            kişiselleştirin.
          </Text>
          <TouchableOpacity style={styles.emptyAddButton} onPress={openModal}>
            <Ionicons name="add-circle-outline" size={20} color="#0F1117" />
            <Text style={styles.emptyAddButtonText}>Araç Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VehicleCard vehicle={item} onDelete={handleDelete} />
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.addMoreButton} onPress={openModal}>
              <Ionicons name="add-circle-outline" size={20} color="#00D26A" />
              <Text style={styles.addMoreButtonText}>Araç Ekle</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* ── Add Vehicle Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            {step === 2 ? (
              <TouchableOpacity onPress={() => setStep(1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={styles.modalTitle}>
              {step === 1 ? "Model Seç" : "Yıl Seç"}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>

          {/* ── Step 1: Model ── */}
          {step === 1 && (
            <FlatList
              data={sortedModels}
              keyExtractor={(item) => `${item.brand}-${item.model}`}
              numColumns={2}
              contentContainerStyle={styles.modelGrid}
              columnWrapperStyle={styles.modelGridRow}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={styles.stepHint}>
                  Aracınızı seçin — Togg araçları Trugo ağında öncelikli şarj
                  sunar 🇹🇷
                </Text>
              }
              renderItem={({ item }) => (
                <ModelCard
                  model={item}
                  selected={
                    selectedModel?.brand === item.brand &&
                    selectedModel?.model === item.model
                  }
                  onSelect={handleModelSelect}
                />
              )}
            />
          )}

          {/* ── Step 2: Year ── */}
          {step === 2 && selectedModel && (
            <ScrollView
              contentContainerStyle={styles.yearStepContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Selected model summary */}
              <View
                style={[
                  styles.selectedModelCard,
                  selectedModel.brand === "Togg" &&
                    styles.selectedModelCardTogg,
                ]}
              >
                <View style={styles.selectedModelLeft}>
                  <Ionicons
                    name="car"
                    size={32}
                    color={
                      selectedModel.brand === "Togg" ? "#F59E0B" : "#00D26A"
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedModelBrand}>
                    {selectedModel.brand === "Togg" ? "🇹🇷 " : ""}
                    {selectedModel.brand}
                  </Text>
                  <Text style={styles.selectedModelName}>
                    {selectedModel.model}
                  </Text>
                  <View style={styles.vehicleStats}>
                    <Text style={styles.vehicleStat}>
                      ⚡ {selectedModel.battery_kwh} kWh
                    </Text>
                    <Text style={styles.vehicleStat}>
                      🏁 {selectedModel.range_km} km
                    </Text>
                    <Text style={styles.vehicleStat}>
                      ⚡ {selectedModel.max_charge_kw} kW maks
                    </Text>
                  </View>
                  <View style={styles.connectorRow}>
                    {selectedModel.connector_types.map((c) => (
                      <ConnectorBadge key={c} type={c} />
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.yearTitle}>Model Yılı</Text>
              <View style={styles.yearsGrid}>
                {YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearChip,
                      selectedYear === year && styles.yearChipSelected,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        selectedYear === year && styles.yearChipTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0F1117" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#0F1117"
                    />
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#00D26A20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A40",
  },

  // States
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#6B7280", fontSize: 14 },
  errorText: { color: "#EF4444", fontSize: 15, fontWeight: "500" },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyAddButtonText: { color: "#0F1117", fontSize: 16, fontWeight: "700" },

  // List
  listContent: { padding: 16, gap: 12 },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
    borderStyle: "dashed",
  },
  addMoreButtonText: { color: "#00D26A", fontSize: 15, fontWeight: "600" },

  // Vehicle card
  vehicleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  vehicleCardTogg: { borderColor: "#F59E0B40", backgroundColor: "#1C1E10" },
  vehicleIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#00D26A15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A30",
    marginTop: 2,
  },
  vehicleIconWrapperTogg: {
    backgroundColor: "#F59E0B15",
    borderColor: "#F59E0B30",
  },
  vehicleInfo: { flex: 1, gap: 4 },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleName: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  vehicleYear: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  vehicleStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  vehicleStat: { fontSize: 12, color: "#9CA3AF" },
  connectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  connectorBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  connectorBadgeText: { fontSize: 11, fontWeight: "600" },
  toggBadge: {
    backgroundColor: "#F59E0B20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#F59E0B40",
  },
  toggBadgeText: { fontSize: 10, fontWeight: "700", color: "#F59E0B" },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EF444415",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#0F1117" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },

  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  stepDotActive: { backgroundColor: "#00D26A", borderColor: "#00D26A" },
  stepLine: { width: 40, height: 2, backgroundColor: "#374151" },

  stepHint: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Model grid
  modelGrid: { paddingHorizontal: 12, paddingBottom: 24 },
  modelGridRow: { gap: 10, marginBottom: 10 },
  modelCard: {
    flex: 1,
    backgroundColor: "#1A2332",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
    alignItems: "center",
    position: "relative",
  },
  modelCardTogg: { borderColor: "#F59E0B60", backgroundColor: "#1C1E10" },
  modelCardSelected: { borderColor: "#00D26A", backgroundColor: "#00D26A10" },
  modelCardFlag: { position: "absolute", top: 8, right: 8, fontSize: 14 },
  modelCardBrand: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  modelCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  modelCardStat: { fontSize: 11, color: "#6B7280", lineHeight: 18 },
  modelCardCheck: { position: "absolute", top: 8, left: 8 },

  // Year step
  yearStepContent: { padding: 20, gap: 20 },
  selectedModelCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    alignItems: "flex-start",
  },
  selectedModelCardTogg: {
    borderColor: "#F59E0B40",
    backgroundColor: "#1C1E10",
  },
  selectedModelLeft: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#00D26A15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  selectedModelBrand: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 2,
  },
  selectedModelName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  yearTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  yearsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  yearChip: {
    flex: 1,
    minWidth: "28%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1A2332",
    borderWidth: 1,
    borderColor: "#2D3748",
    alignItems: "center",
  },
  yearChipSelected: { backgroundColor: "#00D26A20", borderColor: "#00D26A" },
  yearChipText: { fontSize: 16, fontWeight: "600", color: "#9CA3AF" },
  yearChipTextSelected: { color: "#00D26A" },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#00D26A",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: "700", color: "#0F1117" },
});
