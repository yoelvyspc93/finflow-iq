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
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      currency_exchanges: {
        Row: {
          created_at: string
          description: string | null
          exchange_in_entry_id: string
          exchange_out_entry_id: string
          exchange_rate: number
          from_amount: number
          from_wallet_id: string
          id: string
          to_amount: number
          to_wallet_id: string
          transfer_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exchange_in_entry_id: string
          exchange_out_entry_id: string
          exchange_rate: number
          from_amount: number
          from_wallet_id: string
          id?: string
          to_amount: number
          to_wallet_id: string
          transfer_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exchange_in_entry_id?: string
          exchange_out_entry_id?: string
          exchange_rate?: number
          from_amount?: number
          from_wallet_id?: string
          id?: string
          to_amount?: number
          to_wallet_id?: string
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_exchanges_exchange_in_entry_id_fkey"
            columns: ["exchange_in_entry_id"]
            isOneToOne: true
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchanges_exchange_out_entry_id_fkey"
            columns: ["exchange_out_entry_id"]
            isOneToOne: true
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchanges_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchanges_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          income_source_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          income_source_id?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          income_source_id?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_income_source_id_fkey"
            columns: ["income_source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          salary_payment_id: string
          salary_period_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          salary_payment_id: string
          salary_period_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          salary_payment_id?: string
          salary_period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_allocations_salary_payment_id_fkey"
            columns: ["salary_payment_id"]
            isOneToOne: false
            referencedRelation: "salary_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_allocations_salary_period_id_fkey"
            columns: ["salary_period_id"]
            isOneToOne: false
            referencedRelation: "salary_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          allocated_amount: number
          created_at: string
          currency: string
          description: string | null
          gross_amount: number
          id: string
          ledger_entry_id: string
          payment_date: string
          status: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          allocated_amount?: number
          created_at?: string
          currency: string
          description?: string | null
          gross_amount: number
          id?: string
          ledger_entry_id: string
          payment_date: string
          status?: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          gross_amount?: number
          id?: string
          ledger_entry_id?: string
          payment_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: true
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_periods: {
        Row: {
          covered_amount: number
          created_at: string
          currency: string
          expected_amount: number
          id: string
          notes: string | null
          period_month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          covered_amount?: number
          created_at?: string
          currency: string
          expected_amount: number
          id?: string
          notes?: string | null
          period_month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          covered_amount?: number
          created_at?: string
          currency?: string
          expected_amount?: number
          id?: string
          notes?: string | null
          period_month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          ai_analysis_frequency: string
          alert_level: string
          avg_months_without_payment: number
          created_at: string
          date_format: string
          financial_month_start_day: number
          id: string
          primary_currency: string
          salary_reference_amount: number | null
          savings_goal_percent: number
          subscription_alert_days: number
          theme: string
          updated_at: string
          usd_cup_rate: number | null
          user_id: string
          weekly_summary_day: string
        }
        Insert: {
          ai_analysis_frequency?: string
          alert_level?: string
          avg_months_without_payment?: number
          created_at?: string
          date_format?: string
          financial_month_start_day?: number
          id?: string
          primary_currency?: string
          salary_reference_amount?: number | null
          savings_goal_percent?: number
          subscription_alert_days?: number
          theme?: string
          updated_at?: string
          usd_cup_rate?: number | null
          user_id: string
          weekly_summary_day?: string
        }
        Update: {
          ai_analysis_frequency?: string
          alert_level?: string
          avg_months_without_payment?: number
          created_at?: string
          date_format?: string
          financial_month_start_day?: number
          id?: string
          primary_currency?: string
          salary_reference_amount?: number | null
          savings_goal_percent?: number
          subscription_alert_days?: number
          theme?: string
          updated_at?: string
          usd_cup_rate?: number | null
          user_id?: string
          weekly_summary_day?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string | null
          created_at?: string
          currency: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_user_defaults: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      create_adjustment: {
        Args: {
          entry_date: string
          entry_description?: string
          signed_amount: number
          target_wallet_id: string
        }
        Returns: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          income_source_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_expense: {
        Args: {
          entry_date: string
          entry_description?: string
          gross_amount: number
          target_category_id?: string
          target_wallet_id: string
        }
        Returns: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          income_source_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_manual_income: {
        Args: {
          entry_date: string
          entry_description?: string
          gross_amount: number
          target_income_source_id?: string
          target_wallet_id: string
        }
        Returns: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          income_source_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_salary_period: {
        Args: {
          expected_salary_amount: number
          target_currency: string
          target_notes?: string
          target_period_month: string
        }
        Returns: {
          covered_amount: number
          created_at: string
          currency: string
          expected_amount: number
          id: string
          notes: string | null
          period_month: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "salary_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_wallet_balance: {
        Args: { target_wallet_id: string }
        Returns: {
          corrected: boolean
          previous_balance: number
          recalculated_balance: number
          wallet_id: string
        }[]
      }
      refresh_salary_payment_snapshot: {
        Args: { target_salary_payment_id: string }
        Returns: undefined
      }
      refresh_salary_period_snapshot: {
        Args: { target_salary_period_id: string }
        Returns: undefined
      }
      register_salary_payment: {
        Args: {
          allocation_amounts?: number[]
          allocation_period_ids?: string[]
          payment_amount: number
          payment_currency: string
          payment_description?: string
          target_payment_date: string
          target_wallet_id: string
        }
        Returns: {
          allocated_amount: number
          created_at: string
          currency: string
          description: string | null
          gross_amount: number
          id: string
          ledger_entry_id: string
          payment_date: string
          status: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "salary_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_between_wallets: {
        Args: {
          destination_amount: number
          destination_wallet_id: string
          quoted_exchange_rate: number
          source_amount: number
          source_wallet_id: string
          target_transfer_date: string
          transfer_description?: string
        }
        Returns: {
          created_at: string
          description: string | null
          exchange_in_entry_id: string
          exchange_out_entry_id: string
          exchange_rate: number
          from_amount: number
          from_wallet_id: string
          id: string
          to_amount: number
          to_wallet_id: string
          transfer_date: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "currency_exchanges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
