import { supabase } from "@/lib/supabase/client";
import {
  createMockIncomeSources,
  mapIncomeSource,
  type IncomeSource,
} from "@/modules/income-sources/types";

type ListIncomeSourcesArgs = {
  isDevBypass: boolean;
  userId: string;
};

export async function listIncomeSources({
  isDevBypass,
  userId,
}: ListIncomeSourcesArgs): Promise<IncomeSource[]> {
  if (isDevBypass) {
    return createMockIncomeSources(userId);
  }

  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapIncomeSource);
}
