import {
  createSecureStoreAuthStorage,
  createWebAuthStorage,
  noopAuthStorage,
} from "@/lib/auth/auth-storage";

describe("auth storage adapters", () => {
  it("wraps a web storage backend with async methods", async () => {
    const data = new Map<string, string>();
    const storage = createWebAuthStorage({
      getItem: (key) => data.get(key) ?? null,
      removeItem: (key) => {
        data.delete(key);
      },
      setItem: (key, value) => {
        data.set(key, value);
      },
    });

    await storage.setItem("session", "value");

    expect(await storage.getItem("session")).toBe("value");

    await storage.removeItem("session");

    expect(await storage.getItem("session")).toBeNull();
  });

  it("wraps secure storage backends with Supabase-compatible methods", async () => {
    const data = new Map<string, string>();
    const storage = createSecureStoreAuthStorage({
      deleteItemAsync: async (key) => {
        data.delete(key);
      },
      getItemAsync: async (key) => data.get(key) ?? null,
      setItemAsync: async (key, value) => {
        data.set(key, value);
      },
    });

    await storage.setItem("session", "secure");

    expect(await storage.getItem("session")).toBe("secure");

    await storage.removeItem("session");

    expect(await storage.getItem("session")).toBeNull();
  });

  it("provides a no-op storage for non-browser SSR", async () => {
    await expect(noopAuthStorage.setItem("session", "ignored")).resolves.toBeUndefined();
    await expect(noopAuthStorage.removeItem("session")).resolves.toBeUndefined();
    await expect(noopAuthStorage.getItem("session")).resolves.toBeNull();
  });
});
