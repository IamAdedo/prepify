import type { Metadata } from "next";
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
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased min-h-screen bg-[#E9F1F7] text-[#1A202C]">
        {children}
      </body>
    </html>
  );
}
