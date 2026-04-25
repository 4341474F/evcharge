import { View, Text, StyleSheet } from "react-native";
import type {
  ConnectorType,
  StationStatus,
  ChargerTier,
} from "../../types/station";

const CONNECTOR_COLORS: Record<ConnectorType, string> = {
  CCS2: "#3B82F6",
  CHAdeMO: "#F59E0B",
  Type2: "#8B5CF6",
  Type1: "#6B7280",
  Schuko: "#EC4899",
  Tesla: "#EF4444",
  GBT: "#60A5FA",
};

const STATUS_COLORS: Record<StationStatus, string> = {
  available: "#00D26A",
  occupied: "#F59E0B",
  out_of_service: "#EF4444",
  unknown: "#6B7280",
};

interface ConnectorBadgeProps {
  type: ConnectorType;
  powerKw: number;
  status: StationStatus;
  tier?: ChargerTier;
  pricePerKwh?: number | null;
  pricePerKwhHPC?: number | null;
}

export function ConnectorBadge({
  type,
  powerKw,
  status,
  tier,
  pricePerKwh,
  pricePerKwhHPC,
}: ConnectorBadgeProps) {
  const color = CONNECTOR_COLORS[type];
  const isHPC = tier === "HPC";

  const priceLabel = (() => {
    if (pricePerKwh != null && pricePerKwhHPC != null) {
      return `₺${pricePerKwh}/kWh  HPC:₺${pricePerKwhHPC}`;
    }
    if (pricePerKwhHPC != null) {
      return `₺${pricePerKwhHPC}/kWh`;
    }
    if (pricePerKwh != null) {
      return `₺${pricePerKwh}/kWh`;
    }
    return null;
  })();

  return (
    <View style={[styles.container, { borderColor: color + "40" }]}>
      {/* HPC badge — top right corner */}
      {isHPC && (
        <View style={styles.hpcBadge}>
          <Text style={styles.hpcBadgeText}>HPC</Text>
        </View>
      )}

      <View style={styles.row}>
        <View
          style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]}
        />
        <Text style={[styles.type, { color }]}>{type}</Text>
        <Text style={styles.power}>{powerKw > 0 ? `${powerKw} kW` : "—"}</Text>
      </View>

      {priceLabel && (
        <Text style={styles.price} numberOfLines={1}>
          {priceLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0F1117",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
    minWidth: 90,
    // relative positioning so the HPC badge can be placed at top-right
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  type: {
    fontSize: 12,
    fontWeight: "600",
  },
  power: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  price: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  hpcBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: "#F59E0B",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  hpcBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#0F1117",
    letterSpacing: 0.4,
  },
});
