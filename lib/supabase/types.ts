export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          brand: string;
          model: string;
          year: number;
          battery_capacity_kwh: number;
          connector_types: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand: string;
          model: string;
          year: number;
          battery_capacity_kwh: number;
          connector_types: string[];
        };
        Update: {
          brand?: string;
          model?: string;
          year?: number;
          battery_capacity_kwh?: number;
          connector_types?: string[];
        };
      };
      charging_sessions: {
        Row: {
          id: string;
          user_id: string;
          station_id: string;
          station_name: string;
          network: string;
          connector_type: string;
          started_at: string;
          ended_at: string | null;
          energy_kwh: number;
          cost_tl: number;
          status: 'active' | 'completed' | 'cancelled';
        };
        Insert: {
          id?: string;
          user_id: string;
          station_id: string;
          station_name: string;
          network: string;
          connector_type: string;
          started_at?: string;
          ended_at?: string | null;
          energy_kwh?: number;
          cost_tl?: number;
          status?: 'active' | 'completed' | 'cancelled';
        };
        Update: {
          ended_at?: string | null;
          energy_kwh?: number;
          cost_tl?: number;
          status?: 'active' | 'completed' | 'cancelled';
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          station_ocm_id: string;
          station_name: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          station_ocm_id: string;
          station_name: string;
        };
        Update: never;
      };
    };
  };
}
