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

type CreateIncomeSourceArgs = {
  name: string;
  userId: string;
};

type UpdateIncomeSourceArgs = {
  incomeSourceId: string;
  patch: {
    name?: string;
  };
  userId: string;
};

type DeleteIncomeSourceArgs = {
  incomeSourceId: string;
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

export async function createIncomeSource({
  name,
  userId,
}: CreateIncomeSourceArgs): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from("income_sources")
    .insert({
      is_default: false,
      name: name.trim(),
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapIncomeSource(data);
}

export async function updateIncomeSource({
  incomeSourceId,
  patch,
  userId,
}: UpdateIncomeSourceArgs): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from("income_sources")
    .update({
      name: patch.name?.trim(),
    })
    .eq("id", incomeSourceId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapIncomeSource(data);
}

export async function deleteIncomeSource({
  incomeSourceId,
  userId,
}: DeleteIncomeSourceArgs): Promise<void> {
  const { error } = await supabase
    .from("income_sources")
    .delete()
    .eq("id", incomeSourceId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
