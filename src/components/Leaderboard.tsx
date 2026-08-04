"use client";

import { fetchLeaderboard, LeaderboardData } from "@/lib/leaderboard";
import { getIsoWeekKey } from "@/lib/week";
import React, { useEffect, useState } from "react";

function medal(pos: number): string {
  return pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;
}

export const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"full" | "subject">("full");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchLeaderboard(getIsoWeekKey())
      .then((d) => {
        if (!mounted) return;
        setData(d);
        const subjects = Object.keys(d.subjects);
        if (subjects.length > 0) setActiveSubject(subjects[0]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const subjectKeys = data ? Object.keys(data.subjects) : [];

  return (
    <div className="bg-white rounded-lg border-2 border-[#0A369D] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#0A369D] text-white px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-black uppercase tracking-wide text-sm md:text-base flex items-center gap-2">
            🏆 Weekly Challenge Leaderboard
          </h3>
          <p className="text-[10px] font-mono text-blue-200">
            Week {getIsoWeekKey()} • {data?.source === "live" ? "Live rankings" : "Your device"}
          </p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setView("full")}
          className={`flex-1 py-2.5 uppercase tracking-wide transition-colors ${
            view === "full" ? "bg-[#E9F1F7] text-[#0A369D] border-b-2 border-[#0A369D]" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Full UTME
        </button>
        <button
          onClick={() => setView("subject")}
          className={`flex-1 py-2.5 uppercase tracking-wide transition-colors ${
            view === "subject" ? "bg-[#E9F1F7] text-[#0A369D] border-b-2 border-[#0A369D]" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          By Subject
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center text-gray-400 font-mono text-xs">
            <div className="w-8 h-8 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-2" />
            Loading rankings…
          </div>
        ) : view === "full" ? (
          <FullTable rows={data?.full || []} />
        ) : subjectKeys.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500 font-mono">
            No subject entries yet this week. Be the first to take the challenge!
          </p>
        ) : (
          <div>
            {/* Subject selector — only subjects with participants appear here */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {subjectKeys.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    activeSubject === sub
                      ? "bg-[#0A369D] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            {activeSubject && <SubjectTable rows={data!.subjects[activeSubject] || []} />}
          </div>
        )}
      </div>
    </div>
  );
};

const FullTable: React.FC<{ rows: LeaderboardData["full"] }> = ({ rows }) => {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-gray-500 font-mono">No entries yet this week.</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase text-gray-400 font-mono border-b">
          <th className="text-left py-2 w-10">Rank</th>
          <th className="text-left py-2">Candidate</th>
          <th className="text-center py-2">Score</th>
          <th className="text-right py-2 hidden sm:table-cell">Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.entryId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className="py-2 font-bold">{medal(r.position)}</td>
            <td className="py-2 font-semibold text-gray-800 truncate max-w-[140px]">{r.candidateName}</td>
            <td className="py-2 text-center font-black text-[#0A369D]">{r.aggregateScore}<span className="text-gray-400 font-normal">/400</span></td>
            <td className="py-2 text-right font-mono text-gray-500 hidden sm:table-cell">
              {Math.floor(r.durationSeconds / 60)}m
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SubjectTable: React.FC<{ rows: LeaderboardData["subjects"][string] }> = ({ rows }) => {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-gray-500 font-mono">No participants for this subject yet.</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase text-gray-400 font-mono border-b">
          <th className="text-left py-2 w-10">Rank</th>
          <th className="text-left py-2">Candidate</th>
          <th className="text-center py-2">Correct</th>
          <th className="text-right py-2">Score /100</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.entryId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className="py-2 font-bold">{medal(r.position)}</td>
            <td className="py-2 font-semibold text-gray-800 truncate max-w-[140px]">{r.candidateName}</td>
            <td className="py-2 text-center font-mono text-gray-600">{r.correct}/{r.total}</td>
            <td className="py-2 text-right font-black text-[#0A369D]">{r.scaledScore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
