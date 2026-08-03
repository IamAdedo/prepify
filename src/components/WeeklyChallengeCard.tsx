"use client";

import { getIsoWeekKey, getWeeklyChallengeTitle, millisUntilWeekEnd } from "@/lib/week";
import Link from "next/link";
import React, { useEffect, useState } from "react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Closing…";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

export const WeeklyChallengeCard: React.FC = () => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(millisUntilWeekEnd());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gradient-to-br from-[#0A369D] to-[#08286f] text-white rounded-lg border-2 border-[#FFC107] shadow-xl p-6 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 text-[120px] opacity-10 select-none">⚡</div>

      <span className="inline-block bg-[#FFC107] text-[#0A369D] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest">
        Weekly Challenge
      </span>

      <h3 className="text-xl md:text-2xl font-black uppercase mt-3 leading-tight">
        {getWeeklyChallengeTitle()}
      </h3>
      <p className="text-xs text-blue-100 font-serif mt-2 leading-relaxed max-w-md">
        Sit the full 4-subject UTME challenge for week {getIsoWeekKey()}. Your aggregate score and
        per-subject scores are ranked on this week&apos;s leaderboard.
      </p>

      <div className="mt-5 bg-black/25 rounded-lg px-4 py-3 inline-block">
        <span className="text-[10px] uppercase tracking-widest text-blue-200 block">Closes in</span>
        <span className="font-mono text-lg font-bold text-[#FFC107] tabular-nums">
          {remaining === null ? "—" : formatCountdown(remaining)}
        </span>
      </div>

      <div className="mt-5">
        <Link
          href="/setup?challenge=weekly"
          className="inline-block px-6 py-3 bg-[#D9383A] hover:bg-red-700 text-white font-extrabold uppercase tracking-wide text-sm rounded shadow-lg transition-transform hover:scale-105"
        >
          Enter Weekly Challenge →
        </Link>
      </div>
    </div>
  );
};
