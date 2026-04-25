export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
        Relationships: [];
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
          range_km: number;
          max_charge_kw: number;
          is_togg: boolean;
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
          range_km?: number;
          max_charge_kw?: number;
          is_togg?: boolean;
          created_at?: string;
        };
        Update: {
          brand?: string;
          model?: string;
          year?: number;
          battery_capacity_kwh?: number;
          connector_types?: string[];
          range_km?: number;
          max_charge_kw?: number;
          is_togg?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          status: "active" | "completed" | "cancelled";
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
          status?: "active" | "completed" | "cancelled";
        };
        Update: {
          ended_at?: string | null;
          energy_kwh?: number;
          cost_tl?: number;
          status?: "active" | "completed" | "cancelled";
        };
        Relationships: [
          {
            foreignKeyName: "charging_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          station_ocm_id: string;
          station_name: string;
          network: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          station_ocm_id: string;
          station_name: string;
          network?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          added_at?: string;
        };
        Update: {
          station_name?: string;
          network?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          charge_complete: boolean;
          station_available: boolean;
          price_change: boolean;
          new_station: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          charge_complete?: boolean;
          station_available?: boolean;
          price_change?: boolean;
          new_station?: boolean;
          updated_at?: string;
        };
        Update: {
          charge_complete?: boolean;
          station_available?: boolean;
          price_change?: boolean;
          new_station?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
