import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthStore = {
  error: string | null;
  isReady: boolean;
  pendingMfaFactorId: string | null;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
  clearAuth: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setPendingMfaFactorId: (factorId: string | null) => void;
  setReady: (ready: boolean) => void;
  setSession: (session: Session | null) => void;
};

const initialState = {
  error: null,
  isReady: false,
  pendingMfaFactorId: null,
  session: null,
  status: "idle" as AuthStatus,
  user: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  clearAuth: () =>
    set({
      error: null,
      pendingMfaFactorId: null,
      session: null,
      status: "unauthenticated",
      user: null,
    }),
  reset: () => set(initialState),
  setError: (error) => set({ error }),
  setPendingMfaFactorId: (pendingMfaFactorId) => set({ pendingMfaFactorId }),
  setReady: (isReady) => set({ isReady }),
  setSession: (session) =>
    set({
      pendingMfaFactorId: session ? useAuthStore.getState().pendingMfaFactorId : null,
      session,
      status: session ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
    }),
}));
