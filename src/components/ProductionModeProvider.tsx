"use client";

import { createContext, useContext } from "react";

// Whether this deployment runs in "production" mode (PRODUCTION_KEY=yes). The
// value is resolved on the server in the root layout — where the server-only
// PRODUCTION_KEY env var is readable — and handed down to client components as a
// plain boolean. The raw env var never reaches the browser.
const ProductionModeContext = createContext<boolean>(false);

export function ProductionModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <ProductionModeContext.Provider value={value}>
      {children}
    </ProductionModeContext.Provider>
  );
}

// True only when the deployment set PRODUCTION_KEY=yes. When false, the app keeps
// its fully-anonymous behavior (no sign-in gating, no locked email fields).
export function useProductionMode(): boolean {
  return useContext(ProductionModeContext);
}
