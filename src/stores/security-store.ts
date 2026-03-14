import { create } from "zustand";

export type PinStatus = "unknown" | "not_setup" | "locked" | "unlocked";

type SecurityStore = {
  error: string | null;
  isLoaded: boolean;
  pinLength: 4 | 6;
  pinStatus: PinStatus;
  setError: (error: string | null) => void;
  setLoaded: (loaded: boolean) => void;
  setPinLength: (length: 4 | 6) => void;
  setPinStatus: (status: PinStatus) => void;
  reset: () => void;
};

const initialState = {
  error: null,
  isLoaded: false,
  pinLength: 4 as 4 | 6,
  pinStatus: "unknown" as PinStatus,
};

export const useSecurityStore = create<SecurityStore>((set) => ({
  ...initialState,
  setError: (error) => set({ error }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  setPinLength: (pinLength) => set({ pinLength }),
  setPinStatus: (pinStatus) => set({ pinStatus }),
  reset: () => set(initialState),
}));
