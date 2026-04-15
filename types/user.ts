export interface UserProfile {
  id: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  batteryCapacityKwh: number;
  connectorTypes: string[];
}
