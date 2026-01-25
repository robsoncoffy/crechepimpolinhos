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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          success: boolean
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          success?: boolean
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          success?: boolean
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          all_classes: boolean | null
          child_id: string | null
          class_type: Database["public"]["Enums"]["class_type"] | null
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_classes?: boolean | null
          child_id?: string | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_classes?: boolean | null
          child_id?: string | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          asaas_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          external_reference: string | null
          id: string
          linked_parent_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          asaas_id: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          external_reference?: string | null
          id?: string
          linked_parent_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          asaas_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          external_reference?: string | null
          id?: string
          linked_parent_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_linked_parent_id_fkey"
            columns: ["linked_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      asaas_payments: {
        Row: {
          asaas_customer_id: string
          asaas_id: string
          asaas_subscription_id: string | null
          bank_slip_url: string | null
          billing_type: string | null
          created_at: string
          description: string | null
          due_date: string
          external_reference: string | null
          id: string
          invoice_url: string | null
          linked_child_id: string | null
          linked_parent_id: string | null
          net_value: number | null
          payment_date: string | null
          pix_code: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id: string
          asaas_id: string
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          linked_child_id?: string | null
          linked_parent_id?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_code?: string | null
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          asaas_customer_id?: string
          asaas_id?: string
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          linked_child_id?: string | null
          linked_parent_id?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_code?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_linked_parent_id_fkey"
            columns: ["linked_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      asaas_subscriptions: {
        Row: {
          asaas_customer_id: string
          asaas_id: string
          billing_cycle: string | null
          created_at: string
          description: string | null
          external_reference: string | null
          id: string
          linked_child_id: string | null
          linked_parent_id: string | null
          next_due_date: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id: string
          asaas_id: string
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          linked_child_id?: string | null
          linked_parent_id?: string | null
          next_due_date?: string | null
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          asaas_customer_id?: string
          asaas_id?: string
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          linked_child_id?: string | null
          linked_parent_id?: string | null
          next_due_date?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_subscriptions_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_subscriptions_linked_parent_id_fkey"
            columns: ["linked_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance: {
        Row: {
          arrival_time: string | null
          child_id: string
          created_at: string
          date: string
          departure_time: string | null
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          child_id: string
          created_at?: string
          date?: string
          departure_time?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          child_id?: string
          created_at?: string
          date?: string
          departure_time?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
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
          plan_type: Database["public"]["Enums"]["plan_type"] | null
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
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
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
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
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
          dietary_restrictions: string | null
          food_preferences: string | null
          full_name: string
          id: string
          medical_info: string | null
          pediatrician_name: string | null
          pediatrician_phone: string | null
          photo_url: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          special_milk: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          authorized_pickups?: string[] | null
          birth_date: string
          class_type: Database["public"]["Enums"]["class_type"]
          created_at?: string
          dietary_restrictions?: string | null
          food_preferences?: string | null
          full_name: string
          id?: string
          medical_info?: string | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_url?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          special_milk?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          authorized_pickups?: string[] | null
          birth_date?: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          dietary_restrictions?: string | null
          food_preferences?: string | null
          full_name?: string
          id?: string
          medical_info?: string | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_url?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          special_milk?: string | null
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
          mood: Database["public"]["Enums"]["mood_status"] | null
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
          mood?: Database["public"]["Enums"]["mood_status"] | null
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
          mood?: Database["public"]["Enums"]["mood_status"] | null
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
      discount_coupons: {
        Row: {
          applicable_classes: string[] | null
          applicable_plans: string[] | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_classes?: string[] | null
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_classes?: string[] | null
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc: string | null
          created_at: string
          direction: string
          from_address: string | null
          gmail_id: string | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          labels: string[] | null
          received_at: string | null
          sent_at: string | null
          snippet: string | null
          subject: string | null
          thread_id: string | null
          to_address: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction: string
          from_address?: string | null
          gmail_id?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          received_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_address?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction?: string
          from_address?: string | null
          gmail_id?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          received_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body_html: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body_html?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      employee_absences: {
        Row: {
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          bucket_id: string
          created_at: string
          created_by: string | null
          doc_type: string
          employee_user_id: string
          file_path: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          created_by?: string | null
          doc_type: string
          employee_user_id: string
          file_path: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          employee_user_id?: string
          file_path?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_email: string | null
          employee_name: string | null
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
          employee_email?: string | null
          employee_name?: string | null
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
          employee_email?: string | null
          employee_name?: string | null
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
          net_salary: number | null
          phone: string | null
          photo_url: string | null
          pis_pasep: string | null
          pix_key: string | null
          place_of_birth: string | null
          rg: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          salary: number | null
          salary_payment_day: number | null
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
          net_salary?: number | null
          phone?: string | null
          photo_url?: string | null
          pis_pasep?: string | null
          pix_key?: string | null
          place_of_birth?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          salary?: number | null
          salary_payment_day?: number | null
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
          net_salary?: number | null
          phone?: string | null
          photo_url?: string | null
          pis_pasep?: string | null
          pix_key?: string | null
          place_of_birth?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          salary?: number | null
          salary_payment_day?: number | null
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
      employee_time_clock: {
        Row: {
          clock_type: Database["public"]["Enums"]["clock_type"]
          created_at: string
          created_by: string | null
          device_id: string | null
          employee_id: string | null
          id: string
          location: string | null
          notes: string | null
          photo_url: string | null
          source: Database["public"]["Enums"]["clock_source"]
          timestamp: string
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          clock_type: Database["public"]["Enums"]["clock_type"]
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          employee_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          source?: Database["public"]["Enums"]["clock_source"]
          timestamp?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          clock_type?: Database["public"]["Enums"]["clock_type"]
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          employee_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          source?: Database["public"]["Enums"]["clock_source"]
          timestamp?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_clock_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_contracts: {
        Row: {
          child_id: string | null
          child_name: string
          class_type: string | null
          created_at: string | null
          id: string
          parent_id: string
          plan_type: string | null
          registration_id: string | null
          sent_at: string | null
          shift_type: string | null
          signed_at: string | null
          status: string | null
          updated_at: string | null
          zapsign_doc_token: string | null
          zapsign_doc_url: string | null
          zapsign_signer_token: string | null
        }
        Insert: {
          child_id?: string | null
          child_name: string
          class_type?: string | null
          created_at?: string | null
          id?: string
          parent_id: string
          plan_type?: string | null
          registration_id?: string | null
          sent_at?: string | null
          shift_type?: string | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          zapsign_doc_token?: string | null
          zapsign_doc_url?: string | null
          zapsign_signer_token?: string | null
        }
        Update: {
          child_id?: string | null
          child_name?: string
          class_type?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string
          plan_type?: string | null
          registration_id?: string | null
          sent_at?: string | null
          shift_type?: string | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          zapsign_doc_token?: string | null
          zapsign_doc_url?: string | null
          zapsign_signer_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_contracts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_contracts_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "child_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          due_day: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
          value: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          due_day: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          due_day?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          value?: number
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
      invoices: {
        Row: {
          asaas_payment_id: string | null
          bank_slip_url: string | null
          child_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          invoice_url: string | null
          parent_id: string
          payment_date: string | null
          payment_type: string | null
          pix_code: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          child_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          invoice_url?: string | null
          parent_id: string
          payment_date?: string | null
          payment_type?: string | null
          pix_code?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          child_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          invoice_url?: string | null
          parent_id?: string
          payment_date?: string | null
          payment_type?: string | null
          pix_code?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_tracking: {
        Row: {
          afternoon_snack_served: boolean | null
          afternoon_snack_time: string | null
          breakfast_served: boolean | null
          breakfast_time: string | null
          child_id: string
          created_at: string | null
          dinner_served: boolean | null
          dinner_time: string | null
          id: string
          lunch_served: boolean | null
          lunch_time: string | null
          meal_date: string
          morning_snack_served: boolean | null
          morning_snack_time: string | null
          recorded_by: string | null
          special_diet_notes: string | null
          updated_at: string | null
        }
        Insert: {
          afternoon_snack_served?: boolean | null
          afternoon_snack_time?: string | null
          breakfast_served?: boolean | null
          breakfast_time?: string | null
          child_id: string
          created_at?: string | null
          dinner_served?: boolean | null
          dinner_time?: string | null
          id?: string
          lunch_served?: boolean | null
          lunch_time?: string | null
          meal_date?: string
          morning_snack_served?: boolean | null
          morning_snack_time?: string | null
          recorded_by?: string | null
          special_diet_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          afternoon_snack_served?: boolean | null
          afternoon_snack_time?: string | null
          breakfast_served?: boolean | null
          breakfast_time?: string | null
          child_id?: string
          created_at?: string | null
          dinner_served?: boolean | null
          dinner_time?: string | null
          id?: string
          lunch_served?: boolean | null
          lunch_time?: string | null
          meal_date?: string
          morning_snack_served?: boolean | null
          morning_snack_time?: string | null
          recorded_by?: string | null
          special_diet_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_tracking_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_type: string | null
          child_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          channel_type?: string | null
          child_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          channel_type?: string | null
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
      parent_invites: {
        Row: {
          child_name: string | null
          coupon_code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          invite_code: string
          notes: string | null
          phone: string | null
          pre_enrollment_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          child_name?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          notes?: string | null
          phone?: string | null
          pre_enrollment_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          child_name?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          notes?: string | null
          phone?: string | null
          pre_enrollment_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_invites_pre_enrollment_id_fkey"
            columns: ["pre_enrollment_id"]
            isOneToOne: false
            referencedRelation: "pre_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_customers: {
        Row: {
          asaas_customer_id: string
          created_at: string
          id: string
          parent_id: string
          updated_at: string
        }
        Insert: {
          asaas_customer_id: string
          created_at?: string
          id?: string
          parent_id: string
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_notification_log: {
        Row: {
          id: string
          notification_type: string
          payment_asaas_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          payment_asaas_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          payment_asaas_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_payslip_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          label: string
          payslip_id: string
          sort_order: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kind: string
          label: string
          payslip_id: string
          sort_order?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          payslip_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payslip_lines_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payroll_payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payslips: {
        Row: {
          base_salary: number
          created_at: string
          created_by: string | null
          employee_user_id: string
          hours_worked: number
          id: string
          net_salary: number | null
          overtime_hours: number
          period_month: number
          period_year: number
          status: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          created_at?: string
          created_by?: string | null
          employee_user_id: string
          hours_worked?: number
          id?: string
          net_salary?: number | null
          overtime_hours?: number
          period_month: number
          period_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          created_at?: string
          created_by?: string | null
          employee_user_id?: string
          hours_worked?: number
          id?: string
          net_salary?: number | null
          overtime_hours?: number
          period_month?: number
          period_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          converted_to_invite_id: string | null
          cpf: string | null
          created_at: string
          desired_class_type: Database["public"]["Enums"]["class_type"]
          desired_shift_type: Database["public"]["Enums"]["shift_type"]
          email: string
          ghl_contact_id: string | null
          ghl_sync_error: string | null
          ghl_synced_at: string | null
          how_heard_about: string | null
          id: string
          notes: string | null
          parent_name: string
          phone: string
          status: string
          updated_at: string
          vacancy_type: Database["public"]["Enums"]["vacancy_type"]
        }
        Insert: {
          child_birth_date: string
          child_name: string
          converted_to_invite_id?: string | null
          cpf?: string | null
          created_at?: string
          desired_class_type: Database["public"]["Enums"]["class_type"]
          desired_shift_type: Database["public"]["Enums"]["shift_type"]
          email: string
          ghl_contact_id?: string | null
          ghl_sync_error?: string | null
          ghl_synced_at?: string | null
          how_heard_about?: string | null
          id?: string
          notes?: string | null
          parent_name: string
          phone: string
          status?: string
          updated_at?: string
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Update: {
          child_birth_date?: string
          child_name?: string
          converted_to_invite_id?: string | null
          cpf?: string | null
          created_at?: string
          desired_class_type?: Database["public"]["Enums"]["class_type"]
          desired_shift_type?: Database["public"]["Enums"]["shift_type"]
          email?: string
          ghl_contact_id?: string | null
          ghl_sync_error?: string | null
          ghl_synced_at?: string | null
          how_heard_about?: string | null
          id?: string
          notes?: string | null
          parent_name?: string
          phone?: string
          status?: string
          updated_at?: string
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pre_enrollments_converted_to_invite_id_fkey"
            columns: ["converted_to_invite_id"]
            isOneToOne: false
            referencedRelation: "parent_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          relationship: string | null
          rg: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          relationship?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          relationship?: string | null
          rg?: string | null
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
      quarterly_evaluations: {
        Row: {
          child_id: string
          cognitive_development: string | null
          created_at: string | null
          creativity_arts: string | null
          id: string
          language_development: string | null
          motor_development: string | null
          next_steps: string | null
          overall_summary: string | null
          pedagogue_id: string
          quarter: number
          recommendations: string | null
          social_emotional: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          child_id: string
          cognitive_development?: string | null
          created_at?: string | null
          creativity_arts?: string | null
          id?: string
          language_development?: string | null
          motor_development?: string | null
          next_steps?: string | null
          overall_summary?: string | null
          pedagogue_id: string
          quarter: number
          recommendations?: string | null
          social_emotional?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          child_id?: string
          cognitive_development?: string | null
          created_at?: string | null
          creativity_arts?: string | null
          id?: string
          language_development?: string | null
          motor_development?: string | null
          next_steps?: string | null
          overall_summary?: string | null
          pedagogue_id?: string
          quarter?: number
          recommendations?: string | null
          social_emotional?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_evaluations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_cards: {
        Row: {
          asaas_customer_id: string
          card_brand: string | null
          created_at: string
          credit_card_token: string
          holder_name: string | null
          id: string
          is_default: boolean | null
          last_four_digits: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id: string
          card_brand?: string | null
          created_at?: string
          credit_card_token: string
          holder_name?: string | null
          id?: string
          is_default?: boolean | null
          last_four_digits?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string
          card_brand?: string | null
          created_at?: string
          credit_card_token?: string
          holder_name?: string | null
          id?: string
          is_default?: boolean | null
          last_four_digits?: string | null
          updated_at?: string
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
      school_feed: {
        Row: {
          all_classes: boolean | null
          class_type: Database["public"]["Enums"]["class_type"] | null
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          updated_at: string
        }
        Insert: {
          all_classes?: boolean | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Update: {
          all_classes?: boolean | null
          class_type?: Database["public"]["Enums"]["class_type"] | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          added_by: string | null
          added_by_role: string
          checked: boolean
          created_at: string
          id: string
          name: string
          quantity: string
          unit: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          added_by_role?: string
          checked?: boolean
          created_at?: string
          id?: string
          name: string
          quantity?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          added_by_role?: string
          checked?: boolean
          created_at?: string
          id?: string
          name?: string
          quantity?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_general: boolean | null
          is_private: boolean | null
          name: string
          participant_1: string | null
          participant_2: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_general?: boolean | null
          is_private?: boolean | null
          name: string
          participant_1?: string | null
          participant_2?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_general?: boolean | null
          is_private?: boolean | null
          name?: string
          participant_1?: string | null
          participant_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "staff_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          asaas_subscription_id: string | null
          billing_day: number
          child_id: string
          created_at: string
          id: string
          parent_id: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_subscription_id?: string | null
          billing_day?: number
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          asaas_subscription_id?: string | null
          billing_day?: number
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string
          id: string
          is_primary: boolean | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          class_type: Database["public"]["Enums"]["class_type"]
          created_at?: string
          id?: string
          is_primary?: boolean | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          id?: string
          is_primary?: boolean | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_clock_config: {
        Row: {
          break_duration_minutes: number
          created_at: string
          device_ip: string | null
          device_name: string
          id: string
          is_active: boolean
          tolerance_minutes: number
          updated_at: string
          webhook_secret: string | null
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          break_duration_minutes?: number
          created_at?: string
          device_ip?: string | null
          device_name?: string
          id?: string
          is_active?: boolean
          tolerance_minutes?: number
          updated_at?: string
          webhook_secret?: string | null
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          break_duration_minutes?: number
          created_at?: string
          device_ip?: string | null
          device_name?: string
          id?: string
          is_active?: boolean
          tolerance_minutes?: number
          updated_at?: string
          webhook_secret?: string | null
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: []
      }
      time_clock_setup_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          order_index: number
          task_key: string
          task_label: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          order_index?: number
          task_key: string
          task_label: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          order_index?: number
          task_key?: string
          task_label?: string
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
      weekly_activity_plans: {
        Row: {
          afternoon_activities: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string | null
          created_by: string | null
          day_of_week: number
          id: string
          learning_objectives: string | null
          materials_needed: string | null
          morning_activities: string | null
          notes: string | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          afternoon_activities?: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          id?: string
          learning_objectives?: string | null
          materials_needed?: string | null
          morning_activities?: string | null
          notes?: string | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          afternoon_activities?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          id?: string
          learning_objectives?: string | null
          materials_needed?: string | null
          morning_activities?: string | null
          notes?: string | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
      weekly_menus: {
        Row: {
          bottle: string | null
          bottle_qty: string | null
          bottle_time: string | null
          breakfast: string | null
          breakfast_qty: string | null
          breakfast_time: string | null
          created_at: string | null
          day_of_week: number
          dinner: string | null
          dinner_qty: string | null
          dinner_time: string | null
          id: string
          lunch: string | null
          lunch_qty: string | null
          lunch_time: string | null
          menu_type: string
          morning_snack: string | null
          morning_snack_qty: string | null
          morning_snack_time: string | null
          notes: string | null
          nutrition_data: Json | null
          pre_dinner: string | null
          pre_dinner_qty: string | null
          pre_dinner_time: string | null
          snack: string | null
          snack_qty: string | null
          snack_time: string | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          bottle?: string | null
          bottle_qty?: string | null
          bottle_time?: string | null
          breakfast?: string | null
          breakfast_qty?: string | null
          breakfast_time?: string | null
          created_at?: string | null
          day_of_week: number
          dinner?: string | null
          dinner_qty?: string | null
          dinner_time?: string | null
          id?: string
          lunch?: string | null
          lunch_qty?: string | null
          lunch_time?: string | null
          menu_type?: string
          morning_snack?: string | null
          morning_snack_qty?: string | null
          morning_snack_time?: string | null
          notes?: string | null
          nutrition_data?: Json | null
          pre_dinner?: string | null
          pre_dinner_qty?: string | null
          pre_dinner_time?: string | null
          snack?: string | null
          snack_qty?: string | null
          snack_time?: string | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          bottle?: string | null
          bottle_qty?: string | null
          bottle_time?: string | null
          breakfast?: string | null
          breakfast_qty?: string | null
          breakfast_time?: string | null
          created_at?: string | null
          day_of_week?: number
          dinner?: string | null
          dinner_qty?: string | null
          dinner_time?: string | null
          id?: string
          lunch?: string | null
          lunch_qty?: string | null
          lunch_time?: string | null
          menu_type?: string
          morning_snack?: string | null
          morning_snack_qty?: string | null
          morning_snack_time?: string | null
          notes?: string | null
          nutrition_data?: Json | null
          pre_dinner?: string | null
          pre_dinner_qty?: string | null
          pre_dinner_time?: string | null
          snack?: string | null
          snack_qty?: string | null
          snack_time?: string | null
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
      notify_admins: {
        Args: { _link: string; _message: string; _title: string; _type: string }
        Returns: undefined
      }
      parent_has_child_access: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "teacher"
        | "parent"
        | "cook"
        | "nutritionist"
        | "pedagogue"
        | "auxiliar"
      approval_status: "pending" | "approved" | "rejected"
      class_type: "bercario" | "maternal" | "jardim"
      clock_source: "controlid" | "manual" | "mobile"
      clock_type: "entry" | "exit" | "break_start" | "break_end"
      evacuation_status: "normal" | "pastosa" | "liquida" | "nao"
      meal_status: "tudo" | "quase_tudo" | "metade" | "pouco" | "nao_aceitou"
      mood_status: "feliz" | "calmo" | "agitado" | "choroso" | "sonolento"
      plan_type: "basico" | "intermediario" | "plus"
      shift_type: "manha" | "tarde" | "integral"
      vacancy_type: "municipal" | "particular"
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
      app_role: [
        "admin",
        "teacher",
        "parent",
        "cook",
        "nutritionist",
        "pedagogue",
        "auxiliar",
      ],
      approval_status: ["pending", "approved", "rejected"],
      class_type: ["bercario", "maternal", "jardim"],
      clock_source: ["controlid", "manual", "mobile"],
      clock_type: ["entry", "exit", "break_start", "break_end"],
      evacuation_status: ["normal", "pastosa", "liquida", "nao"],
      meal_status: ["tudo", "quase_tudo", "metade", "pouco", "nao_aceitou"],
      mood_status: ["feliz", "calmo", "agitado", "choroso", "sonolento"],
      plan_type: ["basico", "intermediario", "plus"],
      shift_type: ["manha", "tarde", "integral"],
      vacancy_type: ["municipal", "particular"],
    },
  },
} as const
