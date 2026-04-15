import { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocation } from '../../hooks/useLocation';
import { useNearbyStations } from '../../hooks/useNearbyStations';
import { useMapStore } from '../../stores/mapStore';
import { useSessionStore } from '../../stores/sessionStore';
import { StationMarker } from '../../components/map/StationMarker';
import { FilterBar } from '../../components/map/FilterBar';
import { StationDetailSheet } from '../../components/station/StationDetailSheet';
import type { ChargingStation } from '../../types/station';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);

  const { location, isLoading: locationLoading } = useLocation();
  const { filter, selectedStation, selectStation, setBottomSheetOpen } = useMapStore();
  const { activeSession } = useSessionStore();
  const { stations, isLoading, isError, refetch } = useNearbyStations(
    location.latitude,
    location.longitude,
    filter,
  );

  useEffect(() => {
    if (selectedStation) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedStation]);

  const handleMarkerPress = useCallback((station: ChargingStation) => {
    selectStation(station);
  }, [selectStation]);

  const handleMapPress = useCallback(() => {
    selectStation(null);
    bottomSheetRef.current?.close();
  }, [selectStation]);

  const centerOnUser = useCallback(() => {
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }, [location]);

  const initialRegion: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
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
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={DARK_MAP_STYLE}
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

      {/* Filter bar — absolute top */}
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <FilterBar />
      </SafeAreaView>

      {/* Loading / error overlay */}
      {(isLoading || locationLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#00D26A" size="large" />
          <Text style={styles.loadingText}>İstasyonlar yükleniyor…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Veri yüklenemedi</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Station count badge */}
      {!isLoading && (
        <View style={styles.countBadge}>
          <Ionicons name="flash" size={14} color="#00D26A" />
          <Text style={styles.countText}>{stations.length} istasyon</Text>
        </View>
      )}

      {/* Center on user button */}
      <TouchableOpacity style={styles.locateBtn} onPress={centerOnUser}>
        <Ionicons name="locate" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Active session banner */}
      {activeSession && (
        <TouchableOpacity
          style={styles.sessionBanner}
          onPress={() => router.push('/session/active')}
        >
          <View style={styles.sessionDot} />
          <Text style={styles.sessionText}>Aktif Şarj: {activeSession.stationName}</Text>
          <Ionicons name="chevron-forward" size={16} color="#00D26A" />
        </TouchableOpacity>
      )}

      {/* Station detail bottom sheet */}
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
  container: { flex: 1, backgroundColor: '#0F1117' },
  map: { flex: 1 },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  loadingOverlay: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: '#1A2332EE',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#D1D5DB', fontSize: 14 },
  errorBanner: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#7F1D1D',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: { color: '#FECACA', fontSize: 14 },
  retryBtn: { backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  countBadge: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    backgroundColor: '#1A2332DD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  countText: { color: '#D1D5DB', fontSize: 12 },
  locateBtn: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  sessionBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 72,
    backgroundColor: '#064E3B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#00D26A40',
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D26A' },
  sessionText: { flex: 1, color: '#D1FAE5', fontSize: 13, fontWeight: '500' },
});

// Dark map style for Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0F1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1117' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A2332' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212A37' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2D3748' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1321' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1A2332' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1A2332' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },
];
