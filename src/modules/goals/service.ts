import { supabase } from "@/lib/supabase/client";
import {
  createMockGoalContributions,
  createMockGoals,
  mapGoal,
  mapGoalContribution,
  type AddGoalContributionInput,
  type Goal,
  type GoalContribution,
} from "@/modules/goals/types";

type GoalListArgs = {
  isDevBypass: boolean;
  userId: string;
};

export async function listGoals({
  isDevBypass,
  userId,
}: GoalListArgs): Promise<Goal[]> {
  if (isDevBypass) {
    return createMockGoals(userId);
  }

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapGoal);
}

export async function listGoalContributions({
  isDevBypass,
  userId,
}: GoalListArgs): Promise<GoalContribution[]> {
  if (isDevBypass) {
    return createMockGoalContributions(userId);
  }

  const { data, error } = await supabase
    .from("goal_contributions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapGoalContribution);
}

export async function addGoalContribution(
  input: AddGoalContributionInput,
): Promise<GoalContribution> {
  const { data, error } = await supabase.rpc("add_goal_contribution", {
    contribution_amount: input.amount,
    contribution_note: input.note ?? undefined,
    target_date: input.date,
    target_goal_id: input.goalId,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapGoalContribution(data);
}
