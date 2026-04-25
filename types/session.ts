export type SessionStatus = "active" | "completed" | "cancelled";

export interface ChargingSession {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  network: string;
  connectorType: string;
  startedAt: string;
  endedAt: string | null;
  energyKwh: number;
  costTl: number;
  status: SessionStatus;
}

export interface ActiveSession {
  sessionId: string;
  stationId: string;
  stationName: string;
  network: string;
  connectorType: string;
  startedAt: Date;
  elapsedSeconds: number;
  energyKwh: number;
  costTl: number;
  pricePerKwh: number;
  powerKw: number;
}
