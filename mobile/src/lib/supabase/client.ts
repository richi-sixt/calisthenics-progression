import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { largeSecureStore } from "./largeSecureStore";

const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof localStorage === "undefined") return Promise.resolve(null);
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === "undefined") return Promise.resolve();
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage === "undefined") return Promise.resolve();
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: Platform.OS === "web" ? WebStorageAdapter : largeSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  }
);
