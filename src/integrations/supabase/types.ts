export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booked_at: string
          date: string
          id: string
          passenger_name: string
          passenger_phone: string
          pickup_point_id: string
          seat_number: number
          status: string
          total_price: number
          trip_id: string
        }
        Insert: {
          booked_at?: string
          date: string
          id?: string
          passenger_name: string
          passenger_phone: string
          pickup_point_id: string
          seat_number: number
          status?: string
          total_price?: number
          trip_id: string
        }
        Update: {
          booked_at?: string
          date?: string
          id?: string
          passenger_name?: string
          passenger_phone?: string
          pickup_point_id?: string
          seat_number?: number
          status?: string
          total_price?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          bearing: number
          current_stop_index: number
          driver_id: string
          id: string
          latitude: number
          longitude: number
          speed: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          bearing?: number
          current_stop_index?: number
          driver_id: string
          id?: string
          latitude: number
          longitude: number
          speed?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          bearing?: number
          current_stop_index?: number
          driver_id?: string
          id?: string
          latitude?: number
          longitude?: number
          speed?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          approval_status: string
          assigned_vehicle: string | null
          bearing: number | null
          created_at: string
          email: string | null
          id: string
          ktp_url: string | null
          last_active: string | null
          latitude: number | null
          license_number: string | null
          longitude: number | null
          name: string
          phone: string
          photo_url: string | null
          plate: string
          rating: number
          rejection_reason: string | null
          service_type: string | null
          sim_url: string | null
          status: string
          total_trips: number
          user_id: string | null
        }
        Insert: {
          approval_status?: string
          assigned_vehicle?: string | null
          bearing?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ktp_url?: string | null
          last_active?: string | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          name: string
          phone: string
          photo_url?: string | null
          plate: string
          rating?: number
          rejection_reason?: string | null
          service_type?: string | null
          sim_url?: string | null
          status?: string
          total_trips?: number
          user_id?: string | null
        }
        Update: {
          approval_status?: string
          assigned_vehicle?: string | null
          bearing?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ktp_url?: string | null
          last_active?: string | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          name?: string
          phone?: string
          photo_url?: string | null
          plate?: string
          rating?: number
          rejection_reason?: string | null
          service_type?: string | null
          sim_url?: string | null
          status?: string
          total_trips?: number
          user_id?: string | null
        }
        Relationships: []
      }
      pickup_points: {
        Row: {
          address: string | null
          capacity: number | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          label: string
          lat: number
          lng: number
          minutes_from_start: number
          name: string
          operating_hours: string | null
          order_index: number
          phone: string | null
          rayon_id: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          deleted_at?: string | null
          id: string
          is_active?: boolean | null
          label: string
          lat: number
          lng: number
          minutes_from_start?: number
          name: string
          operating_hours?: string | null
          order_index: number
          phone?: string | null
          rayon_id?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          lat?: number
          lng?: number
          minutes_from_start?: number
          name?: string
          operating_hours?: string | null
          order_index?: number
          phone?: string | null
          rayon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_points_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "rayons"
            referencedColumns: ["id"]
          },
        ]
      }
      rayons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          driver_id: string
          id: string
          passenger_name: string
          rating: number
          trip_date: string
          trip_id: string
        }
        Insert: {
          booking_id: string
          comment?: string
          created_at?: string
          driver_id: string
          id?: string
          passenger_name: string
          rating?: number
          trip_date: string
          trip_id: string
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          driver_id?: string
          id?: string
          passenger_name?: string
          rating?: number
          trip_date?: string
          trip_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          actual_completion: string | null
          base_price: number
          booked_seats: number[]
          created_at: string
          departure_date: string | null
          departure_time: string
          driver_id: string | null
          estimated_completion: string | null
          id: string
          rayon_id: string | null
          route_name: string
          start_pickup_point_id: string | null
          total_seats: number
          vehicle_type: string
        }
        Insert: {
          actual_completion?: string | null
          base_price?: number
          booked_seats?: number[]
          created_at?: string
          departure_date?: string | null
          departure_time: string
          driver_id?: string | null
          estimated_completion?: string | null
          id?: string
          rayon_id?: string | null
          route_name: string
          start_pickup_point_id?: string | null
          total_seats?: number
          vehicle_type?: string
        }
        Update: {
          actual_completion?: string | null
          base_price?: number
          booked_seats?: number[]
          created_at?: string
          departure_date?: string | null
          departure_time?: string
          driver_id?: string | null
          estimated_completion?: string | null
          id?: string
          rayon_id?: string | null
          route_name?: string
          start_pickup_point_id?: string | null
          total_seats?: number
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "rayons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_start_pickup_point_id_fkey"
            columns: ["start_pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_driver_role: { Args: { _user_id: string }; Returns: undefined }
      get_user_login_info: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "passenger"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver", "passenger"],
    },
  },
} as const
