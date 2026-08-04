"use client";

import { loadAttempts } from "@/lib/history";
import { useAuth } from "@/hooks/useAuth";
import { AttemptRecord } from "@/types/jamb";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const { user, loading: authLoading, configured, signInWithEmail, signOut } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Sign-in form state (only shown when accounts are enabled).
  const [email, setEmail] = useState("");
  const [signInState, setSignInState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signInMsg, setSignInMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    // Wait for auth to settle so remote history is merged for signed-in users.
    if (authLoading) return;
    loadAttempts()
      .then((list) => { if (mounted) setAttempts(list); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [authLoading, user]);

  const handleSignIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignInState("error");
      setSignInMsg("Please enter a valid email address.");
      return;
    }
    setSignInState("sending");
    const { ok, error } = await signInWithEmail(email);
    if (ok) {
      setSignInState("sent");
      setSignInMsg("Check your inbox for a magic sign-in link.");
    } else {
      setSignInState("error");
      setSignInMsg(error || "Could not send the sign-in link.");
    }
  };

  const fmtDuration = (s: number) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  // Simple progress signal: best and average aggregate across attempts.
  const best = attempts.length ? Math.max(...attempts.map((a) => a.aggregateScore)) : 0;
  const avg = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.aggregateScore, 0) / attempts.length)
    : 0;

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
            📈 Your Progress
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none">
            Attempt History
          </h1>
          <p className="text-sm md:text-base text-gray-200 max-w-2xl mx-auto font-serif leading-relaxed">
            Every practice run is saved on this device. Sign in to sync your history across devices.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 -mt-8 space-y-6">

        {/* Account panel */}
        <div className="bg-white rounded-lg border-2 border-gray-300 shadow p-5">
          {!configured ? (
            <p className="text-[11px] text-gray-500 font-mono">
              Accounts are not enabled on this deployment. Your history is stored locally in this browser.
            </p>
          ) : authLoading ? (
            <p className="text-[11px] text-gray-500 font-mono">Checking sign-in status…</p>
          ) : user ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-mono text-gray-700">
                Signed in as <span className="font-bold text-[#0A369D]">{user.email || "your account"}</span> — history syncs across devices.
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold uppercase rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-black text-[#0A369D] uppercase tracking-wide mb-1">Sync Across Devices</h3>
              <p className="text-[11px] text-gray-500 font-mono mb-3">Optional. Get a magic link — no password needed. Your local history stays either way.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (signInState !== "idle") setSignInState("idle"); }}
                  placeholder="you@example.com"
                  className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm font-mono focus:border-[#0A369D] outline-none"
                />
                <button
                  onClick={handleSignIn}
                  disabled={signInState === "sending" || signInState === "sent"}
                  className="px-5 py-2 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow whitespace-nowrap"
                >
                  {signInState === "sending" ? "Sending…" : signInState === "sent" ? "Link Sent" : "Send Magic Link"}
                </button>
              </div>
              {signInMsg && (
                <p className={`text-[11px] font-bold font-mono mt-2 ${signInState === "sent" ? "text-green-700" : "text-[#D9383A]"}`}>
                  {signInMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Summary stats */}
        {attempts.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border-2 border-gray-300 shadow p-4 text-center">
              <span className="text-[10px] text-gray-500 font-mono uppercase block">Attempts</span>
              <span className="text-2xl font-black text-[#0A369D]">{attempts.length}</span>
            </div>
            <div className="bg-white rounded-lg border-2 border-gray-300 shadow p-4 text-center">
              <span className="text-[10px] text-gray-500 font-mono uppercase block">Best Score</span>
              <span className="text-2xl font-black text-green-600">{best}<span className="text-sm text-gray-400">/400</span></span>
            </div>
            <div className="bg-white rounded-lg border-2 border-gray-300 shadow p-4 text-center">
              <span className="text-[10px] text-gray-500 font-mono uppercase block">Average</span>
              <span className="text-2xl font-black text-[#0A369D]">{avg}<span className="text-sm text-gray-400">/400</span></span>
            </div>
          </div>
        )}

        {/* Attempts list */}
        <div className="bg-white rounded-lg border-2 border-gray-300 shadow p-5">
          <h3 className="text-sm font-black text-[#0A369D] uppercase tracking-wide mb-4">Past Attempts</h3>

          {loading ? (
            <div className="py-10 flex flex-col items-center font-mono">
              <div className="w-8 h-8 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-[#0A369D] text-xs uppercase tracking-wider">Loading history…</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600 mb-4">No attempts recorded yet.</p>
              <Link href="/setup" className="px-5 py-2.5 bg-[#0A369D] text-white text-xs font-bold uppercase rounded shadow hover:bg-blue-900">
                Start Your First Practice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#0A369D] text-white text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2 text-center">Score</th>
                    <th className="p-2 text-center">Accuracy</th>
                    <th className="p-2 text-center">Time</th>
                    <th className="p-2 text-center">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2 whitespace-nowrap">
                        {fmtDate(a.completedAt)}
                        {a.isWeeklyChallenge && <span className="ml-1.5 text-[9px] bg-[#FFC107] text-[#0A369D] px-1.5 py-0.5 rounded font-bold">CHALLENGE</span>}
                      </td>
                      <td className="p-2 whitespace-nowrap">{a.mode === "JAMB_FULL" ? "Full UTME" : "Single"}</td>
                      <td className="p-2 text-center font-bold text-[#0A369D]">{a.aggregateScore}/400</td>
                      <td className="p-2 text-center">{a.accuracy}%</td>
                      <td className="p-2 text-center">{fmtDuration(a.durationSeconds)}</td>
                      <td className={`p-2 text-center font-bold ${a.infractions > 0 ? "text-[#D9383A]" : "text-green-600"}`}>{a.infractions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs font-bold text-[#0A369D] uppercase tracking-wider hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>

      <footer className="bg-[#0A369D] text-white py-4 text-center text-[11px] font-mono border-t-2 border-[#FFC107]">
        © {new Date().getFullYear()} Prepify • UTME CBT Practice
      </footer>
    </div>
  );
}
