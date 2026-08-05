"use client";

import { useProductionMode } from "@/components/ProductionModeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface GateState {
  checking: boolean;
  blocked: boolean;
  ready: boolean;
}

// Enforces sign-in for the practice flow (setup + exam) when production mode is
// active and Supabase is configured. When Supabase is missing or production
// mode is off, allows anonymous access (graceful degrade).
export function useCandidateGate(): GateState {
  const productionMode = useProductionMode();
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Gate only when both production mode and Supabase are enabled.
    if (!productionMode || !configured) return;
    if (loading) return;
    if (user || hasRedirected) return;

    // Anonymous — redirect to portal with the current path as the target.
    setHasRedirected(true);
    router.replace(`/portal?redirect=${encodeURIComponent(pathname)}`);
  }, [productionMode, configured, loading, user, pathname, router, hasRedirected]);

  // While checking, or after a redirect, don't render the gated page body.
  if (productionMode && configured) {
    if (loading) return { checking: true, blocked: false, ready: false };
    if (!user) return { checking: false, blocked: true, ready: false };
  }

  return { checking: false, blocked: false, ready: true };
}
