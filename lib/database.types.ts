export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      divisions: {
        Row: { created_at: string; id: string; name: string; sort: number; tournament_id: string }
        Insert: { created_at?: string; id?: string; name: string; sort?: number; tournament_id: string }
        Update: { created_at?: string; id?: string; name?: string; sort?: number; tournament_id?: string }
        Relationships: []
      }
      fields: {
        Row: {
          allowed_divisions: string[]
          created_at: string
          fence_distance: number | null
          id: string
          lights: boolean
          name: string
          site_id: string | null
          surface: string | null
          tournament_id: string
        }
        Insert: {
          allowed_divisions?: string[]
          created_at?: string
          fence_distance?: number | null
          id?: string
          lights?: boolean
          name: string
          site_id?: string | null
          surface?: string | null
          tournament_id: string
        }
        Update: {
          allowed_divisions?: string[]
          created_at?: string
          fence_distance?: number | null
          id?: string
          lights?: boolean
          name?: string
          site_id?: string | null
          surface?: string | null
          tournament_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: { created_at: string; follower_id: string; team_id: string; tournament_id: string }
        Insert: { created_at?: string; follower_id: string; team_id: string; tournament_id: string }
        Update: { created_at?: string; follower_id?: string; team_id?: string; tournament_id?: string }
        Relationships: []
      }
      games: {
        Row: {
          away_score: number | null
          away_seed: number | null
          away_team_id: string | null
          bracket_slot: string | null
          created_at: string
          division_id: string | null
          field_id: string | null
          home_score: number | null
          home_seed: number | null
          home_team_id: string | null
          id: string
          pool_id: string | null
          round: number
          scheduled_at: string | null
          stage: string
          status: string
          tournament_id: string
        }
        Insert: {
          away_score?: number | null
          away_seed?: number | null
          away_team_id?: string | null
          bracket_slot?: string | null
          created_at?: string
          division_id?: string | null
          field_id?: string | null
          home_score?: number | null
          home_seed?: number | null
          home_team_id?: string | null
          id?: string
          pool_id?: string | null
          round?: number
          scheduled_at?: string | null
          stage?: string
          status?: string
          tournament_id: string
        }
        Update: {
          away_score?: number | null
          away_seed?: number | null
          away_team_id?: string | null
          bracket_slot?: string | null
          created_at?: string
          division_id?: string | null
          field_id?: string | null
          home_score?: number | null
          home_seed?: number | null
          home_team_id?: string | null
          id?: string
          pool_id?: string | null
          round?: number
          scheduled_at?: string | null
          stage?: string
          status?: string
          tournament_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json
          recipient_count: number
          title: string | null
          tournament_id: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          recipient_count?: number
          title?: string | null
          tournament_id: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          recipient_count?: number
          title?: string | null
          tournament_id?: string
          type?: string
        }
        Relationships: []
      }
      pool_teams: {
        Row: { pool_id: string; team_id: string; tournament_id: string }
        Insert: { pool_id: string; team_id: string; tournament_id: string }
        Update: { pool_id?: string; team_id?: string; tournament_id?: string }
        Relationships: []
      }
      pools: {
        Row: { created_at: string; division_id: string | null; id: string; name: string; tournament_id: string }
        Insert: { created_at?: string; division_id?: string | null; id?: string; name: string; tournament_id: string }
        Update: { created_at?: string; division_id?: string | null; id?: string; name?: string; tournament_id?: string }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; full_name: string | null; id: string; phone: string | null; role: string }
        Insert: { created_at?: string; full_name?: string | null; id: string; phone?: string | null; role?: string }
        Update: { created_at?: string; full_name?: string | null; id?: string; phone?: string | null; role?: string }
        Relationships: []
      }
      sites: {
        Row: {
          address: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          parking_info: string | null
          tournament_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          parking_info?: string | null
          tournament_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          parking_info?: string | null
          tournament_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          division_id: string | null
          id: string
          manager_id: string | null
          name: string
          seed: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          id?: string
          manager_id?: string | null
          name: string
          seed?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          division_id?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          seed?: number | null
          tournament_id?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string
          director_id: string
          end_date: string | null
          format: Json
          id: string
          location: string | null
          name: string
          rules: Json
          sport: string
          start_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          director_id: string
          end_date?: string | null
          format?: Json
          id?: string
          location?: string | null
          name: string
          rules?: Json
          sport?: string
          start_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          director_id?: string
          end_date?: string | null
          format?: Json
          id?: string
          location?: string | null
          name?: string
          rules?: Json
          sport?: string
          start_date?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      owns_tournament: { Args: { t_id: string }; Returns: boolean }
      tournament_public: { Args: { t_id: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
