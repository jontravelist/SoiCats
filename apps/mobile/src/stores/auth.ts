import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false });
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
