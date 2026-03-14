import { supabase } from "@/lib/supabase/client";
import { mapSettings, type AppSettings, type SettingsUpdateInput } from "@/modules/settings/types";

type UserScopedArgs = {
  userId: string;
};

type UpdateSettingsArgs = UserScopedArgs & {
  patch: SettingsUpdateInput;
};

export async function getSettings({
  userId,
}: UserScopedArgs): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapSettings(data) : null;
}

export async function updateSettings({
  patch,
  userId,
}: UpdateSettingsArgs): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("settings")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapSettings(data);
}
