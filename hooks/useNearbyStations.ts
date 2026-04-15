import { useQuery } from '@tanstack/react-query';
import { fetchNearbyStations } from '../lib/ocm/client';
import type { ChargingStation, StationFilter } from '../types/station';

function applyFilter(stations: ChargingStation[], filter: StationFilter): ChargingStation[] {
  return stations.filter((s) => {
    if (filter.network !== 'Tümü' && s.network !== filter.network) return false;
    if (filter.onlyAvailable && s.totalAvailable === 0) return false;
    if (filter.connectorType !== 'Tümü') {
      const hasConnector = s.connectors.some((c) => c.type === filter.connectorType);
      if (!hasConnector) return false;
    }
    if (filter.minPowerKw > 0) {
      const hasEnoughPower = s.connectors.some((c) => c.powerKw >= filter.minPowerKw);
      if (!hasEnoughPower) return false;
    }
    return true;
  });
}

export function useNearbyStations(
  latitude: number,
  longitude: number,
  filter: StationFilter,
) {
  const query = useQuery({
    queryKey: ['stations', latitude, longitude],
    queryFn: () => fetchNearbyStations({ latitude, longitude, distanceKm: 50, maxResults: 200 }),
    staleTime: 5 * 60 * 1000, // 5 dakika
    enabled: latitude !== 0 && longitude !== 0,
  });

  const filtered = query.data ? applyFilter(query.data, filter) : [];

  return { ...query, stations: filtered };
}
