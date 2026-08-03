"use client";

import { Leaderboard } from "@/components/Leaderboard";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";
import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans">

      {/* Nav */}
      <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#FFC107] shadow overflow-hidden">
              <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
            </div>
            <div>
              <span className="font-extrabold text-lg uppercase tracking-wide block leading-tight">Prepify</span>
              <span className="text-[10px] text-gray-200 font-mono">UTME CBT Practice</span>
            </div>
          </Link>

          <Link href="/setup" className="px-4 py-2 bg-[#D9383A] hover:bg-red-700 text-white font-bold text-xs uppercase rounded shadow transition-transform hover:scale-105">
            Start Practice
          </Link>
        </div>
      </header>

      {/* Header band */}
      <section className="bg-[#0A369D] text-white pt-10 pb-14 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-3">
          <span className="inline-block bg-[#FFC107] text-[#0A369D] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow">
            🏆 Weekly Challenge
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none">
            Leaderboard
          </h1>
          <p className="text-sm md:text-base text-gray-200 max-w-2xl mx-auto font-serif leading-relaxed">
            See who tops this week&apos;s full-UTME and per-subject rankings. Take the challenge to
            put your name on the board.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1">
            <WeeklyChallengeCard />
          </div>
          <div className="lg:col-span-2">
            <Leaderboard />
          </div>
        </div>

        <div className="text-center mt-10">
          <Link href="/" className="text-xs font-bold text-[#0A369D] uppercase tracking-wider hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0A369D] text-white py-4 text-center text-[11px] font-mono border-t-2 border-[#FFC107]">
        © {new Date().getFullYear()} Prepify • UTME CBT Practice
      </footer>
    </div>
  );
}
