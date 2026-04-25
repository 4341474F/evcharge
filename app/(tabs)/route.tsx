import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { POPULAR_EV_MODELS, type EVModel } from "../../types/user";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase/client";

// ─── Türkiye şehir verileri ───────────────────────────────────────────────────
interface CityData {
  name: string;
  lat: number;
  lon: number;
}

const TR_CITIES: CityData[] = [
  { name: "İstanbul", lat: 41.0082, lon: 28.9784 },
  { name: "Ankara", lat: 39.9208, lon: 32.8541 },
  { name: "İzmir", lat: 38.4192, lon: 27.1287 },
  { name: "Bursa", lat: 40.1826, lon: 29.0665 },
  { name: "Antalya", lat: 36.8841, lon: 30.7056 },
  { name: "Adana", lat: 37.0, lon: 35.3213 },
  { name: "Konya", lat: 37.8746, lon: 32.4932 },
  { name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
  { name: "Trabzon", lat: 41.0015, lon: 39.7178 },
  { name: "Kayseri", lat: 38.7312, lon: 35.4787 },
];

// ─── Durak tipi ───────────────────────────────────────────────────────────────
interface StopInfo {
  stationId: string;
  stationName: string;
  network: string;
  powerKw: number;
  city: string;
  distanceFromStart: number; // km
  chargeNeededKwh: number;
  chargeTimeMin: number;
  costTl: number;
  pricePerKwh: number;
  isGreenEnergy: boolean;
  lat: number;
  lon: number;
}

interface RouteResult {
  totalDistanceKm: number;
  travelTimeMin: number;
  stops: StopInfo[];
  totalChargeCost: number;
  totalChargeKwh: number;
  co2SavedKg: number;
  fuelSavedLiters: number;
}

// ─── Sabit demo otoyol istasyonları ──────────────────────────────────────────
const HIGHWAY_STATIONS = [
  {
    id: "zes-003",
    name: "ZES - İstanbul TEM Avrupa",
    network: "ZES",
    powerKw: 350,
    city: "İstanbul",
    lat: 41.0531,
    lon: 28.8346,
    pricePerKwh: 16.49,
    isGreenEnergy: false,
  },
  {
    id: "enyakut-tem-bolu",
    name: "EnYakıt - TEM Bolu",
    network: "EnYakıt",
    powerKw: 200,
    city: "Bolu",
    lat: 40.7395,
    lon: 31.6061,
    pricePerKwh: 14.5,
    isGreenEnergy: false,
  },
  {
    id: "trugo-gebze",
    name: "Trugo - Shell Gebze",
    network: "Trugo",
    powerKw: 180,
    city: "Gebze",
    lat: 40.7976,
    lon: 29.4313,
    pricePerKwh: 15.36,
    isGreenEnergy: false,
  },
  {
    id: "zes-ankara-kizilav",
    name: "ZES - Ankara Kızılay",
    network: "ZES",
    powerKw: 150,
    city: "Ankara",
    lat: 39.9199,
    lon: 32.8543,
    pricePerKwh: 16.49,
    isGreenEnergy: false,
  },
  {
    id: "esarj-afyon",
    name: "Eşarj - Afyon Otoban",
    network: "Eşarj",
    powerKw: 150,
    city: "Afyonkarahisar",
    lat: 38.7637,
    lon: 30.5404,
    pricePerKwh: 13.5,
    isGreenEnergy: true,
  },
  {
    id: "zes-izmir-cesme",
    name: "ZES - İzmir Çeşme Yolu",
    network: "ZES",
    powerKw: 180,
    city: "İzmir",
    lat: 38.4192,
    lon: 27.1287,
    pricePerKwh: 16.49,
    isGreenEnergy: false,
  },
  {
    id: "trugo-bursa",
    name: "Trugo - Bursa Otoyol",
    network: "Trugo",
    powerKw: 180,
    city: "Bursa",
    lat: 40.1826,
    lon: 29.0665,
    pricePerKwh: 15.36,
    isGreenEnergy: false,
  },
  {
    id: "esarj-konya",
    name: "Eşarj - Konya Merkez",
    network: "Eşarj",
    powerKw: 120,
    city: "Konya",
    lat: 37.8746,
    lon: 32.4932,
    pricePerKwh: 13.5,
    isGreenEnergy: true,
  },
  {
    id: "zes-antalya",
    name: "ZES - Antalya Otoyol",
    network: "ZES",
    powerKw: 150,
    city: "Antalya",
    lat: 36.8841,
    lon: 30.7056,
    pricePerKwh: 16.49,
    isGreenEnergy: false,
  },
  {
    id: "enyakut-adana",
    name: "EnYakıt - Adana TEM",
    network: "EnYakıt",
    powerKw: 200,
    city: "Adana",
    lat: 37.0,
    lon: 35.3213,
    pricePerKwh: 14.5,
    isGreenEnergy: false,
  },
];

// ─── Haversine mesafe hesabı ──────────────────────────────────────────────────
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Demo rota tablosu ───────────────────────────────────────────────────────
const DEMO_ROUTES: Record<string, { distanceKm: number; stopIds: string[] }> = {
  "İstanbul-Ankara": {
    distanceKm: 450,
    stopIds: ["enyakut-tem-bolu"],
  },
  "Ankara-İstanbul": {
    distanceKm: 450,
    stopIds: ["enyakut-tem-bolu"],
  },
  "İstanbul-İzmir": {
    distanceKm: 480,
    stopIds: ["trugo-gebze"],
  },
  "İzmir-İstanbul": {
    distanceKm: 480,
    stopIds: ["trugo-gebze"],
  },
  "Ankara-İzmir": {
    distanceKm: 590,
    stopIds: ["esarj-afyon", "zes-izmir-cesme"],
  },
  "İzmir-Ankara": {
    distanceKm: 590,
    stopIds: ["esarj-afyon", "zes-ankara-kizilav"],
  },
  "İstanbul-Bursa": {
    distanceKm: 155,
    stopIds: [],
  },
  "Bursa-İstanbul": {
    distanceKm: 155,
    stopIds: [],
  },
  "Ankara-Antalya": {
    distanceKm: 480,
    stopIds: ["esarj-konya"],
  },
  "Antalya-Ankara": {
    distanceKm: 480,
    stopIds: ["esarj-konya"],
  },
  "İstanbul-Antalya": {
    distanceKm: 720,
    stopIds: ["trugo-bursa", "esarj-konya"],
  },
  "Antalya-İstanbul": {
    distanceKm: 720,
    stopIds: ["esarj-konya", "trugo-bursa"],
  },
};

// ─── Rota hesaplama fonksiyonu ────────────────────────────────────────────────
function calculateRoute(
  from: CityData,
  to: CityData,
  vehicle: EVModel,
): RouteResult {
  const routeKey = `${from.name}-${to.name}`;
  const safeRangeKm = vehicle.range_km * 0.8;

  let totalDistanceKm: number;
  let stopIds: string[];

  if (DEMO_ROUTES[routeKey]) {
    totalDistanceKm = DEMO_ROUTES[routeKey].distanceKm;
    stopIds = DEMO_ROUTES[routeKey].stopIds;
  } else {
    // Haversine ile kaba mesafe hesapla ve 1.3 yol faktörü uygula
    const straightLine = haversineKm(from.lat, from.lon, to.lat, to.lon);
    totalDistanceKm = Math.round(straightLine * 1.3);

    // Kaç durak gerekir?
    const numStops = Math.max(0, Math.ceil(totalDistanceKm / safeRangeKm) - 1);

    // Rotaya en yakın istasyonları seç
    const midLat = (from.lat + to.lat) / 2;
    const midLon = (from.lon + to.lon) / 2;

    const sorted = [...HIGHWAY_STATIONS].sort((a, b) => {
      const da = haversineKm(midLat, midLon, a.lat, a.lon);
      const db = haversineKm(midLat, midLon, b.lat, b.lon);
      return da - db;
    });
    stopIds = sorted.slice(0, numStops).map((s) => s.id);
  }

  // Durakları oluştur
  const stops: StopInfo[] = stopIds
    .map((id) => HIGHWAY_STATIONS.find((s) => s.id === id))
    .filter(Boolean)
    .map((station, idx, arr) => {
      const distFromStart =
        arr.length === 0
          ? totalDistanceKm / 2
          : Math.round((totalDistanceKm / (arr.length + 1)) * (idx + 1));

      // Şarj edilmesi gereken kWh: güvenli menzili tamamlamak için
      const segmentKm =
        idx === 0
          ? distFromStart
          : distFromStart -
            Math.round((totalDistanceKm / (arr.length + 1)) * idx);
      const consumptionKwhPerKm = vehicle.battery_kwh / vehicle.range_km;
      const chargeNeeded = Math.min(
        segmentKm * consumptionKwhPerKm * 1.15, // %15 tampon
        vehicle.battery_kwh * 0.7,
      );
      const effectivePower = Math.min(station!.powerKw, vehicle.max_charge_kw);
      const chargeTimeMin = Math.round((chargeNeeded / effectivePower) * 60);
      const costTl =
        Math.round(chargeNeeded * station!.pricePerKwh * 100) / 100;

      return {
        stationId: station!.id,
        stationName: station!.name,
        network: station!.network,
        powerKw: Math.min(station!.powerKw, vehicle.max_charge_kw),
        city: station!.city,
        distanceFromStart: distFromStart,
        chargeNeededKwh: Math.round(chargeNeeded * 10) / 10,
        chargeTimeMin,
        costTl,
        pricePerKwh: station!.pricePerKwh,
        isGreenEnergy: station!.isGreenEnergy,
        lat: station!.lat,
        lon: station!.lon,
      } as StopInfo;
    });

  const totalChargeKwh = stops.reduce((s, st) => s + st.chargeNeededKwh, 0);
  const totalChargeCost = stops.reduce((s, st) => s + st.costTl, 0);

  // CO₂ hesabı: benzinli (10L/100km × 2.5 kg/L) vs EV (0 emisyon gibi düşün)
  const co2SavedKg = Math.round((totalDistanceKm / 100) * 10 * 2.5 * 10) / 10;
  const fuelSavedLiters = Math.round((totalDistanceKm / 100) * 10 * 10) / 10;

  // Süre: ortalama 90 km/sa + şarj durakları
  const driveTimeMin = Math.round((totalDistanceKm / 90) * 60);
  const chargeStopTimeMin = stops.reduce(
    (s, st) => s + st.chargeTimeMin + 10,
    0,
  ); // +10 dk dinlenme
  const travelTimeMin = driveTimeMin + chargeStopTimeMin;

  return {
    totalDistanceKm,
    travelTimeMin,
    stops,
    totalChargeCost: Math.round(totalChargeCost * 100) / 100,
    totalChargeKwh: Math.round(totalChargeKwh * 10) / 10,
    co2SavedKg,
    fuelSavedLiters,
  };
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
// ─── DB'den gelen araç satırı ──────────────────────────────────────────────
interface DBVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  battery_capacity_kwh: number;
  range_km: number;
  max_charge_kw: number;
  connector_types: string[];
  is_togg: boolean;
}

function dbVehicleToEVModel(v: DBVehicle): EVModel {
  return {
    brand: v.brand as EVModel["brand"],
    model: `${v.model} (${v.year})`,
    range_km: v.range_km,
    battery_kwh: v.battery_capacity_kwh,
    max_charge_kw: v.max_charge_kw,
    connector_types: v.connector_types ?? [],
  };
}

export default function RouteScreen() {
  const { user } = useAuthStore();

  // Kullanıcının Supabase'deki araçlarını çek
  const { data: dbVehicles = [] } = useQuery<DBVehicle[]>({
    queryKey: ["vehicles-route", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, brand, model, year, battery_capacity_kwh, range_km, max_charge_kw, connector_types, is_togg",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as DBVehicle[];
    },
    enabled: !!user,
  });

  // DB araçlarını EVModel'e çevir ve POPULAR_EV_MODELS ile birleştir
  // DB araçları her zaman listenin başında görünür
  const vehicleList = useMemo<EVModel[]>(() => {
    const userModels = dbVehicles.map(dbVehicleToEVModel);
    // Yineleme olmaması için kullanıcı araçlarını POPULAR listesinden çıkar
    const userKeys = new Set(
      userModels.map((v) => `${v.brand}|${v.model.split(" (")[0]}`),
    );
    const filteredPopular = POPULAR_EV_MODELS.filter(
      (v) => !userKeys.has(`${v.brand}|${v.model}`),
    );
    return [...userModels, ...filteredPopular];
  }, [dbVehicles]);

  const defaultVehicle = vehicleList[0] ?? POPULAR_EV_MODELS[0];

  const [selectedVehicle, setSelectedVehicle] =
    useState<EVModel>(defaultVehicle);
  const [fromCity, setFromCity] = useState<CityData | null>(null);
  const [toCity, setToCity] = useState<CityData | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [fromCityModalVisible, setFromCityModalVisible] = useState(false);
  const [toCityModalVisible, setToCityModalVisible] = useState(false);

  const handleSelectVehicle = useCallback((vehicle: EVModel) => {
    setSelectedVehicle(vehicle);
    setVehicleModalVisible(false);
    setRouteResult(null);
  }, []);

  const handleSelectFromCity = useCallback((city: CityData) => {
    setFromCity(city);
    setFromText(city.name);
    setFromCityModalVisible(false);
    setRouteResult(null);
  }, []);

  const handleSelectToCity = useCallback((city: CityData) => {
    setToCity(city);
    setToText(city.name);
    setToCityModalVisible(false);
    setRouteResult(null);
  }, []);

  const handleCalculate = useCallback(async () => {
    if (!fromCity || !toCity) {
      Alert.alert("Eksik Bilgi", "Lütfen başlangıç ve bitiş şehrini seçin.");
      return;
    }
    if (fromCity.name === toCity.name) {
      Alert.alert("Hata", "Başlangıç ve bitiş şehirleri aynı olamaz.");
      return;
    }
    setIsLoading(true);
    setRouteResult(null);
    // Simüle hesaplama gecikmesi
    await new Promise((r) => setTimeout(r, 1200));
    const result = calculateRoute(fromCity, toCity, selectedVehicle);
    setRouteResult(result);
    setIsLoading(false);
  }, [fromCity, toCity, selectedVehicle]);

  // ─── Araç Seçim Modalı ─────────────────────────────────────────────────
  // Araç listesi güncellenince selectedVehicle'ı ilk araca senkronize et
  React.useEffect(() => {
    if (vehicleList.length > 0) {
      setSelectedVehicle((prev) => {
        // Eğer seçili araç hâlâ listede varsa değiştirme
        const stillExists = vehicleList.some(
          (v) => v.brand === prev.brand && v.model === prev.model,
        );
        return stillExists ? prev : vehicleList[0];
      });
    }
  }, [vehicleList]);

  // Kullanıcı aracı mı yoksa popüler model mi?
  const isUserVehicle = useCallback(
    (item: EVModel) =>
      dbVehicles.some(
        (v) => v.brand === item.brand && item.model.startsWith(v.model),
      ),
    [dbVehicles],
  );

  const renderVehicleItem = ({ item }: { item: EVModel }) => {
    const isSelected =
      item.brand === selectedVehicle.brand &&
      item.model === selectedVehicle.model;
    const fromDB = isUserVehicle(item);
    return (
      <TouchableOpacity
        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
        onPress={() => handleSelectVehicle(item)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalItemHeader}>
            <Text style={styles.modalItemTitle}>
              {item.brand} {item.model}
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {fromDB && (
                <View style={styles.myVehicleBadge}>
                  <Ionicons name="person" size={9} color="#3B82F6" />
                  <Text style={styles.myVehicleBadgeText}>Aracım</Text>
                </View>
              )}
              {item.brand === "Togg" && (
                <View style={styles.toggBadgeSmall}>
                  <Text style={styles.toggBadgeText}>Yerli</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.modalItemSub}>
            {item.range_km} km • {item.battery_kwh} kWh • Maks{" "}
            {item.max_charge_kw} kW
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#00D26A" />
        )}
      </TouchableOpacity>
    );
  };

  // ─── Şehir Seçim Modalı ────────────────────────────────────────────────
  const renderCityItem =
    (onSelect: (city: CityData) => void) =>
    ({ item }: { item: CityData }) => (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={18} color="#6B7280" />
        <Text style={[styles.modalItemTitle, { marginLeft: 10 }]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );

  // ─── Durak Kartı ───────────────────────────────────────────────────────
  const renderStopCard = (stop: StopInfo, index: number, total: number) => (
    <View key={stop.stationId} style={styles.stopCard}>
      {/* Üst bağlantı çizgisi */}
      <View style={styles.stopTimeline}>
        <View style={[styles.timelineDot, { backgroundColor: "#00D26A" }]} />
        {index < total - 1 && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.stopContent}>
        <View style={styles.stopHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stopName} numberOfLines={1}>
              {stop.stationName}
            </Text>
            <View style={styles.stopMeta}>
              <View style={styles.networkChip}>
                <Text style={styles.networkChipText}>{stop.network}</Text>
              </View>
              {stop.isGreenEnergy && (
                <View style={styles.greenChip}>
                  <Text style={styles.greenChipText}>🌱 Yeşil</Text>
                </View>
              )}
              <Text style={styles.stopCity}>📍 {stop.city}</Text>
            </View>
          </View>
          <View style={styles.stopDistanceBadge}>
            <Text style={styles.stopDistanceText}>
              {stop.distanceFromStart} km
            </Text>
          </View>
        </View>

        <View style={styles.stopMetrics}>
          <View style={styles.stopMetric}>
            <Ionicons name="flash" size={14} color="#F59E0B" />
            <Text style={styles.stopMetricValue}>{stop.powerKw} kW</Text>
            <Text style={styles.stopMetricLabel}>Güç</Text>
          </View>
          <View style={styles.stopMetric}>
            <Ionicons name="battery-charging" size={14} color="#60A5FA" />
            <Text style={styles.stopMetricValue}>
              {stop.chargeNeededKwh} kWh
            </Text>
            <Text style={styles.stopMetricLabel}>Şarj</Text>
          </View>
          <View style={styles.stopMetric}>
            <Ionicons name="time" size={14} color="#A78BFA" />
            <Text style={styles.stopMetricValue}>{stop.chargeTimeMin} dk</Text>
            <Text style={styles.stopMetricLabel}>Süre</Text>
          </View>
          <View style={styles.stopMetric}>
            <Ionicons name="card" size={14} color="#00D26A" />
            <Text style={[styles.stopMetricValue, { color: "#00D26A" }]}>
              ₺{stop.costTl.toFixed(2)}
            </Text>
            <Text style={styles.stopMetricLabel}>Maliyet</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mapButton}
          onPress={() =>
            Alert.alert(
              "📍 Haritada Göster",
              `${stop.stationName}\n${stop.city}\nKoordinat: ${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}`,
            )
          }
          activeOpacity={0.7}
        >
          <Ionicons name="map-outline" size={15} color="#60A5FA" />
          <Text style={styles.mapButtonText}>Haritada Göster</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── BAŞLIK ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="navigate" size={26} color="#00D26A" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Rota Planlama</Text>
            <Text style={styles.headerSubtitle}>
              Türkiye'nin tüm şarj ağlarında güzergah planlayın
            </Text>
          </View>
        </View>

        {/* ─── ARAÇ SEÇİMİ KARTI ──────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="car-sport" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Araç Seçimi</Text>
          </View>

          <TouchableOpacity
            style={styles.vehicleSelector}
            onPress={() => setVehicleModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.vehicleSelectorTop}>
                <Text style={styles.vehicleLabel}>Aracınız:</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {isUserVehicle(selectedVehicle) && (
                    <View
                      style={[
                        styles.toggBadge,
                        { backgroundColor: "#1E3A5F", borderColor: "#3B82F6" },
                      ]}
                    >
                      <Text
                        style={[styles.toggBadgeText, { color: "#3B82F6" }]}
                      >
                        👤 Kayıtlı Aracım
                      </Text>
                    </View>
                  )}
                  {selectedVehicle.brand === "Togg" && (
                    <View style={styles.toggBadge}>
                      <Text style={styles.toggBadgeText}>🏭 Yerli Üretim</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.vehicleName}>
                {selectedVehicle.brand} {selectedVehicle.model}
              </Text>
              <View style={styles.vehicleStats}>
                <View style={styles.vehicleStat}>
                  <Ionicons
                    name="speedometer-outline"
                    size={12}
                    color="#6B7280"
                  />
                  <Text style={styles.vehicleStatText}>
                    {selectedVehicle.range_km} km menzil
                  </Text>
                </View>
                <View style={styles.vehicleStat}>
                  <Ionicons
                    name="battery-full-outline"
                    size={12}
                    color="#6B7280"
                  />
                  <Text style={styles.vehicleStatText}>
                    {selectedVehicle.battery_kwh} kWh
                  </Text>
                </View>
                <View style={styles.vehicleStat}>
                  <Ionicons name="flash-outline" size={12} color="#6B7280" />
                  <Text style={styles.vehicleStatText}>
                    Maks {selectedVehicle.max_charge_kw} kW
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ─── GÜZERGAH GİRİŞ KARTI ───────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="map" size={18} color="#00D26A" />
            <Text style={styles.cardTitle}>Güzergah</Text>
          </View>

          {/* NEREDEN */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: "#00D26A" }]} />
              <Text style={styles.inputLabel}>Nereden</Text>
            </View>
            <TouchableOpacity
              style={styles.cityInput}
              onPress={() => setFromCityModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="location" size={16} color="#00D26A" />
              <Text
                style={[
                  styles.cityInputText,
                  !fromCity && styles.cityInputPlaceholder,
                ]}
              >
                {fromCity ? fromCity.name : "Şehir seçin..."}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {/* Popüler şehir chip'leri */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={styles.chipRowContent}
            >
              {TR_CITIES.slice(0, 5).map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={[
                    styles.cityChip,
                    fromCity?.name === city.name && styles.cityChipActive,
                  ]}
                  onPress={() => handleSelectFromCity(city)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      fromCity?.name === city.name && styles.cityChipTextActive,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Ayırıcı */}
          <View style={styles.routeConnector}>
            <View style={styles.routeConnectorLine} />
            <View style={styles.routeConnectorIcon}>
              <Ionicons name="swap-vertical" size={14} color="#6B7280" />
            </View>
          </View>

          {/* NEREYE */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.inputLabel}>Nereye</Text>
            </View>
            <TouchableOpacity
              style={styles.cityInput}
              onPress={() => setToCityModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="location" size={16} color="#EF4444" />
              <Text
                style={[
                  styles.cityInputText,
                  !toCity && styles.cityInputPlaceholder,
                ]}
              >
                {toCity ? toCity.name : "Şehir seçin..."}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={styles.chipRowContent}
            >
              {TR_CITIES.slice(0, 5).map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={[
                    styles.cityChip,
                    toCity?.name === city.name && styles.cityChipActive,
                  ]}
                  onPress={() => handleSelectToCity(city)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      toCity?.name === city.name && styles.cityChipTextActive,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* HESAPLA BUTONU */}
          <TouchableOpacity
            style={[
              styles.calculateButton,
              (!fromCity || !toCity) && styles.calculateButtonDisabled,
            ]}
            onPress={handleCalculate}
            disabled={isLoading || !fromCity || !toCity}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F1117" size="small" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#0F1117" />
                <Text style={styles.calculateButtonText}>Rota Hesapla</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── YÜKLEME ────────────────────────────────────────────────── */}
        {isLoading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#00D26A" size="large" />
            <Text style={styles.loadingText}>Güzergah hesaplanıyor...</Text>
            <Text style={styles.loadingSubText}>
              Şarj noktaları ve araç menzili hesaba katılıyor
            </Text>
          </View>
        )}

        {/* ─── ROTA SONUCU ────────────────────────────────────────────── */}
        {routeResult && !isLoading && (
          <>
            {/* Özet */}
            <View style={styles.resultSummaryCard}>
              <View style={styles.resultSummaryHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#00D26A" />
                <Text style={styles.resultSummaryTitle}>
                  {fromCity?.name} → {toCity?.name}
                </Text>
              </View>
              <View style={styles.resultSummaryMetrics}>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricValue}>
                    {routeResult.totalDistanceKm} km
                  </Text>
                  <Text style={styles.resultMetricLabel}>Toplam Mesafe</Text>
                </View>
                <View style={styles.resultMetricDivider} />
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricValue}>
                    {formatTime(routeResult.travelTimeMin)}
                  </Text>
                  <Text style={styles.resultMetricLabel}>Tahmini Süre</Text>
                </View>
                <View style={styles.resultMetricDivider} />
                <View style={styles.resultMetric}>
                  <Text
                    style={[styles.resultMetricValue, { color: "#00D26A" }]}
                  >
                    {routeResult.stops.length}
                  </Text>
                  <Text style={styles.resultMetricLabel}>Şarj Durağı</Text>
                </View>
              </View>
            </View>

            {/* Şarj Maliyeti */}
            <View style={styles.costCard}>
              <View style={styles.costCardRow}>
                <View>
                  <Text style={styles.costLabel}>Toplam Şarj Maliyeti</Text>
                  <Text style={styles.costAmount}>
                    ₺{routeResult.totalChargeCost.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.costDetail}>
                  <Text style={styles.costDetailText}>
                    {routeResult.totalChargeKwh} kWh
                  </Text>
                  <Text style={styles.costDetailSub}>şarj edilecek</Text>
                </View>
              </View>

              {/* CO₂ Tasarrufu */}
              <View style={styles.co2Row}>
                <View style={styles.co2Block}>
                  <Text style={styles.co2Emoji}>🌱</Text>
                  <View>
                    <Text style={styles.co2Value}>
                      {routeResult.co2SavedKg} kg CO₂
                    </Text>
                    <Text style={styles.co2Label}>tasarruf (benzine göre)</Text>
                  </View>
                </View>
                <View style={styles.co2Block}>
                  <Text style={styles.co2Emoji}>⛽</Text>
                  <View>
                    <Text style={styles.co2Value}>
                      {routeResult.fuelSavedLiters} litre
                    </Text>
                    <Text style={styles.co2Label}>yakıt yakılmadı</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Şarj Durakları */}
            {routeResult.stops.length === 0 ? (
              <View style={styles.noStopCard}>
                <Ionicons name="battery-full" size={36} color="#00D26A" />
                <Text style={styles.noStopTitle}>Şarj Durağı Gerekmiyor!</Text>
                <Text style={styles.noStopText}>
                  {selectedVehicle.brand} {selectedVehicle.model} bu mesafeyi
                  tek şarjla rahatlıkla tamamlar.
                </Text>
              </View>
            ) : (
              <View style={styles.stopsCard}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="flash" size={18} color="#F59E0B" />
                  <Text style={styles.cardTitle}>Şarj Durakları</Text>
                  <View style={styles.stopCountBadge}>
                    <Text style={styles.stopCountText}>
                      {routeResult.stops.length} durak
                    </Text>
                  </View>
                </View>

                {/* Başlangıç */}
                <View style={styles.routeEndpoint}>
                  <View
                    style={[styles.endpointDot, { backgroundColor: "#00D26A" }]}
                  />
                  <Text style={styles.endpointText}>
                    🚗 Başlangıç — {fromCity?.name}
                  </Text>
                </View>

                {routeResult.stops.map((stop, idx) =>
                  renderStopCard(stop, idx, routeResult.stops.length),
                )}

                {/* Bitiş */}
                <View style={styles.routeEndpoint}>
                  <View
                    style={[styles.endpointDot, { backgroundColor: "#EF4444" }]}
                  />
                  <Text style={styles.endpointText}>
                    🏁 Varış — {toCity?.name}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ─── TÜRKİYE OTOYOL İPUÇLARI ────────────────────────────────── */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>
            🛣️ Türkiye Otoyol İpuçları
          </Text>

          {[
            {
              icon: "🛣️",
              title: "TEM Otoyolu",
              text: "Her ~50 km'de DC hızlı şarj noktası bulunmaktadır.",
            },
            {
              icon: "⚡",
              title: "Trugo + Shell Ortaklığı",
              text: "Otoyol kavşaklarındaki Shell istasyonlarında 180 kW'a kadar hızlı şarj.",
            },
            {
              icon: "🌱",
              title: "Eşarj Yeşil Enerji",
              text: "Eşarj istasyonları %100 yenilenebilir enerji (YEK-G sertifikalı) kullanır.",
            },
            {
              icon: "🏭",
              title: "Togg Öncelikli Şarj",
              text: "ZES ve Trugo'nun seçili istasyonlarında Togg araçlarına öncelikli erişim.",
            },
          ].map((tip, idx) => (
            <View key={idx} style={styles.tipCard}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── ARAÇ SEÇİM MODALI ──────────────────────────────────────────── */}
      {/* Araç Seçim Modalı */}
      <Modal
        visible={vehicleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Araç Seç</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {dbVehicles.length > 0 && (
              <View style={styles.modalSectionHeader}>
                <Ionicons name="person-outline" size={13} color="#3B82F6" />
                <Text style={styles.modalSectionTitle}>Kayıtlı Araçlarım</Text>
              </View>
            )}
            <FlatList
              data={vehicleList}
              keyExtractor={(item) => `${item.brand}-${item.model}`}
              renderItem={renderVehicleItem}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                dbVehicles.length > 0 ? undefined : (
                  <View style={styles.modalNoVehicleHint}>
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color="#6B7280"
                    />
                    <Text style={styles.modalNoVehicleText}>
                      Profil {">"} Araçlarımı Yönet'ten araç ekleyerek
                      listenizin başında görebilirsiniz.
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>

      {/* ─── NEREDEN MODALI ──────────────────────────────────────────────── */}
      <Modal
        visible={fromCityModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFromCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Başlangıç Şehri</Text>
              <TouchableOpacity
                onPress={() => setFromCityModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TR_CITIES}
              keyExtractor={(item) => item.name}
              renderItem={renderCityItem(handleSelectFromCity)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* ─── NEREYE MODALI ────────────────────────────────────────────────── */}
      <Modal
        visible={toCityModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setToCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Varış Şehri</Text>
              <TouchableOpacity
                onPress={() => setToCityModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TR_CITIES}
              keyExtractor={(item) => item.name}
              renderItem={renderCityItem(handleSelectToCity)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stiller ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    paddingTop: 4,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0D2818",
    borderWidth: 1,
    borderColor: "#00D26A40",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    flex: 1,
  },

  // Araç Seçimi
  vehicleSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1117",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#374151",
  },
  vehicleSelectorTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  vehicleLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  vehicleStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vehicleStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  vehicleStatText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  toggBadge: {
    backgroundColor: "#78350F",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#D97706",
  },
  toggBadgeSmall: {
    backgroundColor: "#78350F",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#D97706",
  },
  toggBadgeText: {
    color: "#FCD34D",
    fontSize: 11,
    fontWeight: "600",
  },

  // Güzergah Girişi
  inputGroup: {
    marginBottom: 6,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  cityInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F1117",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cityInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cityInputPlaceholder: {
    color: "#4B5563",
    fontWeight: "400",
  },
  chipRow: {
    marginTop: 10,
  },
  chipRowContent: {
    gap: 8,
    paddingRight: 4,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#374151",
  },
  cityChipActive: {
    backgroundColor: "#0D2818",
    borderColor: "#00D26A",
  },
  cityChipText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  cityChipTextActive: {
    color: "#00D26A",
    fontWeight: "600",
  },
  routeConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    marginVertical: 8,
  },
  routeConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2D3748",
  },
  routeConnectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  calculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 14,
  },
  calculateButtonDisabled: {
    backgroundColor: "#1F3828",
    opacity: 0.6,
  },
  calculateButtonText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },

  // Loading
  loadingCard: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: "#2D3748",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  loadingText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSubText: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
  },

  // Sonuç özet
  resultSummaryCard: {
    backgroundColor: "#0D2818",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#00D26A40",
    marginBottom: 14,
  },
  resultSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  resultSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultSummaryMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  resultMetric: {
    alignItems: "center",
  },
  resultMetricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultMetricLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
  },
  resultMetricDivider: {
    width: 1,
    backgroundColor: "#1A3D26",
  },

  // Maliyet Kartı
  costCard: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 14,
  },
  costCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  costLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  costAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#00D26A",
    letterSpacing: -0.5,
  },
  costDetail: {
    alignItems: "flex-end",
  },
  costDetailText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E5E7EB",
  },
  costDetailSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  co2Row: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#2D3748",
  },
  co2Block: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F1117",
    borderRadius: 10,
    padding: 12,
  },
  co2Emoji: {
    fontSize: 22,
  },
  co2Value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D1FAE5",
  },
  co2Label: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Durak yok
  noStopCard: {
    backgroundColor: "#0D2818",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#00D26A40",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  noStopTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00D26A",
  },
  noStopText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },

  // Durak kartları
  stopsCard: {
    backgroundColor: "#1A2332",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 14,
  },
  stopCountBadge: {
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stopCountText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "600",
  },
  routeEndpoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 4,
  },
  endpointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 4,
  },
  endpointText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },
  stopCard: {
    flexDirection: "row",
    paddingLeft: 4,
  },
  stopTimeline: {
    width: 20,
    alignItems: "center",
    paddingTop: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0F1117",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#2D3748",
    marginTop: 4,
  },
  stopContent: {
    flex: 1,
    backgroundColor: "#0F1117",
    borderRadius: 12,
    padding: 12,
    marginLeft: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  stopName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  stopMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  networkChip: {
    backgroundColor: "#1A2332",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#374151",
  },
  networkChipText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "600",
  },
  greenChip: {
    backgroundColor: "#064E3B",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  greenChipText: {
    color: "#6EE7B7",
    fontSize: 11,
    fontWeight: "600",
  },
  stopCity: {
    color: "#6B7280",
    fontSize: 11,
  },
  stopDistanceBadge: {
    backgroundColor: "#1A2332",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#374151",
  },
  stopDistanceText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  stopMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1A2332",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  stopMetric: {
    alignItems: "center",
    gap: 3,
  },
  stopMetricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stopMetricLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  mapButtonText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
  },

  // İpuçları
  tipsSection: {
    marginBottom: 8,
  },
  tipsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E5E7EB",
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
    gap: 12,
  },
  tipIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E5E7EB",
    marginBottom: 3,
  },
  tipText: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A2332",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "75%",
    borderTopWidth: 1,
    borderColor: "#2D3748",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 40,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalItemSelected: {
    backgroundColor: "#0D2818",
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  modalItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalItemSub: {
    fontSize: 13,
    color: "#6B7280",
  },
  myVehicleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#1E3A5F",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#3B82F640",
  },
  myVehicleBadgeText: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "700",
  },
  modalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1E3A5F30",
    borderBottomWidth: 1,
    borderBottomColor: "#3B82F620",
  },
  modalSectionTitle: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalNoVehicleHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#1A2332",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  modalNoVehicleText: {
    flex: 1,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },
});
