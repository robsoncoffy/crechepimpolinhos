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
      authorized_pickups: {
        Row: {
          created_at: string
          document_url: string | null
          full_name: string
          id: string
          is_approved: boolean | null
          registration_id: string
          relationship: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          full_name: string
          id?: string
          is_approved?: boolean | null
          registration_id: string
          relationship: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean | null
          registration_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_pickups_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "child_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      child_registrations: {
        Row: {
          address: string
          allergies: string | null
          birth_certificate_url: string | null
          birth_date: string
          city: string
          continuous_doctors: string | null
          cpf: string | null
          created_at: string
          enrollment_type: string
          first_name: string
          id: string
          last_name: string
          medications: string | null
          parent_id: string
          photo_url: string | null
          private_doctors: string | null
          rg: string | null
          status: string
          sus_card: string | null
          updated_at: string
        }
        Insert: {
          address: string
          allergies?: string | null
          birth_certificate_url?: string | null
          birth_date: string
          city: string
          continuous_doctors?: string | null
          cpf?: string | null
          created_at?: string
          enrollment_type: string
          first_name: string
          id?: string
          last_name: string
          medications?: string | null
          parent_id: string
          photo_url?: string | null
          private_doctors?: string | null
          rg?: string | null
          status?: string
          sus_card?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          allergies?: string | null
          birth_certificate_url?: string | null
          birth_date?: string
          city?: string
          continuous_doctors?: string | null
          cpf?: string | null
          created_at?: string
          enrollment_type?: string
          first_name?: string
          id?: string
          last_name?: string
          medications?: string | null
          parent_id?: string
          photo_url?: string | null
          private_doctors?: string | null
          rg?: string | null
          status?: string
          sus_card?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      employee_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          invite_code: string
          is_used: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          birth_date: string
          city: string | null
          complement: string | null
          cpf: string
          created_at: string | null
          ctps_number: string | null
          ctps_series: string | null
          ctps_state: string | null
          disability_description: string | null
          documents_url: string | null
          education_level: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          has_disability: boolean | null
          hire_date: string | null
          id: string
          job_title: string | null
          marital_status: string | null
          military_certificate: string | null
          mother_name: string | null
          nationality: string | null
          neighborhood: string | null
          phone: string | null
          photo_url: string | null
          pis_pasep: string | null
          pix_key: string | null
          place_of_birth: string | null
          rg: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          salary: number | null
          specialization: string | null
          state: string | null
          street: string | null
          street_number: string | null
          updated_at: string | null
          user_id: string
          voter_section: string | null
          voter_title: string | null
          voter_zone: string | null
          work_shift: string | null
          zip_code: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date: string
          city?: string | null
          complement?: string | null
          cpf: string
          created_at?: string | null
          ctps_number?: string | null
          ctps_series?: string | null
          ctps_state?: string | null
          disability_description?: string | null
          documents_url?: string | null
          education_level?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          has_disability?: boolean | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          marital_status?: string | null
          military_certificate?: string | null
          mother_name?: string | null
          nationality?: string | null
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          pis_pasep?: string | null
          pix_key?: string | null
          place_of_birth?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          salary?: number | null
          specialization?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string | null
          user_id: string
          voter_section?: string | null
          voter_title?: string | null
          voter_zone?: string | null
          work_shift?: string | null
          zip_code?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date?: string
          city?: string | null
          complement?: string | null
          cpf?: string
          created_at?: string | null
          ctps_number?: string | null
          ctps_series?: string | null
          ctps_state?: string | null
          disability_description?: string | null
          documents_url?: string | null
          education_level?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          has_disability?: boolean | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          marital_status?: string | null
          military_certificate?: string | null
          mother_name?: string | null
          nationality?: string | null
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          pis_pasep?: string | null
          pix_key?: string | null
          place_of_birth?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          salary?: number | null
          specialization?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string | null
          user_id?: string
          voter_section?: string | null
          voter_title?: string | null
          voter_zone?: string | null
          work_shift?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          child_id: string | null
          class_type: Database["public"]["Enums"]["class_type"] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          photo_url: string
          title: string
          updated_at: string | null
        }
        Insert: {
          child_id?: string | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          photo_url: string
          title: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          photo_url?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          child_registration_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          invited_name: string
          relationship: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          child_registration_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          invited_name: string
          relationship?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          child_registration_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_name?: string
          relationship?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_invitations_child_registration_id_fkey"
            columns: ["child_registration_id"]
            isOneToOne: false
            referencedRelation: "child_registrations"
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
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
      pickup_notifications: {
        Row: {
          child_id: string
          created_at: string
          delay_minutes: number | null
          id: string
          is_active: boolean
          message: string | null
          notification_type: string
          parent_id: string
          read_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean
          message?: string | null
          notification_type: string
          parent_id: string
          read_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean
          message?: string | null
          notification_type?: string
          parent_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_notifications_child_id_fkey"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      school_events: {
        Row: {
          all_classes: boolean | null
          class_type: Database["public"]["Enums"]["class_type"] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_classes?: boolean | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_classes?: boolean | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
          updated_at?: string | null
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
      weekly_menus: {
        Row: {
          breakfast: string | null
          created_at: string | null
          day_of_week: number
          dinner: string | null
          id: string
          lunch: string | null
          notes: string | null
          snack: string | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          breakfast?: string | null
          created_at?: string | null
          day_of_week: number
          dinner?: string | null
          id?: string
          lunch?: string | null
          notes?: string | null
          snack?: string | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          breakfast?: string | null
          created_at?: string | null
          day_of_week?: number
          dinner?: string | null
          id?: string
          lunch?: string | null
          notes?: string | null
          snack?: string | null
          updated_at?: string | null
          week_start?: string
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
