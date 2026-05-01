import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@shared/database.types";
import { env } from "@/lib/env";

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});

export type SupabaseClient = typeof supabase;
