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
  const payload = {
    ...patch,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapSettings(data);
}
