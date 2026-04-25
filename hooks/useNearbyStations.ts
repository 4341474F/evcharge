import { useQuery } from "@tanstack/react-query";
import { fetchNearbyStations } from "../lib/ocm/client";
import type { ChargingStation, StationFilter } from "../types/station";

function applyFilter(
  stations: ChargingStation[],
  filter: StationFilter,
): ChargingStation[] {
  return stations.filter((s) => {
    // Ağ filtresi
    if (filter.network !== "Tümü" && s.network !== filter.network) return false;

    // Sadece müsait
    if (filter.onlyAvailable && s.totalAvailable === 0) return false;

    // Konnektör tipi
    if (filter.connectorType !== "Tümü") {
      const hasConnector = s.connectors.some(
        (c) => c.type === filter.connectorType,
      );
      if (!hasConnector) return false;
    }

    // Minimum güç
    if (filter.minPowerKw > 0) {
      const hasEnoughPower = s.connectors.some(
        (c) => c.powerKw >= filter.minPowerKw,
      );
      if (!hasEnoughPower) return false;
    }

    // Sadece yeşil enerji (YEK-G)
    if (filter.onlyGreenEnergy && !s.isGreenEnergy) return false;

    // Konum tipi
    if (
      filter.locationType !== "Tümü" &&
      s.locationType !== filter.locationType
    )
      return false;

    // Sadece HPC (150 kW+)
    if (filter.onlyHPC) {
      const hasHPC = s.connectors.some((c) => c.powerKw >= 150);
      if (!hasHPC) return false;
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
    queryKey: ["stations", latitude, longitude],
    queryFn: () =>
      fetchNearbyStations({
        latitude,
        longitude,
        distanceKm: 50,
        maxResults: 200,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: latitude !== 0 && longitude !== 0,
  });

  const filtered = query.data ? applyFilter(query.data, filter) : [];

  // Ham veri — UI filtresi ve viewport uygulanmamış
  const rawStations = query.data ?? [];

  return {
    ...query,
    stations: filtered,
    rawStations,
    isFetching: query.isFetching,
  };
}
