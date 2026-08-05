import type { Metadata } from "next";
import { ProductionModeProvider } from "@/components/ProductionModeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prepify — UTME CBT Practice Platform",
  description: "Prepify helps you prepare for UTME under authentic CBT conditions: real-time proctoring, 8-key keyboard navigation, weekly challenges, leaderboards, and printable practice result slips.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PRODUCTION_KEY is a server-only env var; resolve it here and pass the plain
  // boolean down to client components via context.
  const productionMode = process.env.PRODUCTION_KEY === "yes";

  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased min-h-screen bg-[#E9F1F7] text-[#1A202C]">
        <ProductionModeProvider value={productionMode}>
          {children}
        </ProductionModeProvider>
      </body>
    </html>
  );
}
