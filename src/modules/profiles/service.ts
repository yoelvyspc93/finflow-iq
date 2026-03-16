import { supabase } from "@/lib/supabase/client";
import { mapProfile, toProfileInsert, type Profile, type UpsertProfileInput } from "@/modules/profiles/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfile(data) : null;
}

export async function upsertProfile(input: UpsertProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(toProfileInsert(input), { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

