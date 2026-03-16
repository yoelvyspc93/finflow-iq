import { create } from "zustand";

type SecurityStore = {
  error: string | null;
  isLoaded: boolean;
  mfaFactorId: string | null;
  mfaEnabled: boolean;
  setError: (error: string | null) => void;
  setMfa: (input: { factorId: string | null; isEnabled: boolean }) => void;
  setLoaded: (loaded: boolean) => void;
  reset: () => void;
};

const initialState = {
  error: null,
  isLoaded: false,
  mfaEnabled: false,
  mfaFactorId: null,
};

export const useSecurityStore = create<SecurityStore>((set) => ({
  ...initialState,
  setError: (error) => set({ error }),
  setMfa: ({ factorId, isEnabled }) =>
    set({
      mfaEnabled: isEnabled,
      mfaFactorId: isEnabled ? factorId : null,
    }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  reset: () => set(initialState),
}));
