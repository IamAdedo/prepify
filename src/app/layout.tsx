import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joint Admissions and Matriculation Board (JAMB) CBT Portal",
  description: "Official UTME CBT Web Terminal. Real-time proctoring sandbox, 8-key keyboard command navigation, and printable result slips.",
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
