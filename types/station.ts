export type ConnectorType =
  | "CCS2"
  | "CHAdeMO"
  | "Type2"
  | "Type1"
  | "Schuko"
  | "Tesla"
  | "GBT";

export type StationStatus =
  | "available"
  | "occupied"
  | "out_of_service"
  | "unknown";

export type NetworkName =
  | "ZES"
  | "Eşarj"
  | "Trugo"
  | "Voltrun"
  | "WAT"
  | "5şarj"
  | "EnYakıt"
  | "Astor"
  | "Otojet"
  | "Beefull"
  | "Zeplin"
  | "Toroslar"
  | "Diğer";

export type ChargerTier = "AC" | "DC" | "HPC"; // HPC = HyperCharger 150kW+

export type LocationType =
  | "highway" // Otoyol
  | "mall" // AVM
  | "hotel" // Otel
  | "parking" // Otopark
  | "gas_station" // Akaryakıt İstasyonu
  | "public" // Kamusal Alan
  | "workplace" // İş yeri
  | "other";

export interface Connector {
  id: number;
  type: ConnectorType;
  powerKw: number;
  status: StationStatus;
  /** AC fiyatı (₺/kWh) */
  pricePerKwh: number | null;
  /** HPC (150kW+) için ayrı fiyat */
  pricePerKwhHPC: number | null;
  /** Dakika bazlı park/bloke ücreti (₺/dk) - ZES provision gibi */
  blockingFeePerMin: number | null;
  tier: ChargerTier;
}

export interface OpeningHours {
  is24h: boolean;
  weekdays?: string; // "08:00-22:00"
  weekends?: string; // "09:00-21:00"
}

export interface ChargingStation {
  id: string;
  name: string;
  network: NetworkName;
  address: string;
  city: string;
  district: string | null; // İlçe (Kadıköy, Çankaya vs.)
  latitude: number;
  longitude: number;
  connectors: Connector[];
  overallStatus: StationStatus;
  phone: string | null;
  totalAvailable: number;
  totalConnectors: number;
  /** %100 yenilenebilir enerji (YEK-G sertifikalı) */
  isGreenEnergy: boolean;
  locationType: LocationType;
  openingHours: OpeningHours;
  /** AVM adı veya tesis adı (varsa) */
  venueName: string | null;
  /** Togg araçlarına öncelikli erişim */
  hasToggPriority: boolean;
  /** Provizyon/bloke ücreti uygulanıyor mu */
  hasBlockingFee: boolean;
}

export interface StationFilter {
  network: NetworkName | "Tümü";
  connectorType: ConnectorType | "Tümü";
  onlyAvailable: boolean;
  minPowerKw: number;
  onlyGreenEnergy: boolean;
  locationType: LocationType | "Tümü";
  onlyHPC: boolean;
}
