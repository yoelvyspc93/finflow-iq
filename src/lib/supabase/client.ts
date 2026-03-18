import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import {
  createSecureStoreAuthStorage,
  createWebAuthStorage,
  noopAuthStorage,
} from "@/lib/auth/auth-storage";
import type { Database } from "@/types/supabase";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "missing-anon-key";

export const isSupabaseConfigured =
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const isWeb = Platform.OS === "web";
const isServer = isWeb && typeof window === "undefined";

const authStorage = isServer
  ? noopAuthStorage
  : isWeb
    ? createWebAuthStorage(window.localStorage)
    : createSecureStoreAuthStorage(SecureStore);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
