import type { OCMStation } from "./types";
import type {
  ChargingStation,
  Connector,
  ConnectorType,
  NetworkName,
  StationStatus,
  ChargerTier,
  LocationType,
} from "../../types/station";
import { MOCK_STATIONS } from "./mockData";

const OCM_BASE_URL = "https://api.openchargemap.io/v3";
const API_KEY = process.env.EXPO_PUBLIC_OCM_API_KEY ?? "";

const CONNECTION_TYPE_MAP: Record<number, ConnectorType> = {
  2: "CHAdeMO",
  25: "Type2",
  1: "Type1",
  33: "CCS2",
  32: "CCS2",
  30: "Type2",
  27: "Type2",
};

const NETWORK_MAP: Record<number, NetworkName> = {
  3538: "ZES",
  3472: "Eşarj",
  3521: "Trugo",
  3578: "Voltrun",
  3580: "WAT",
  3582: "EnYakıt",
  3583: "5şarj",
};

/** Operator IDs for special flag logic */
const OPERATOR_ESARJ = 3472;
const OPERATOR_TRUGO = 3521;
const OPERATOR_ZES = 3538;

function mapConnectionType(typeId: number): ConnectorType {
  return CONNECTION_TYPE_MAP[typeId] ?? "Type2";
}

function mapNetwork(operatorId: number | undefined): NetworkName {
  if (!operatorId) return "Diğer";
  return NETWORK_MAP[operatorId] ?? "Diğer";
}

function mapStatus(statusId: number | null | undefined): StationStatus {
  if (statusId == null) return "unknown";
  if (statusId === 50) return "available";
  if (statusId === 10) return "occupied";
  if ([20, 75, 100].includes(statusId)) return "out_of_service";
  return "unknown";
}

function resolveChargerTier(powerKw: number): ChargerTier {
  if (powerKw >= 150) return "HPC";
  if (powerKw >= 22) return "DC";
  return "AC";
}

function mapOCMStation(raw: OCMStation): ChargingStation {
  const operatorId = raw.OperatorInfo?.ID;

  const connectors: Connector[] = (raw.Connections ?? []).map((c, idx) => {
    const powerKw = c.PowerKW ?? 0;
    return {
      id: idx,
      type: mapConnectionType(c.ConnectionTypeID),
      powerKw,
      status: mapStatus(c.StatusTypeID),
      pricePerKwh: null,
      pricePerKwhHPC: null,
      blockingFeePerMin: null,
      tier: resolveChargerTier(powerKw),
    };
  });

  const availableCount = connectors.filter(
    (c) => c.status === "available",
  ).length;
  const overallStatus = mapStatus(raw.StatusType?.ID);

  const isGreenEnergy = operatorId === OPERATOR_ESARJ;
  const hasToggPriority = operatorId === OPERATOR_TRUGO;
  const hasBlockingFee = operatorId === OPERATOR_ZES;

  const locationType: LocationType = "public";

  return {
    id: raw.UUID,
    name: raw.AddressInfo.Title,
    network: mapNetwork(operatorId),
    address: raw.AddressInfo.AddressLine1 ?? "",
    city: raw.AddressInfo.Town ?? raw.AddressInfo.StateOrProvince ?? "",
    district: null,
    latitude: raw.AddressInfo.Latitude,
    longitude: raw.AddressInfo.Longitude,
    connectors,
    overallStatus,
    phone:
      raw.AddressInfo.ContactTelephone1 ??
      raw.OperatorInfo?.PhonePrimaryContact ??
      null,
    totalAvailable: availableCount,
    totalConnectors: raw.NumberOfPoints ?? connectors.length,
    isGreenEnergy,
    locationType,
    openingHours: { is24h: true },
    venueName: null,
    hasToggPriority,
    hasBlockingFee,
  };
}

export interface FetchStationsParams {
  latitude: number;
  longitude: number;
  distanceKm?: number;
  maxResults?: number;
}

// Tüm Türkiye istasyonlarını arama için çeker — konum bağımsız
// Sonuçlar cache'lenir, tekrar çekilmez
let _turkeyStationsCache: ChargingStation[] | null = null;
let _turkeyStationsFetching: Promise<ChargingStation[]> | null = null;

export async function fetchAllTurkeyStations(): Promise<ChargingStation[]> {
  // Cache varsa direkt döndür
  if (_turkeyStationsCache) return _turkeyStationsCache;

  // Aynı anda birden fazla çağrı varsa aynı promise'i beklet
  if (_turkeyStationsFetching) return _turkeyStationsFetching;

  if (!API_KEY) {
    _turkeyStationsCache = MOCK_STATIONS;
    return MOCK_STATIONS;
  }

  _turkeyStationsFetching = (async () => {
    try {
      const query = new URLSearchParams({
        countrycode: "TR",
        maxresults: "500",
        compact: "true",
        verbose: "false",
        key: API_KEY,
      });

      const response = await fetch(`${OCM_BASE_URL}/poi?${query}`);

      if (!response.ok) {
        console.warn("[OCM] Turkey fetch error, using mock for search");
        _turkeyStationsCache = MOCK_STATIONS;
        return MOCK_STATIONS;
      }

      const data: OCMStation[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        _turkeyStationsCache = MOCK_STATIONS;
        return MOCK_STATIONS;
      }

      const mapped = data.map(mapOCMStation);
      _turkeyStationsCache = mapped;
      return mapped;
    } catch (err) {
      console.warn("[OCM] Turkey fetch failed, using mock for search:", err);
      _turkeyStationsCache = MOCK_STATIONS;
      return MOCK_STATIONS;
    } finally {
      _turkeyStationsFetching = null;
    }
  })();

  return _turkeyStationsFetching;
}

export async function fetchNearbyStations(
  params: FetchStationsParams,
): Promise<ChargingStation[]> {
  const { latitude, longitude, distanceKm = 50, maxResults = 200 } = params;

  if (!API_KEY) {
    console.warn("[OCM] API key not set, using mock data");
    return MOCK_STATIONS;
  }

  try {
    const query = new URLSearchParams({
      countrycode: "TR",
      latitude: String(latitude),
      longitude: String(longitude),
      distance: String(distanceKm),
      distanceunit: "KM",
      maxresults: String(maxResults),
      compact: "false",
      verbose: "false",
      key: API_KEY,
    });

    const response = await fetch(`${OCM_BASE_URL}/poi?${query}`);

    if (!response.ok) {
      console.warn(
        `[OCM] API error ${response.status}, falling back to mock data`,
      );
      return MOCK_STATIONS;
    }

    const data: OCMStation[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[OCM] Empty response, falling back to mock data");
      return MOCK_STATIONS;
    }

    return data.map(mapOCMStation);
  } catch (err) {
    console.warn("[OCM] Fetch failed, falling back to mock data:", err);
    return MOCK_STATIONS;
  }
}

export async function fetchStationById(
  id: string,
): Promise<ChargingStation | null> {
  // Check mock data first
  const mock = MOCK_STATIONS.find((s) => s.id === id);
  if (mock) return mock;

  if (!API_KEY) return null;

  try {
    const query = new URLSearchParams({
      chargepointid: id,
      countrycode: "TR",
      compact: "false",
      verbose: "false",
      key: API_KEY,
    });

    const response = await fetch(`${OCM_BASE_URL}/poi?${query}`);
    if (!response.ok) return null;

    const data: OCMStation[] = await response.json();
    if (!Array.isArray(data) || !data.length) return null;

    return mapOCMStation(data[0]);
  } catch {
    return null;
  }
}
