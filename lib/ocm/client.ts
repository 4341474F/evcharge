import type { OCMStation } from './types';
import type { ChargingStation, Connector, ConnectorType, NetworkName, StationStatus } from '../../types/station';
import { MOCK_STATIONS } from './mockData';

const OCM_BASE_URL = 'https://api.openchargemap.io/v3';
const API_KEY = process.env.EXPO_PUBLIC_OCM_API_KEY ?? '';

const CONNECTION_TYPE_MAP: Record<number, ConnectorType> = {
  2: 'CHAdeMO',
  25: 'Type2',
  1: 'Type1',
  33: 'CCS2',
  32: 'CCS2',
  30: 'Type2',
  27: 'Type2',
};

const NETWORK_MAP: Record<number, NetworkName> = {
  3538: 'ZES',
  3472: 'Eşarj',
  3521: 'Trugo',
  3578: 'Voltrun',
};

function mapConnectionType(typeId: number): ConnectorType {
  return CONNECTION_TYPE_MAP[typeId] ?? 'Type2';
}

function mapNetwork(operatorId: number | undefined): NetworkName {
  if (!operatorId) return 'Diğer';
  return NETWORK_MAP[operatorId] ?? 'Diğer';
}

function mapStatus(statusId: number | null | undefined): StationStatus {
  if (statusId == null) return 'unknown';
  if (statusId === 50) return 'available';
  if (statusId === 10) return 'occupied';
  if ([20, 75, 100].includes(statusId)) return 'out_of_service';
  return 'unknown';
}

function mapOCMStation(raw: OCMStation): ChargingStation {
  const connectors: Connector[] = (raw.Connections ?? []).map((c, idx) => ({
    id: idx,
    type: mapConnectionType(c.ConnectionTypeID),
    powerKw: c.PowerKW ?? 0,
    status: mapStatus(c.StatusTypeID),
    pricePerKwh: null,
  }));

  const availableCount = connectors.filter((c) => c.status === 'available').length;
  const overallStatus = mapStatus(raw.StatusType?.ID);

  return {
    id: raw.UUID,
    name: raw.AddressInfo.Title,
    network: mapNetwork(raw.OperatorInfo?.ID),
    address: raw.AddressInfo.AddressLine1 ?? '',
    city: raw.AddressInfo.Town ?? raw.AddressInfo.StateOrProvince ?? '',
    latitude: raw.AddressInfo.Latitude,
    longitude: raw.AddressInfo.Longitude,
    connectors,
    overallStatus,
    phone: raw.AddressInfo.ContactTelephone1 ?? raw.OperatorInfo?.PhonePrimaryContact ?? null,
    totalAvailable: availableCount,
    totalConnectors: raw.NumberOfPoints ?? connectors.length,
  };
}

export interface FetchStationsParams {
  latitude: number;
  longitude: number;
  distanceKm?: number;
  maxResults?: number;
}

export async function fetchNearbyStations(params: FetchStationsParams): Promise<ChargingStation[]> {
  const { latitude, longitude, distanceKm = 50, maxResults = 200 } = params;

  if (!API_KEY) {
    console.warn('[OCM] API key not set, using mock data');
    return MOCK_STATIONS;
  }

  try {
    const query = new URLSearchParams({
      countrycode: 'TR',
      latitude: String(latitude),
      longitude: String(longitude),
      distance: String(distanceKm),
      distanceunit: 'KM',
      maxresults: String(maxResults),
      compact: 'false',
      verbose: 'false',
      key: API_KEY,
    });

    const response = await fetch(`${OCM_BASE_URL}/poi?${query}`);

    if (!response.ok) {
      console.warn(`[OCM] API error ${response.status}, falling back to mock data`);
      return MOCK_STATIONS;
    }

    const data: OCMStation[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[OCM] Empty response, falling back to mock data');
      return MOCK_STATIONS;
    }

    return data.map(mapOCMStation);
  } catch (err) {
    console.warn('[OCM] Fetch failed, falling back to mock data:', err);
    return MOCK_STATIONS;
  }
}

export async function fetchStationById(id: string): Promise<ChargingStation | null> {
  // Check mock data first
  const mock = MOCK_STATIONS.find((s) => s.id === id);
  if (mock) return mock;

  if (!API_KEY) return null;

  try {
    const query = new URLSearchParams({
      chargepointid: id,
      countrycode: 'TR',
      compact: 'false',
      verbose: 'false',
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
