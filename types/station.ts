export type ConnectorType = 'CCS2' | 'CHAdeMO' | 'Type2' | 'Type1' | 'Schuko' | 'Tesla';
export type StationStatus = 'available' | 'occupied' | 'out_of_service' | 'unknown';
export type NetworkName = 'ZES' | 'Eşarj' | 'Trugo' | 'Voltrun' | 'Toroslar' | 'Diğer';

export interface Connector {
  id: number;
  type: ConnectorType;
  powerKw: number;
  status: StationStatus;
  pricePerKwh: number | null;
}

export interface ChargingStation {
  id: string;
  name: string;
  network: NetworkName;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  connectors: Connector[];
  overallStatus: StationStatus;
  phone: string | null;
  totalAvailable: number;
  totalConnectors: number;
}

export interface StationFilter {
  network: NetworkName | 'Tümü';
  connectorType: ConnectorType | 'Tümü';
  onlyAvailable: boolean;
  minPowerKw: number;
}
