import { supabase } from "@/lib/supabase/client";
import { mapIncomeSource, type IncomeSource } from "@/modules/income-sources/types";

type ListIncomeSourcesArgs = {
  includeInactive?: boolean;
  userId: string;
};

type CreateIncomeSourceArgs = {
  name: string;
  userId: string;
};

type UpdateIncomeSourceArgs = {
  incomeSourceId: string;
  patch: {
    isActive?: boolean;
    name?: string;
  };
  userId: string;
};

type DeleteIncomeSourceArgs = {
  incomeSourceId: string;
  userId: string;
};

export type IncomeSourceReferenceSummary = {
  totalReferences: number;
};

async function countRows(
  queryBuilder: PromiseLike<{ count: number | null; error: unknown }>,
) {
  const { count, error } = await queryBuilder;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function listIncomeSources({
  includeInactive = false,
  userId,
}: ListIncomeSourcesArgs): Promise<IncomeSource[]> {
  let query = supabase
    .from("income_sources")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

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
      is_active: true,
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
      is_active: patch.isActive,
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

export async function getIncomeSourceReferenceSummary({
  incomeSourceId,
  userId,
}: DeleteIncomeSourceArgs): Promise<IncomeSourceReferenceSummary> {
  const ledgerEntries = await countRows(
    supabase
      .from("ledger_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("income_source_id", incomeSourceId),
  );

  return {
    totalReferences: ledgerEntries,
  };
}
