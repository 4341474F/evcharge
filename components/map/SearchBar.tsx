import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchAllTurkeyStations } from "../../lib/ocm/client";
import type { ChargingStation } from "../../types/station";

interface SearchBarProps {
  stations: ChargingStation[]; // harita için hâlâ kullanılan yakın istasyonlar (fallback)
  onSelect: (station: ChargingStation) => void;
}

export function SearchBar({ stations, onSelect }: SearchBarProps) {
  // Tüm Türkiye verisi — arama için
  const [allStations, setAllStations] = useState<ChargingStation[]>(stations);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSearchLoading(true);
    fetchAllTurkeyStations()
      .then((data) => {
        if (!cancelled) setAllStations(data);
      })
      .catch(() => {
        if (!cancelled) setAllStations(stations);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const results =
    query.trim().length >= 2
      ? allStations
          .filter(
            (s) =>
              s.name.toLowerCase().includes(query.toLowerCase()) ||
              s.city.toLowerCase().includes(query.toLowerCase()) ||
              s.address.toLowerCase().includes(query.toLowerCase()) ||
              s.network.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  const handleSelect = useCallback(
    (station: ChargingStation) => {
      // Blur timeout'u iptal et — dropdown kapanmasın
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setQuery("");
      setIsFocused(false);
      inputRef.current?.blur();
      onSelect(station);
    },
    [onSelect],
  );

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Uzun timeout — tıklama olursa handleSelect iptal eder
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
    }, 300);
  }, []);

  const handleClear = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
  }, []);

  const showDropdown = isFocused && query.trim().length >= 2;
  const showResults = showDropdown && results.length > 0;
  const showEmpty = showDropdown && results.length === 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
        <Ionicons
          name="search"
          size={18}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="İstasyon, şehir veya ağ ara..."
          placeholderTextColor="#4B5563"
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (results.length > 0) {
              handleSelect(results[0]);
            }
          }}
        />
        {searchLoading && query.length === 0 && (
          <ActivityIndicator
            size="small"
            color="#4B5563"
            style={{ marginRight: 4 }}
          />
        )}
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            scrollEnabled={results.length > 5}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="flash" size={14} color="#00D26A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {item.network} · {item.city}
                  </Text>
                </View>
                <View
                  style={[
                    styles.availBadge,
                    item.totalAvailable > 0
                      ? styles.availBadgeGreen
                      : styles.availBadgeGray,
                  ]}
                >
                  <Text
                    style={[
                      styles.availText,
                      item.totalAvailable > 0
                        ? styles.availTextGreen
                        : styles.availTextGray,
                    ]}
                  >
                    {item.totalAvailable}/{item.totalConnectors}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      {showEmpty && (
        <View style={styles.dropdown}>
          <View style={styles.noResults}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#374151"
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.noResultsText}>
              "{query}" için sonuç bulunamadı
            </Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D3748",
    paddingHorizontal: 12,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inputRowFocused: {
    borderColor: "#00D26A60",
    backgroundColor: "#1F2D40",
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  clearBtn: { padding: 4 },
  dropdown: {
    backgroundColor: "#1A2332",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#00D26A15",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  resultName: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  resultMeta: { color: "#6B7280", fontSize: 11, marginTop: 2 },
  availBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  availBadgeGreen: { backgroundColor: "#064E3B" },
  availBadgeGray: { backgroundColor: "#1F2937" },
  availText: { fontSize: 11, fontWeight: "700" },
  availTextGreen: { color: "#00D26A" },
  availTextGray: { color: "#4B5563" },
  separator: { height: 1, backgroundColor: "#1F2937" },
  noResults: { padding: 20, alignItems: "center" },
  noResultsText: { color: "#4B5563", fontSize: 13, textAlign: "center" },
});
