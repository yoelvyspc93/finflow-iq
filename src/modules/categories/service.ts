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
