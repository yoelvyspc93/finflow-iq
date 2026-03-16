import { supabase } from "@/lib/supabase/client";

export type SignUpWithPasswordInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export async function signInWithPassword(input: {
  email: string;
  password: string;
}) {
  return supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export async function signUpWithPassword(input: SignUpWithPasswordInput) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    },
  });
}

