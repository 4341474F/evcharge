import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMapStore } from "../../stores/mapStore";
import type {
  NetworkName,
  ConnectorType,
  StationFilter,
} from "../../types/station";

const NETWORKS: (NetworkName | "Tümü")[] = [
  "Tümü",
  "ZES",
  "Eşarj",
  "Trugo",
  "Voltrun",
  "WAT",
  "5şarj",
  "EnYakıt",
];
const CONNECTORS: (ConnectorType | "Tümü")[] = [
  "Tümü",
  "CCS2",
  "CHAdeMO",
  "Type2",
  "Tesla",
  "GBT",
];

function countActiveFilters(filter: StationFilter): number {
  let count = 0;
  if (filter.network !== "Tümü") count++;
  if (filter.connectorType !== "Tümü") count++;
  if (filter.onlyAvailable) count++;
  if (filter.onlyGreenEnergy) count++;
  if (filter.onlyHPC) count++;
  if (filter.locationType !== "Tümü") count++;
  if (filter.minPowerKw > 0) count++;
  return count;
}

export function FilterBar() {
  const { filter, setFilter, resetFilter } = useMapStore();
  const activeCount = countActiveFilters(filter);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Sıfırla butonu — sadece aktif filtre varsa göster */}
        {activeCount > 0 && (
          <>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetFilter}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close-circle" size={14} color="#EF4444" />
              <Text style={styles.resetBtnText}>Sıfırla</Text>
              <View style={styles.resetCountBadge}>
                <Text style={styles.resetCountText}>{activeCount}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        )}

        {/* Network filter */}
        {NETWORKS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.chip, filter.network === n && styles.chipActive]}
            onPress={() => setFilter({ network: n })}
          >
            <Text
              style={[
                styles.chipText,
                filter.network === n && styles.chipTextActive,
              ]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Connector filter */}
        {CONNECTORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.chip,
              filter.connectorType === c && styles.chipActive,
            ]}
            onPress={() => setFilter({ connectorType: c })}
          >
            <Text
              style={[
                styles.chipText,
                filter.connectorType === c && styles.chipTextActive,
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Only available */}
        <TouchableOpacity
          style={[styles.chip, filter.onlyAvailable && styles.chipAvailable]}
          onPress={() => setFilter({ onlyAvailable: !filter.onlyAvailable })}
        >
          <Text
            style={[
              styles.chipText,
              filter.onlyAvailable && styles.chipTextActive,
            ]}
          >
            Sadece Müsait
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Green energy */}
        <TouchableOpacity
          style={[styles.chip, filter.onlyGreenEnergy && styles.chipGreen]}
          onPress={() =>
            setFilter({ onlyGreenEnergy: !filter.onlyGreenEnergy })
          }
        >
          <Text
            style={[
              styles.chipText,
              filter.onlyGreenEnergy && styles.chipTextGreen,
            ]}
          >
            🌱 Yeşil Şarj
          </Text>
        </TouchableOpacity>

        {/* HPC */}
        <TouchableOpacity
          style={[styles.chip, filter.onlyHPC && styles.chipHPC]}
          onPress={() => setFilter({ onlyHPC: !filter.onlyHPC })}
        >
          <Text style={[styles.chipText, filter.onlyHPC && styles.chipTextHPC]}>
            ⚡ HPC (150kW+)
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Location: Otoyol */}
        <TouchableOpacity
          style={[
            styles.chip,
            filter.locationType === "highway" && styles.chipLocation,
          ]}
          onPress={() =>
            setFilter({
              locationType:
                filter.locationType === "highway" ? "Tümü" : "highway",
            })
          }
        >
          <Text
            style={[
              styles.chipText,
              filter.locationType === "highway" && styles.chipTextLocation,
            ]}
          >
            🛣️ Otoyol
          </Text>
        </TouchableOpacity>

        {/* Location: AVM */}
        <TouchableOpacity
          style={[
            styles.chip,
            filter.locationType === "mall" && styles.chipLocation,
          ]}
          onPress={() =>
            setFilter({
              locationType: filter.locationType === "mall" ? "Tümü" : "mall",
            })
          }
        >
          <Text
            style={[
              styles.chipText,
              filter.locationType === "mall" && styles.chipTextLocation,
            ]}
          >
            🏬 AVM
          </Text>
        </TouchableOpacity>

        {/* Location: Akaryakıt */}
        <TouchableOpacity
          style={[
            styles.chip,
            filter.locationType === "gas_station" && styles.chipLocation,
          ]}
          onPress={() =>
            setFilter({
              locationType:
                filter.locationType === "gas_station" ? "Tümü" : "gas_station",
            })
          }
        >
          <Text
            style={[
              styles.chipText,
              filter.locationType === "gas_station" && styles.chipTextLocation,
            ]}
          >
            ⛽ Akaryakıt
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  // Reset butonu
  resetBtn: {
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
  resetBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  resetCountBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  resetCountText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // Chip
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#1A2332CC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  chipActive: {
    backgroundColor: "#00D26A",
    borderColor: "#00D26A",
  },
  chipAvailable: {
    backgroundColor: "#00D26A",
    borderColor: "#00D26A",
  },
  chipGreen: {
    backgroundColor: "#065F46",
    borderColor: "#00D26A",
  },
  chipHPC: {
    backgroundColor: "#78350F",
    borderColor: "#F59E0B",
  },
  chipLocation: {
    backgroundColor: "#1E3A5F",
    borderColor: "#3B82F6",
  },

  // Chip text
  chipText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#0F1117",
    fontWeight: "700",
  },
  chipTextGreen: {
    color: "#00D26A",
    fontWeight: "700",
  },
  chipTextHPC: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  chipTextLocation: {
    color: "#3B82F6",
    fontWeight: "700",
  },

  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#374151",
  },
});
