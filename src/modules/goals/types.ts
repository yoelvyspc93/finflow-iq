import type { Tables } from "@/types/supabase";

export type GoalRow = Tables<"goals">;
export type GoalContributionRow = Tables<"goal_contributions">;

export type GoalStatus = GoalRow["status"];

export type Goal = {
  createdAt: string;
  deadline: string | null;
  icon: string | null;
  id: string;
  name: string;
  status: GoalStatus;
  targetAmount: number;
  updatedAt: string;
  userId: string;
  walletId: string;
};

export type GoalContribution = {
  amount: number;
  createdAt: string;
  date: string;
  goalId: string;
  id: string;
  note: string | null;
  userId: string;
  walletId: string;
};

export type AddGoalContributionInput = {
  amount: number;
  date: string;
  goalId: string;
  note?: string | null;
  walletId: string;
};

export type CreateGoalInput = {
  deadline?: string | null;
  icon?: string | null;
  name: string;
  targetAmount: number;
  walletId: string;
};

export function mapGoal(row: GoalRow): Goal {
  return {
    createdAt: row.created_at,
    deadline: row.deadline,
    icon: row.icon,
    id: row.id,
    name: row.name,
    status: row.status,
    targetAmount: row.target_amount,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function mapGoalContribution(row: GoalContributionRow): GoalContribution {
  return {
    amount: row.amount,
    createdAt: row.created_at,
    date: row.date,
    goalId: row.goal_id,
    id: row.id,
    note: row.note,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createMockGoals(userId: string): Goal[] {
  const now = new Date().toISOString();

  return [
    {
      createdAt: now,
      deadline: `${new Date().getUTCFullYear()}-09-30`,
      icon: "shield",
      id: "mock-goal-emergency-fund",
      name: "Fondo de emergencia",
      status: "active",
      targetAmount: 2500,
      updatedAt: now,
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      createdAt: now,
      deadline: `${new Date().getUTCFullYear()}-12-15`,
      icon: "plane",
      id: "mock-goal-holiday-trip",
      name: "Viaje de diciembre",
      status: "active",
      targetAmount: 1200,
      updatedAt: now,
      userId,
      walletId: "dev-wallet-primary",
    },
  ];
}

export function createMockGoalContributions(userId: string): GoalContribution[] {
  const now = new Date();

  return [
    {
      amount: 800,
      createdAt: now.toISOString(),
      date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 8))
        .toISOString()
        .slice(0, 10),
      goalId: "mock-goal-emergency-fund",
      id: "mock-goal-contribution-1",
      note: "Primer bloque de ahorro",
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      amount: 250,
      createdAt: now.toISOString(),
      date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 17))
        .toISOString()
        .slice(0, 10),
      goalId: "mock-goal-emergency-fund",
      id: "mock-goal-contribution-2",
      note: null,
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      amount: 400,
      createdAt: now.toISOString(),
      date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 6))
        .toISOString()
        .slice(0, 10),
      goalId: "mock-goal-holiday-trip",
      id: "mock-goal-contribution-3",
      note: "Reserva vuelo",
      userId,
      walletId: "dev-wallet-primary",
    },
  ];
}

export function createLocalGoal(input: CreateGoalInput & { userId: string }): Goal {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    deadline: input.deadline ?? null,
    icon: input.icon ?? null,
    id: `local-goal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: input.name.trim(),
    status: "active",
    targetAmount: input.targetAmount,
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}

export function createLocalGoalContribution(
  input: AddGoalContributionInput & { userId: string },
): GoalContribution {
  return {
    amount: input.amount,
    createdAt: new Date().toISOString(),
    date: input.date,
    goalId: input.goalId,
    id: `local-goal-contribution-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    note: input.note ?? null,
    userId: input.userId,
    walletId: input.walletId,
  };
}
