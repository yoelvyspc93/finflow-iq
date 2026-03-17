import type { Tables, TablesUpdate } from "@/types/supabase";

export type AiAnalysisFrequency = "each_transaction" | "daily" | "manual";
export type AlertLevel = "conservative" | "normal" | "aggressive";
export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type PrimaryCurrency = "USD" | "CUP";
export type ThemeMode = "light" | "dark" | "auto";
export type SessionTimeoutMinutes = 0 | 5 | 10 | 20 | 30;
export type WeeklySummaryDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SettingsRow = Tables<"settings">;

export type AppSettings = {
  aiAnalysisFrequency: AiAnalysisFrequency;
  alertLevel: AlertLevel;
  avgMonthsWithoutPayment: number;
  createdAt: string;
  dateFormat: DateFormat;
  financialMonthStartDay: number;
  id: string;
  primaryCurrency: PrimaryCurrency;
  salaryReferenceAmount: number | null;
  savingsGoalPercent: number;
  sessionTimeoutMinutes: SessionTimeoutMinutes;
  subscriptionAlertDays: number;
  theme: ThemeMode;
  updatedAt: string;
  usdCupRate: number | null;
  userId: string;
  weeklySummaryDay: WeeklySummaryDay;
};

export type SettingsUpdateInput = Pick<
  TablesUpdate<"settings">,
  | "ai_analysis_frequency"
  | "alert_level"
  | "avg_months_without_payment"
  | "date_format"
  | "financial_month_start_day"
  | "primary_currency"
  | "salary_reference_amount"
  | "savings_goal_percent"
  | "session_timeout_minutes"
  | "subscription_alert_days"
  | "theme"
  | "usd_cup_rate"
  | "weekly_summary_day"
>;

export function mapSettings(row: SettingsRow): AppSettings {
  return {
    aiAnalysisFrequency: row.ai_analysis_frequency as AiAnalysisFrequency,
    alertLevel: row.alert_level as AlertLevel,
    avgMonthsWithoutPayment: row.avg_months_without_payment,
    createdAt: row.created_at,
    dateFormat: row.date_format as DateFormat,
    financialMonthStartDay: row.financial_month_start_day,
    id: row.id,
    primaryCurrency: row.primary_currency as PrimaryCurrency,
    salaryReferenceAmount: row.salary_reference_amount,
    savingsGoalPercent: row.savings_goal_percent,
    sessionTimeoutMinutes: row.session_timeout_minutes as SessionTimeoutMinutes,
    subscriptionAlertDays: row.subscription_alert_days,
    theme: row.theme as ThemeMode,
    updatedAt: row.updated_at,
    usdCupRate: row.usd_cup_rate,
    userId: row.user_id,
    weeklySummaryDay: row.weekly_summary_day as WeeklySummaryDay,
  };
}

export function createMockSettings(userId: string): AppSettings {
  const now = new Date().toISOString();

  return {
    aiAnalysisFrequency: "manual",
    alertLevel: "normal",
    avgMonthsWithoutPayment: 0,
    createdAt: now,
    dateFormat: "DD/MM/YYYY",
    financialMonthStartDay: 1,
    id: "dev-settings",
    primaryCurrency: "USD",
    salaryReferenceAmount: null,
    savingsGoalPercent: 20,
    sessionTimeoutMinutes: 5,
    subscriptionAlertDays: 3,
    theme: "dark",
    updatedAt: now,
    usdCupRate: null,
    userId,
    weeklySummaryDay: "monday",
  };
}
