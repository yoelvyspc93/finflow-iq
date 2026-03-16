import type { Tables, TablesInsert } from "@/types/supabase";

export type ProfileRow = Tables<"profiles">;

export type Profile = {
  createdAt: string;
  firstName: string;
  lastName: string;
  updatedAt: string;
  userId: string;
};

export type UpsertProfileInput = {
  firstName: string;
  lastName: string;
  userId: string;
};

export function mapProfile(row: ProfileRow): Profile {
  return {
    createdAt: row.created_at,
    firstName: row.first_name,
    lastName: row.last_name,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function toProfileInsert(input: UpsertProfileInput): TablesInsert<"profiles"> {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    user_id: input.userId,
  };
}

