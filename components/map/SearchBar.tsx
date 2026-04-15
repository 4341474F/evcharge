import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChargingStation } from '../../types/station';

interface SearchBarProps {
  stations: ChargingStation[];
  onSelect: (station: ChargingStation) => void;
}

export function SearchBar({ stations, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = query.trim().length >= 2
    ? stations.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.city.toLowerCase().includes(query.toLowerCase()) ||
        s.address.toLowerCase().includes(query.toLowerCase()) ||
        s.network.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelect = useCallback((station: ChargingStation) => {
    setQuery('');
    setIsFocused(false);
    onSelect(station);
  }, [onSelect]);

  const handleClear = () => {
    setQuery('');
    setIsFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
        <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="İstasyon, şehir veya ağ ara..."
          placeholderTextColor="#4B5563"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {isFocused && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="flash" size={14} color="#00D26A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultMeta}>{item.network} · {item.city}</Text>
                </View>
                <View style={[
                  styles.availBadge,
                  item.totalAvailable > 0 ? styles.availBadgeGreen : styles.availBadgeGray,
                ]}>
                  <Text style={[
                    styles.availText,
                    item.totalAvailable > 0 ? styles.availTextGreen : styles.availTextGray,
                  ]}>
                    {item.totalAvailable}/{item.totalConnectors}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      {isFocused && query.trim().length >= 2 && results.length === 0 && (
        <View style={styles.dropdown}>
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>"{query}" için sonuç bulunamadı</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 8,
    zIndex: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingHorizontal: 12,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inputRowFocused: {
    borderColor: '#00D26A60',
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearBtn: { padding: 4 },
  dropdown: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  resultIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#00D26A15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  resultMeta: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  availBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  availBadgeGreen: { backgroundColor: '#064E3B' },
  availBadgeGray: { backgroundColor: '#1F2937' },
  availText: { fontSize: 11, fontWeight: '700' },
  availTextGreen: { color: '#00D26A' },
  availTextGray: { color: '#4B5563' },
  separator: { height: 1, backgroundColor: '#1F2937' },
  noResults: { padding: 16 },
  noResultsText: { color: '#4B5563', fontSize: 13, textAlign: 'center' },
});
