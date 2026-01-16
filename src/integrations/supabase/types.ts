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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      children: {
        Row: {
          allergies: string | null
          authorized_pickups: string[] | null
          birth_date: string
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string
          full_name: string
          id: string
          medical_info: string | null
          pediatrician_name: string | null
          pediatrician_phone: string | null
          photo_url: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          authorized_pickups?: string[] | null
          birth_date: string
          class_type: Database["public"]["Enums"]["class_type"]
          created_at?: string
          full_name: string
          id?: string
          medical_info?: string | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_url?: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          authorized_pickups?: string[] | null
          birth_date?: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          full_name?: string
          id?: string
          medical_info?: string | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_url?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      daily_records: {
        Row: {
          activities: string | null
          breakfast: Database["public"]["Enums"]["meal_status"] | null
          child_id: string
          created_at: string
          dinner: Database["public"]["Enums"]["meal_status"] | null
          evacuated: Database["public"]["Enums"]["evacuation_status"] | null
          had_fever: boolean | null
          id: string
          lunch: Database["public"]["Enums"]["meal_status"] | null
          medicine_notes: string | null
          parent_notes: string | null
          record_date: string
          school_notes: string | null
          sleep_notes: string | null
          slept_afternoon: boolean | null
          slept_morning: boolean | null
          snack: Database["public"]["Enums"]["meal_status"] | null
          teacher_id: string | null
          temperature: number | null
          took_medicine: boolean | null
          updated_at: string
          urinated: boolean | null
        }
        Insert: {
          activities?: string | null
          breakfast?: Database["public"]["Enums"]["meal_status"] | null
          child_id: string
          created_at?: string
          dinner?: Database["public"]["Enums"]["meal_status"] | null
          evacuated?: Database["public"]["Enums"]["evacuation_status"] | null
          had_fever?: boolean | null
          id?: string
          lunch?: Database["public"]["Enums"]["meal_status"] | null
          medicine_notes?: string | null
          parent_notes?: string | null
          record_date?: string
          school_notes?: string | null
          sleep_notes?: string | null
          slept_afternoon?: boolean | null
          slept_morning?: boolean | null
          snack?: Database["public"]["Enums"]["meal_status"] | null
          teacher_id?: string | null
          temperature?: number | null
          took_medicine?: boolean | null
          updated_at?: string
          urinated?: boolean | null
        }
        Update: {
          activities?: string | null
          breakfast?: Database["public"]["Enums"]["meal_status"] | null
          child_id?: string
          created_at?: string
          dinner?: Database["public"]["Enums"]["meal_status"] | null
          evacuated?: Database["public"]["Enums"]["evacuation_status"] | null
          had_fever?: boolean | null
          id?: string
          lunch?: Database["public"]["Enums"]["meal_status"] | null
          medicine_notes?: string | null
          parent_notes?: string | null
          record_date?: string
          school_notes?: string | null
          sleep_notes?: string | null
          slept_afternoon?: boolean | null
          slept_morning?: boolean | null
          snack?: Database["public"]["Enums"]["meal_status"] | null
          teacher_id?: string | null
          temperature?: number | null
          took_medicine?: boolean | null
          updated_at?: string
          urinated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          child_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          child_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          child_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_tracking: {
        Row: {
          child_id: string
          created_at: string
          height: number | null
          id: string
          month: number
          observations: string | null
          updated_at: string
          weight: number | null
          year: number
        }
        Insert: {
          child_id: string
          created_at?: string
          height?: number | null
          id?: string
          month: number
          observations?: string | null
          updated_at?: string
          weight?: number | null
          year: number
        }
        Update: {
          child_id?: string
          created_at?: string
          height?: number | null
          id?: string
          month?: number
          observations?: string | null
          updated_at?: string
          weight?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_tracking_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_children: {
        Row: {
          child_id: string
          id: string
          parent_id: string
          relationship: string
        }
        Insert: {
          child_id: string
          id?: string
          parent_id: string
          relationship?: string
        }
        Update: {
          child_id?: string
          id?: string
          parent_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_children_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_enrollments: {
        Row: {
          child_birth_date: string
          child_name: string
          created_at: string
          desired_class_type: Database["public"]["Enums"]["class_type"]
          desired_shift_type: Database["public"]["Enums"]["shift_type"]
          email: string
          how_heard_about: string | null
          id: string
          notes: string | null
          parent_name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          child_birth_date: string
          child_name: string
          created_at?: string
          desired_class_type: Database["public"]["Enums"]["class_type"]
          desired_shift_type: Database["public"]["Enums"]["shift_type"]
          email: string
          how_heard_about?: string | null
          id?: string
          notes?: string | null
          parent_name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_birth_date?: string
          child_name?: string
          created_at?: string
          desired_class_type?: Database["public"]["Enums"]["class_type"]
          desired_shift_type?: Database["public"]["Enums"]["shift_type"]
          email?: string
          how_heard_about?: string | null
          id?: string
          notes?: string | null
          parent_name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      parent_has_child_access: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent"
      approval_status: "pending" | "approved" | "rejected"
      class_type: "bercario" | "maternal" | "jardim"
      evacuation_status: "normal" | "pastosa" | "liquida" | "nao"
      meal_status: "tudo" | "quase_tudo" | "metade" | "pouco" | "nao_aceitou"
      shift_type: "manha" | "tarde" | "integral"
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
      app_role: ["admin", "teacher", "parent"],
      approval_status: ["pending", "approved", "rejected"],
      class_type: ["bercario", "maternal", "jardim"],
      evacuation_status: ["normal", "pastosa", "liquida", "nao"],
      meal_status: ["tudo", "quase_tudo", "metade", "pouco", "nao_aceitou"],
      shift_type: ["manha", "tarde", "integral"],
    },
  },
} as const
