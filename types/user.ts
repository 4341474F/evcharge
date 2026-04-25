export interface UserProfile {
  id: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// Türkiye'deki popüler EV modelleri
export type VehicleBrand =
  | "Togg"
  | "Tesla"
  | "BMW"
  | "Mercedes"
  | "Volkswagen"
  | "Hyundai"
  | "Kia"
  | "Renault"
  | "Peugeot"
  | "Volvo"
  | "Porsche"
  | "Audi"
  | "Diğer";

export interface ToggModel {
  model: "T10X" | "T10F" | "T10S";
  range_km: number; // WLTP menzil
  battery_kwh: number;
}

export const TOGG_MODELS: ToggModel[] = [
  { model: "T10X", range_km: 523, battery_kwh: 88.5 },
  { model: "T10F", range_km: 501, battery_kwh: 88.5 },
  { model: "T10S", range_km: 300, battery_kwh: 52.4 },
];

// Türkiye'de satılan popüler EV'ler ve özellikleri
export interface EVModel {
  brand: VehicleBrand;
  model: string;
  range_km: number;
  battery_kwh: number;
  max_charge_kw: number; // Maksimum şarj gücü
  connector_types: string[];
}

export const POPULAR_EV_MODELS: EVModel[] = [
  {
    brand: "Togg",
    model: "T10X",
    range_km: 523,
    battery_kwh: 88.5,
    max_charge_kw: 150,
    connector_types: ["CCS2"],
  },
  {
    brand: "Togg",
    model: "T10F",
    range_km: 501,
    battery_kwh: 88.5,
    max_charge_kw: 150,
    connector_types: ["CCS2"],
  },
  {
    brand: "Togg",
    model: "T10S",
    range_km: 300,
    battery_kwh: 52.4,
    max_charge_kw: 100,
    connector_types: ["CCS2"],
  },
  {
    brand: "Tesla",
    model: "Model 3",
    range_km: 576,
    battery_kwh: 82,
    max_charge_kw: 250,
    connector_types: ["Tesla", "CCS2"],
  },
  {
    brand: "Tesla",
    model: "Model Y",
    range_km: 533,
    battery_kwh: 82,
    max_charge_kw: 250,
    connector_types: ["Tesla", "CCS2"],
  },
  {
    brand: "BMW",
    model: "iX",
    range_km: 630,
    battery_kwh: 111.5,
    max_charge_kw: 200,
    connector_types: ["CCS2"],
  },
  {
    brand: "BMW",
    model: "i4",
    range_km: 590,
    battery_kwh: 83.9,
    max_charge_kw: 200,
    connector_types: ["CCS2"],
  },
  {
    brand: "Hyundai",
    model: "IONIQ 5",
    range_km: 507,
    battery_kwh: 77.4,
    max_charge_kw: 220,
    connector_types: ["CCS2"],
  },
  {
    brand: "Hyundai",
    model: "IONIQ 6",
    range_km: 614,
    battery_kwh: 77.4,
    max_charge_kw: 230,
    connector_types: ["CCS2"],
  },
  {
    brand: "Kia",
    model: "EV6",
    range_km: 528,
    battery_kwh: 77.4,
    max_charge_kw: 233,
    connector_types: ["CCS2"],
  },
  {
    brand: "Volkswagen",
    model: "ID.4",
    range_km: 531,
    battery_kwh: 82,
    max_charge_kw: 135,
    connector_types: ["CCS2"],
  },
  {
    brand: "Volkswagen",
    model: "ID.3",
    range_km: 426,
    battery_kwh: 58,
    max_charge_kw: 130,
    connector_types: ["CCS2"],
  },
  {
    brand: "Renault",
    model: "Megane E-Tech",
    range_km: 470,
    battery_kwh: 60,
    max_charge_kw: 130,
    connector_types: ["CCS2"],
  },
  {
    brand: "Peugeot",
    model: "e-208",
    range_km: 362,
    battery_kwh: 54,
    max_charge_kw: 100,
    connector_types: ["CCS2"],
  },
  {
    brand: "Porsche",
    model: "Taycan",
    range_km: 503,
    battery_kwh: 93.4,
    max_charge_kw: 270,
    connector_types: ["CCS2"],
  },
];

export interface Vehicle {
  id: string;
  userId: string;
  brand: VehicleBrand;
  model: string;
  year: number;
  batteryCapacityKwh: number;
  rangeKm: number; // WLTP menzil
  maxChargeKw: number; // Maksimum şarj gücü
  connectorTypes: string[];
  isTogg: boolean; // Togg araçları Trugo'da öncelikli
}
