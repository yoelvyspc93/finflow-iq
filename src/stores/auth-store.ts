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
  lastMagicLinkEmail: string | null;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
  setError: (error: string | null) => void;
  setLastMagicLinkEmail: (email: string | null) => void;
  setReady: (ready: boolean) => void;
  setSession: (session: Session | null) => void;
  reset: () => void;
};

const initialState = {
  error: null,
  isReady: false,
  lastMagicLinkEmail: null,
  session: null,
  status: "idle" as AuthStatus,
  user: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setError: (error) => set({ error }),
  setLastMagicLinkEmail: (lastMagicLinkEmail) => set({ lastMagicLinkEmail }),
  setReady: (isReady) => set({ isReady }),
  setSession: (session) =>
    set({
      session,
      status: session ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
    }),
  reset: () => set(initialState),
}));
