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

export function toUserFriendlyAuthError(
  error: unknown,
  fallbackMessage: string,
) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }

  if (
    message.includes("user already registered") ||
    message.includes("already been registered")
  ) {
    return "Ya existe una cuenta con este correo electrónico.";
  }

  if (message.includes("password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (
    message.includes("email not confirmed") ||
    message.includes("email address not authorized")
  ) {
    return "Tu correo todavía no está confirmado.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("network request failed")
  ) {
    return "No se pudo conectar con el servidor. Intenta de nuevo.";
  }

  return fallbackMessage;
}
