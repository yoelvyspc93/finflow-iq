import { supabase } from "@/lib/supabase/client";
import {
  createMockCategories,
  mapCategory,
  type Category,
} from "@/modules/categories/types";

type ListCategoriesArgs = {
  isDevBypass: boolean;
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
    name?: string;
  };
  userId: string;
};

type DeleteCategoryArgs = {
  categoryId: string;
  userId: string;
};

export async function listCategories({
  isDevBypass,
  userId,
}: ListCategoriesArgs): Promise<Category[]> {
  if (isDevBypass) {
    return createMockCategories(userId);
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

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
