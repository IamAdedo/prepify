"use client";

import { getSupabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

// Optional accounts. When Supabase is configured, candidates can register/sign in
// with an email + password (or a passwordless magic link) to sync their attempt
// history across devices and, in production mode, to access the practice flow.
// When Supabase isn't configured, this hook reports "not configured" and the whole
// app still works anonymously.
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
      setUser(data.user ? toAuthUser(data.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
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

  // Register a new candidate with email + password. Extra profile fields are
  // stored in user_metadata. When the project requires email confirmation,
  // Supabase returns a user with no active session — the caller shows a
  // "confirm your inbox" message in that case.
  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      meta: { fullName: string; phone?: string }
    ): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> => {
      if (!supabase) return { ok: false, error: "Accounts are not enabled on this deployment." };
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/history` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: meta.fullName, phone: meta.phone || null },
        },
      });
      if (error) return { ok: false, error: error.message };
      // No session means email confirmation is required before sign-in.
      return { ok: true, needsConfirmation: !data.session };
    },
    [supabase]
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "Accounts are not enabled on this deployment." };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return { user, loading, configured, signInWithEmail, signUpWithPassword, signInWithPassword, signOut };
}

// Normalize a Supabase user into our lightweight AuthUser, pulling the display
// name out of user_metadata where signUp stores it.
function toAuthUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }): AuthUser {
  const meta = u.user_metadata || {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  return { id: u.id, email: u.email ?? null, fullName };
}
