import { useRef, useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocation } from "../../hooks/useLocation";
import { useNearbyStations } from "../../hooks/useNearbyStations";
import { useMapStore } from "../../stores/mapStore";
import { useSessionStore } from "../../stores/sessionStore";
import { StationMarker } from "../../components/map/StationMarker";
import { FilterBar } from "../../components/map/FilterBar";
import { SearchBar } from "../../components/map/SearchBar";
import { ZoomControls } from "../../components/map/ZoomControls";
import { StationDetailSheet } from "../../components/station/StationDetailSheet";
import type { BottomSheetHandle } from "../../components/ui/BottomSheet";
import type { ChargingStation } from "../../types/station";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);
  const currentRegion = useRef<Region | null>(null);
  const locationRef = useRef({ latitude: 39.9334, longitude: 32.8597 });
  const [mapReady, setMapReady] = useState(false);

  const {
    location,
    isRealLocation,
    isLoading: locationLoading,
  } = useLocation();
  const { filter, selectedStation, selectStation, setBottomSheetOpen } =
    useMapStore();
  const { activeSession } = useSessionStore();
  const { stations, isLoading, isError, refetch } = useNearbyStations(
    location.latitude,
    location.longitude,
    filter,
  );

  const handleMarkerPress = useCallback(
    (station: ChargingStation) => {
      selectStation(station);
      bottomSheetRef.current?.expand();
    },
    [selectStation],
  );

  const handleMapPress = useCallback(() => {
    bottomSheetRef.current?.close();
    selectStation(null);
  }, [selectStation]);

  const handleSearchSelect = useCallback(
    (station: ChargingStation) => {
      selectStation(station);
      bottomSheetRef.current?.expand();
      mapRef.current?.animateToRegion(
        {
          latitude: station.latitude,
          longitude: station.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
    },
    [selectStation],
  );

  const handleRegionChange = useCallback((region: Region) => {
    currentRegion.current = region;
  }, []);

  // locationRef'i her zaman güncel tut (stale closure'ı önler)
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Harita hazır olunca ve/veya gerçek konum gelince animasyon yap
  useEffect(() => {
    if (!isRealLocation || !mapReady) return;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      800,
    );
  }, [isRealLocation, mapReady, location.latitude, location.longitude]);

  const handleZoomIn = useCallback(() => {
    const loc = locationRef.current;
    const r = currentRegion.current ?? {
      latitude: loc.latitude,
      longitude: loc.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
    mapRef.current?.animateToRegion(
      {
        ...r,
        latitudeDelta: r.latitudeDelta / 2,
        longitudeDelta: r.longitudeDelta / 2,
      },
      250,
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    const loc = locationRef.current;
    const r = currentRegion.current ?? {
      latitude: loc.latitude,
      longitude: loc.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
    mapRef.current?.animateToRegion(
      {
        ...r,
        latitudeDelta: Math.min(r.latitudeDelta * 2, 80),
        longitudeDelta: Math.min(r.longitudeDelta * 2, 80),
      },
      250,
    );
  }, []);

  const handleLocate = useCallback(() => {
    const loc = locationRef.current;
    const r = currentRegion.current;
    mapRef.current?.animateToRegion(
      {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: r && r.latitudeDelta < 0.5 ? r.latitudeDelta : 0.05,
        longitudeDelta: r && r.longitudeDelta < 0.5 ? r.longitudeDelta : 0.05,
      },
      500,
    );
  }, []);

  // Harita her zaman mevcut konum (veya Ankara default) ile başlar,
  // Google'ın San Francisco default'unu engeller
  const initialRegion: Region = {
    latitude: locationRef.current.latitude,
    longitude: locationRef.current.longitude,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setMapReady(true)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        customMapStyle={DARK_MAP_STYLE}
        zoomEnabled
        scrollEnabled
        rotateEnabled={false}
      >
        {stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            onPress={handleMarkerPress}
            isSelected={selectedStation?.id === station.id}
          />
        ))}
      </MapView>

      {/* Top: search + filter */}
      <SafeAreaView style={styles.topControls} edges={["top"]}>
        <SearchBar stations={stations} onSelect={handleSearchSelect} />
        <FilterBar />
      </SafeAreaView>

      {/* Loading */}
      {(isLoading || locationLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#00D26A" size="small" />
          <Text style={styles.loadingText}>İstasyonlar yükleniyor…</Text>
        </View>
      )}

      {/* Error */}
      {isError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#FECACA" />
          <Text style={styles.errorText}>Demo veri gösteriliyor</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Right controls: zoom + locate */}
      <View style={styles.rightControls}>
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocate={handleLocate}
        />
      </View>

      {/* Station count */}
      {!isLoading && (
        <View style={styles.countBadge}>
          <Ionicons name="flash" size={13} color="#00D26A" />
          <Text style={styles.countText}>{stations.length} istasyon</Text>
        </View>
      )}

      {/* Active session banner */}
      {activeSession && (
        <TouchableOpacity
          style={styles.sessionBanner}
          onPress={() => router.push("/session/active")}
        >
          <View style={styles.sessionDot} />
          <Text style={styles.sessionText} numberOfLines={1}>
            Aktif Şarj: {activeSession.stationName}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#00D26A" />
        </TouchableOpacity>
      )}

      {/* Station detail sheet */}
      <StationDetailSheet
        ref={bottomSheetRef}
        station={selectedStation}
        onClose={() => {
          selectStation(null);
          setBottomSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  map: { flex: 1 },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  rightControls: {
    position: "absolute",
    right: 12,
    bottom: 150,
  },
  loadingOverlay: {
    position: "absolute",
    bottom: 130,
    alignSelf: "center",
    backgroundColor: "#1A2332EE",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  loadingText: { color: "#D1D5DB", fontSize: 13 },
  errorBanner: {
    position: "absolute",
    top: 140,
    left: 12,
    right: 12,
    backgroundColor: "#7F1D1DCC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  errorText: { color: "#FECACA", fontSize: 12, flex: 1 },
  retryBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EF444430",
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    position: "absolute",
    bottom: 100,
    left: 12,
    backgroundColor: "#1A2332DD",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  countText: { color: "#D1D5DB", fontSize: 12 },
  sessionBanner: {
    position: "absolute",
    bottom: 90,
    left: 12,
    right: 68,
    backgroundColor: "#064E3B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D26A",
  },
  sessionText: { flex: 1, color: "#D1FAE5", fontSize: 13, fontWeight: "500" },
});

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0F1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6B7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0F1117" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1A2332" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212A37" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2D3748" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0D1321" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1A2332" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1A2332" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#374151" }],
  },
];
