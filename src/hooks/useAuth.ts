"use client";

import { getSupabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
}

// Optional accounts. When Supabase is configured, candidates can sign in with a
// magic link to sync their attempt history across devices. When it isn't, this
// hook reports "not configured" and the whole app still works anonymously.
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();
  const configured = !!supabase;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "Accounts are not enabled on this deployment." };
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/history` : undefined;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return { user, loading, configured, signInWithEmail, signOut };
}
