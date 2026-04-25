import { create } from "zustand";
import type {
  ConnectorType,
  NetworkName,
  StationFilter,
  ChargingStation,
} from "../types/station";

interface MapState {
  filter: StationFilter;
  selectedStation: ChargingStation | null;
  isBottomSheetOpen: boolean;
  pendingMapFocus: { lat: number; lon: number; stationName: string } | null;
  setFilter: (filter: Partial<StationFilter>) => void;
  selectStation: (station: ChargingStation | null) => void;
  setBottomSheetOpen: (open: boolean) => void;
  resetFilter: () => void;
  setPendingMapFocus: (
    v: { lat: number; lon: number; stationName: string } | null,
  ) => void;
}

const DEFAULT_FILTER: StationFilter = {
  network: "Tümü",
  connectorType: "Tümü",
  onlyAvailable: false,
  minPowerKw: 0,
  onlyGreenEnergy: false,
  locationType: "Tümü",
  onlyHPC: false,
};

export const useMapStore = create<MapState>((set) => ({
  filter: DEFAULT_FILTER,
  selectedStation: null,
  isBottomSheetOpen: false,
  pendingMapFocus: null,

  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial } })),

  selectStation: (station) =>
    set({ selectedStation: station, isBottomSheetOpen: station !== null }),

  setBottomSheetOpen: (open) =>
    set((state) => ({
      isBottomSheetOpen: open,
      selectedStation: open ? state.selectedStation : null,
    })),

  resetFilter: () => set({ filter: DEFAULT_FILTER }),

  setPendingMapFocus: (v) => set({ pendingMapFocus: v }),
}));
