export type SupabaseAuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

type AsyncStorageBackend = {
  getItemAsync: (key: string) => Promise<string | null>;
  deleteItemAsync: (key: string) => Promise<void>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

type WebStorageBackend = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export const noopAuthStorage: SupabaseAuthStorage = {
  getItem: async () => null,
  removeItem: async () => undefined,
  setItem: async () => undefined,
};

export function createWebAuthStorage(
  storage: WebStorageBackend,
): SupabaseAuthStorage {
  return {
    getItem: async (key) => storage.getItem(key),
    removeItem: async (key) => {
      storage.removeItem(key);
    },
    setItem: async (key, value) => {
      storage.setItem(key, value);
    },
  };
}

export function createSecureStoreAuthStorage(
  storage: AsyncStorageBackend,
): SupabaseAuthStorage {
  return {
    getItem: (key) => storage.getItemAsync(key),
    removeItem: (key) => storage.deleteItemAsync(key),
    setItem: (key, value) => storage.setItemAsync(key, value),
  };
}
