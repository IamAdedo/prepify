import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client. Prefers the service-role key (trusted, bypasses
// RLS) so grading/leaderboard writes are authoritative and cannot be forged by
// a client. Falls back to the anon key, then to null when unconfigured so the
// app still builds and runs without a database.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const isServerSupabaseConfigured = Boolean(url && (serviceKey || anonKey));
