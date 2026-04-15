import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useMapStore } from '../../stores/mapStore';
import type { NetworkName, ConnectorType } from '../../types/station';

const NETWORKS: (NetworkName | 'Tümü')[] = ['Tümü', 'ZES', 'Eşarj', 'Trugo', 'Voltrun'];
const CONNECTORS: (ConnectorType | 'Tümü')[] = ['Tümü', 'CCS2', 'CHAdeMO', 'Type2'];

export function FilterBar() {
  const { filter, setFilter } = useMapStore();

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {/* Network filter */}
        {NETWORKS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.chip, filter.network === n && styles.chipActive]}
            onPress={() => setFilter({ network: n })}
          >
            <Text style={[styles.chipText, filter.network === n && styles.chipTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Connector filter */}
        {CONNECTORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, filter.connectorType === c && styles.chipActive]}
            onPress={() => setFilter({ connectorType: c })}
          >
            <Text style={[styles.chipText, filter.connectorType === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Only available */}
        <TouchableOpacity
          style={[styles.chip, filter.onlyAvailable && styles.chipAvailable]}
          onPress={() => setFilter({ onlyAvailable: !filter.onlyAvailable })}
        >
          <Text style={[styles.chipText, filter.onlyAvailable && styles.chipTextActive]}>
            Sadece Müsait
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1A2332CC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  chipActive: {
    backgroundColor: '#00D26A',
    borderColor: '#00D26A',
  },
  chipAvailable: {
    backgroundColor: '#00D26A',
    borderColor: '#00D26A',
  },
  chipText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#0F1117',
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#374151',
  },
});
