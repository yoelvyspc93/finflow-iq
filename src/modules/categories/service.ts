import { supabase } from "@/lib/supabase/client";
import { mapCategory, type Category } from "@/modules/categories/types";

type ListCategoriesArgs = {
  includeInactive?: boolean;
  userId: string;
};

type CreateCategoryArgs = {
  color?: string;
  icon?: string;
  name: string;
  userId: string;
};

type UpdateCategoryArgs = {
  categoryId: string;
  patch: {
    color?: string;
    icon?: string;
    isActive?: boolean;
    name?: string;
  };
  userId: string;
};

type DeleteCategoryArgs = {
  categoryId: string;
  userId: string;
};

export type CategoryReferenceSummary = {
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

export async function listCategories({
  includeInactive = false,
  userId,
}: ListCategoriesArgs): Promise<Category[]> {
  let query = supabase
    .from("categories")
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

  return (data ?? []).map(mapCategory);
}

export async function createCategory({
  color,
  icon,
  name,
  userId,
}: CreateCategoryArgs): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      color: color?.trim() || "#4F6BFF",
      icon: icon?.trim() || "shapes",
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

  return mapCategory(data);
}

export async function updateCategory({
  categoryId,
  patch,
  userId,
}: UpdateCategoryArgs): Promise<Category> {
  const payload = {
    color: patch.color?.trim(),
    icon: patch.icon?.trim(),
    is_active: patch.isActive,
    name: patch.name?.trim(),
  };

  const { data, error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapCategory(data);
}

export async function deleteCategory({
  categoryId,
  userId,
}: DeleteCategoryArgs): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getCategoryReferenceSummary({
  categoryId,
  userId,
}: DeleteCategoryArgs): Promise<CategoryReferenceSummary> {
  const [ledgerEntries, recurringExpenses, budgetProvisions] = await Promise.all([
    countRows(
      supabase
        .from("ledger_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("category_id", categoryId),
    ),
    countRows(
      supabase
        .from("recurring_expenses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("category_id", categoryId),
    ),
    countRows(
      supabase
        .from("budget_provisions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("category_id", categoryId),
    ),
  ]);

  return {
    totalReferences: ledgerEntries + recurringExpenses + budgetProvisions,
  };
}
