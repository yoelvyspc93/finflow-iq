import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthStore = {
  error: string | null;
  isDevBypass: boolean;
  isReady: boolean;
  pendingMfaFactorId: string | null;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
  clearAuth: () => void;
  enableDevBypass: (email?: string | null) => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setPendingMfaFactorId: (factorId: string | null) => void;
  setReady: (ready: boolean) => void;
  setSession: (session: Session | null) => void;
};

const initialState = {
  error: null,
  isDevBypass: false,
  isReady: false,
  pendingMfaFactorId: null,
  session: null,
  status: "idle" as AuthStatus,
  user: null,
};

function createDevUser(email?: string | null) {
  return {
    id: "dev-bypass-user",
    app_metadata: {},
    user_metadata: { source: "dev-bypass" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: email ?? "dev@finflow.local",
  } as User;
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  clearAuth: () =>
    set({
      error: null,
      isDevBypass: false,
      pendingMfaFactorId: null,
      session: null,
      status: "unauthenticated",
      user: null,
    }),
  enableDevBypass: (email) =>
    set({
      error: null,
      isDevBypass: true,
      pendingMfaFactorId: null,
      session: null,
      status: "authenticated",
      user: createDevUser(email),
    }),
  reset: () => set(initialState),
  setError: (error) => set({ error }),
  setPendingMfaFactorId: (pendingMfaFactorId) => set({ pendingMfaFactorId }),
  setReady: (isReady) => set({ isReady }),
  setSession: (session) =>
    set({
      isDevBypass: false,
      pendingMfaFactorId: session ? useAuthStore.getState().pendingMfaFactorId : null,
      session,
      status: session ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
    }),
}));
