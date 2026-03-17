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
      budget_provisions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          month: string
          name: string
          notes: string | null
          recurrence: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          month: string
          name: string
          notes?: string | null
          recurrence: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          month?: string
          name?: string
          notes?: string | null
          recurrence?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_provisions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_provisions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
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
      financial_scores: {
        Row: {
          ai_tip: string | null
          breakdown: Json
          created_at: string
          id: string
          score: number
          user_id: string
          week_start: string
        }
        Insert: {
          ai_tip?: string | null
          breakdown: Json
          created_at?: string
          id?: string
          score: number
          user_id: string
          week_start: string
        }
        Update: {
          ai_tip?: string | null
          breakdown?: Json
          created_at?: string
          id?: string
          score?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          deadline: string | null
          icon: string | null
          id: string
          name: string
          status: string
          target_amount: number
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          icon?: string | null
          id?: string
          name: string
          status?: string
          target_amount: number
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          icon?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_wallet_id_fkey"
            columns: ["wallet_id"]
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
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          budget_provision_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          goal_contribution_id?: string | null
          id?: string
          income_source_id?: string | null
          recurring_expense_id?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          budget_provision_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          goal_contribution_id?: string | null
          id?: string
          income_source_id?: string | null
          recurring_expense_id?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_budget_provision_id_fkey"
            columns: ["budget_provision_id"]
            isOneToOne: false
            referencedRelation: "budget_provisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_goal_contribution_id_fkey"
            columns: ["goal_contribution_id"]
            isOneToOne: false
            referencedRelation: "goal_contributions"
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
            foreignKeyName: "ledger_entries_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
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
      profiles: {
        Row: {
          created_at: string
          first_name: string
          last_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name: string
          last_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          last_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          billing_day: number
          billing_month: number | null
          category_id: string | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          billing_day: number
          billing_month?: number | null
          category_id?: string | null
          created_at?: string
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          type: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          billing_day?: number
          billing_month?: number | null
          category_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_wallet_id_fkey"
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
          session_timeout_minutes: number
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
          session_timeout_minutes?: number
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
          session_timeout_minutes?: number
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
      wishes: {
        Row: {
          ai_advice: string | null
          confidence_level: string | null
          confidence_reason: string | null
          created_at: string
          estimated_amount: number
          estimated_purchase_date: string | null
          id: string
          is_purchased: boolean
          last_ai_advice_at: string | null
          last_calculated_at: string | null
          name: string
          notes: string | null
          priority: number
          purchased_at: string | null
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          ai_advice?: string | null
          confidence_level?: string | null
          confidence_reason?: string | null
          created_at?: string
          estimated_amount: number
          estimated_purchase_date?: string | null
          id?: string
          is_purchased?: boolean
          last_ai_advice_at?: string | null
          last_calculated_at?: string | null
          name: string
          notes?: string | null
          priority: number
          purchased_at?: string | null
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          ai_advice?: string | null
          confidence_level?: string | null
          confidence_reason?: string | null
          created_at?: string
          estimated_amount?: number
          estimated_purchase_date?: string | null
          id?: string
          is_purchased?: boolean
          last_ai_advice_at?: string | null
          last_calculated_at?: string | null
          name?: string
          notes?: string | null
          priority?: number
          purchased_at?: string | null
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishes_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_goal_contribution: {
        Args: {
          contribution_amount: number
          contribution_note?: string
          target_date: string
          target_goal_id: string
          target_wallet_id: string
        }
        Returns: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "goal_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bootstrap_user_defaults: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      bootstrap_user_profile: {
        Args: { target_metadata: Json; target_user_id: string }
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
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
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
      create_budget_provision: {
        Args: {
          planned_amount: number
          provision_name: string
          target_category_id?: string
          target_month: string
          target_notes?: string
          target_recurrence?: string
          target_wallet_id: string
        }
        Returns: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          month: string
          name: string
          notes: string | null
          recurrence: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "budget_provisions"
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
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
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
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
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
      create_recurring_expense: {
        Args: {
          committed_amount: number
          expense_frequency: string
          expense_name: string
          expense_type: string
          target_billing_day: number
          target_billing_month?: number
          target_category_id?: string
          target_notes?: string
          target_wallet_id: string
        }
        Returns: {
          amount: number
          billing_day: number
          billing_month: number | null
          category_id: string | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recurring_expenses"
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
      settle_budget_provision: {
        Args: {
          payment_amount: number
          payment_description?: string
          target_budget_provision_id: string
          target_payment_date: string
        }
        Returns: {
          amount: number
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
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
      settle_recurring_expense: {
        Args: {
          payment_amount: number
          payment_description?: string
          target_payment_date: string
          target_recurring_expense_id: string
        }
        Returns: {
          amount: number
          budget_provision_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          goal_contribution_id: string | null
          id: string
          income_source_id: string | null
          recurring_expense_id: string | null
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
