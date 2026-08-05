"use client";

import { ResultSlipPDF } from "@/components/ResultSlipPDF";
import { exportElementToPdf, renderElementToPdfBase64 } from "@/lib/pdf";
import { submitLeaderboardEntry } from "@/lib/leaderboard";
import { saveAttempt } from "@/lib/history";
import { useAuth } from "@/hooks/useAuth";
import { useProductionMode } from "@/components/ProductionModeProvider";
import { ExamConfig, GradeResult, GradedQuestion, Question, UserAnswers, AttemptRecord } from "@/types/jamb";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SITE_NAME = "Prepify — UTME Practice";

// Cap total result-email recipients (matches the server cap in
// /api/email-result). When signed in, the registered address counts as one.
const MAX_RECIPIENTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Session-scoped localStorage keys wiped on "Clear Session" — deliberately
// excludes jamb_attempts so the candidate's saved history survives.
const SESSION_KEYS = [
  "jamb_config",
  "jamb_questions",
  "jamb_answers",
  "jamb_final_answers",
  "jamb_answer_token",
  "jamb_infraction_logs",
  "jamb_infraction_count",
  "jamb_current_index",
  "jamb_visited",
  "jamb_result",
];

function clearSessionKeys() {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
}

export default function ResultsPage() {
  const { user } = useAuth();
  const productionMode = useProductionMode();
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [infractionLogs, setInfractionLogs] = useState<string[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [gradeError, setGradeError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  // Extra recipients added on top of the locked registered email (signed-in flow).
  const [extraRecipients, setExtraRecipients] = useState<string[]>([]);

  // When signed in, the registered email is always a recipient and is locked.
  const registeredEmail = user?.email || null;
  const lockedEmail = productionMode && registeredEmail ? registeredEmail : null;

  const slipRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const gradedRef = useRef(false); // guards the one-shot grade + persist effect

  // Load the completed session from the exam workspace.
  useEffect(() => {
    const storedConfig = localStorage.getItem("jamb_config");
    const storedAnswers = localStorage.getItem("jamb_final_answers");
    const storedQuestions = localStorage.getItem("jamb_questions");
    const storedInfractions = localStorage.getItem("jamb_infraction_logs");

    if (storedConfig) setConfig(JSON.parse(storedConfig));
    if (storedAnswers) setAnswers(JSON.parse(storedAnswers));
    if (storedQuestions) setQuestions(JSON.parse(storedQuestions));
    if (storedInfractions) setInfractionLogs(JSON.parse(storedInfractions));

    setIsLoading(false);
  }, []);

  // Grade server-side (authoritative), then persist to history and record the
  // weekly leaderboard. Runs exactly once per completed session.
  useEffect(() => {
    if (isLoading || gradedRef.current) return;
    if (!config || questions.length === 0) return;
    gradedRef.current = true;

    (async () => {
      const answerToken = localStorage.getItem("jamb_answer_token") || "";
      const finalAnswers: UserAnswers =
        Object.keys(answers).length > 0
          ? answers
          : JSON.parse(localStorage.getItem("jamb_final_answers") || "{}");

      const durationSeconds = config.startedAt
        ? Math.max(0, Math.round((Date.now() - config.startedAt) / 1000))
        : 0;

      let result: GradeResult | null = null;
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answerToken,
            answers: finalAnswers,
            mode: config.mode,
            isWeeklyChallenge: !!config.isWeeklyChallenge,
            weekKey: config.weekKey,
            candidateName: config.candidateName,
            registrationNumber: config.registrationNumber,
            durationSeconds,
            infractions: infractionLogs.length,
          }),
        });
        if (!res.ok) throw new Error(`Grading service returned ${res.status}`);
        result = (await res.json()) as GradeResult;
        setGrade(result);
      } catch (err) {
        console.error("Grading failed:", err);
        setGradeError("We couldn't grade this attempt automatically. Your answers are safe on this device — please retry.");
        setIsGrading(false);
        return;
      }

      setIsGrading(false);

      // Persist to attempt history (local always; remote if signed in).
      const accuracy = result.totalQuestions
        ? Math.round((result.totalCorrect / result.totalQuestions) * 1000) / 10
        : 0;
      const attempt: AttemptRecord = {
        id: `${config.registrationNumber}-${config.startedAt || Date.now()}`,
        completedAt: new Date().toISOString(),
        candidateName: config.candidateName,
        registrationNumber: config.registrationNumber,
        mode: config.mode,
        subjects: config.subjects,
        aggregateScore: result.aggregateScore,
        totalCorrect: result.totalCorrect,
        totalQuestions: result.totalQuestions,
        accuracy,
        durationSeconds,
        infractions: infractionLogs.length,
        isWeeklyChallenge: !!config.isWeeklyChallenge,
        subjectScores: result.subjectScores,
      };
      saveAttempt(attempt).catch(() => {/* local copy already written */});

      // Weekly leaderboard: the grade route writes it authoritatively when a
      // database is configured. Only fall back to the client submit path (which
      // handles the localStorage board) when the server did not record it.
      if (config.isWeeklyChallenge && config.weekKey && !result.leaderboardRecorded) {
        submitLeaderboardEntry({
          weekKey: config.weekKey,
          candidateName: config.candidateName,
          registrationNumber: config.registrationNumber,
          mode: config.mode,
          aggregateScore: result.aggregateScore,
          totalCorrect: result.totalCorrect,
          totalQuestions: result.totalQuestions,
          infractions: infractionLogs.length,
          durationSeconds,
          subjectScores: result.subjectScores,
        }).catch(() => {/* kept local; non-fatal */});
      }
    })();
  }, [isLoading, config, questions, answers, infractionLogs]);

  // Export the result slip AND the answer review (watermarked) at once.
  const handleExportPdfs = async () => {
    if (!config) return;
    setIsExporting(true);
    try {
      const safeName = config.candidateName.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "candidate";
      if (slipRef.current) {
        await exportElementToPdf(slipRef.current, {
          fileName: `Prepify_Result_Slip_${safeName}.pdf`,
        });
      }
      if (reviewRef.current) {
        await exportElementToPdf(reviewRef.current, {
          fileName: `Prepify_Answer_Review_${safeName}.pdf`,
          watermark: `${SITE_NAME} • ${config.candidateName}`,
        });
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Email the result slip (optional) — supports multiple recipients and attaches
  // the rendered result-slip PDF.
  const handleEmailSlip = async () => {
    if (!config || !grade) return;

    // Build the recipient list. When signed in (production), the locked
    // registered email is always included, plus any valid extra recipients.
    // Otherwise, parse the free-text comma/space/semicolon separated input.
    let recipients: string[];
    if (lockedEmail) {
      recipients = Array.from(
        new Set(
          [lockedEmail, ...extraRecipients]
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
        )
      );
      const extrasValid = extraRecipients
        .map((e) => e.trim())
        .filter(Boolean)
        .every((e) => EMAIL_RE.test(e));
      if (!extrasValid) {
        setEmailError("One or more additional email addresses are invalid.");
        setEmailStatus("error");
        return;
      }
    } else {
      recipients = Array.from(
        new Set(
          emailAddr
            .split(/[,;\s]+/)
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
        )
      );
      const allValid =
        recipients.length > 0 &&
        recipients.every((e) => EMAIL_RE.test(e));
      if (!allValid) {
        setEmailError("Enter one or more valid email addresses, separated by commas.");
        setEmailStatus("error");
        return;
      }
    }

    setEmailStatus("sending");
    setEmailError("");
    try {
      // Render the on-screen result slip to a PDF to attach.
      let attachment: { filename: string; contentBase64: string } | undefined;
      if (slipRef.current) {
        const safeName =
          config.candidateName.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "candidate";
        const contentBase64 = await renderElementToPdfBase64(slipRef.current);
        attachment = { filename: `Prepify_Result_Slip_${safeName}.pdf`, contentBase64 };
      }

      const maxAggregate = Math.max(100, grade.subjectScores.length * 100);
      const res = await fetch("/api/email-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          candidateName: config.candidateName,
          registrationNumber: config.registrationNumber,
          mode: config.mode,
          aggregateScore: grade.aggregateScore,
          maxAggregate,
          totalCorrect: grade.totalCorrect,
          totalQuestions: grade.totalQuestions,
          subjectScores: grade.subjectScores,
          attachment,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.delivered === false) {
          // Server ran but no mailer is configured on this deployment.
          setEmailError(
            "Email is not enabled on this deployment (mailer not configured)."
          );
          setEmailStatus("error");
        } else if (data?.partial) {
          setEmailStatus("sent");
          setEmailError("Some addresses could not be delivered to.");
        } else {
          setEmailStatus("sent");
        }
      } else {
        let reason = "";
        try {
          const data = await res.json();
          reason = data?.reason || data?.error || "";
        } catch {/* non-JSON error */}
        setEmailError(reason);
        setEmailStatus("error");
      }
    } catch {
      setEmailError("Network error while sending. Please try again.");
      setEmailStatus("error");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Generating Score Sheet...</p>
      </div>
    );
  }

  if (!config || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono text-center p-4">
        <div className="max-w-md bg-white border-2 border-[#D9383A] rounded-lg p-6 shadow-lg">
          <h1 className="text-xl font-bold text-[#D9383A] mb-2 uppercase">No Active Session Found</h1>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            There is no graded session found on this device. Please register and run an exam to generate grading details.
          </p>
          <Link href="/setup" className="px-5 py-2.5 bg-[#0A369D] text-white text-xs font-bold rounded shadow hover:bg-blue-900">
            Go to Candidate Setup
          </Link>
        </div>
      </div>
    );
  }

  // Still awaiting the authoritative grade (or it failed).
  if (isGrading || !grade) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono text-center p-4">
        {gradeError ? (
          <div className="max-w-md bg-white border-2 border-[#D9383A] rounded-lg p-6 shadow-lg">
            <h1 className="text-lg font-bold text-[#D9383A] mb-2 uppercase">Grading Unavailable</h1>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">{gradeError}</p>
            <button
              onClick={() => { gradedRef.current = false; setGradeError(""); setIsGrading(true); }}
              className="px-5 py-2.5 bg-[#0A369D] text-white text-xs font-bold rounded shadow hover:bg-blue-900"
            >
              Retry Grading
            </button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Grading securely on our servers…</p>
          </>
        )}
      </div>
    );
  }

  // Build a lookup from the authoritative breakdown for the answer review.
  const breakdownById = new Map<number, GradedQuestion>();
  grade.breakdown.forEach((b) => breakdownById.set(b.id, b));

  const totalQuestions = grade.totalQuestions || 1;
  const rawPercentage = (grade.totalCorrect / totalQuestions) * 100;

  // Weak-subject analytics: sort subjects ascending by scaled score.
  const rankedSubjects = [...grade.subjectScores].sort((a, b) => a.scaledScore - b.scaledScore);
  const weakest = rankedSubjects.filter((s) => s.scaledScore < 50);

  return (
    <div className="min-h-screen bg-[#E9F1F7] p-4 md:p-8 font-sans select-none print:bg-white print:p-0">

      {/* 1. Official Result Slip Component */}
      <div className="mb-8 print:mb-0">
        <ResultSlipPDF
          config={config}
          grade={grade}
          infractionLogs={infractionLogs}
          slipRef={slipRef}
          onExportPdf={handleExportPdfs}
          isExporting={isExporting}
        />
      </div>

      {config.isWeeklyChallenge && (
        <div className="max-w-4xl mx-auto mb-6 print:hidden">
          <div className="bg-[#0A369D] text-white rounded-lg p-4 flex items-center justify-between gap-4 shadow">
            <div>
              <h3 className="font-bold text-sm uppercase">🏆 Weekly Challenge Recorded</h3>
              <p className="text-[11px] text-blue-200 font-mono">Your score has been submitted to this week&apos;s leaderboard.</p>
            </div>
            <Link href="/leaderboard" className="px-4 py-2 bg-[#FFC107] text-[#0A369D] text-xs font-extrabold uppercase rounded shadow hover:bg-yellow-400 whitespace-nowrap">
              View Leaderboard
            </Link>
          </div>
        </div>
      )}

      {/* Performance Analytics / Weak-Subject Breakdown */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden bg-white rounded-lg border-2 border-gray-300 shadow p-5">
        <h3 className="text-sm font-black text-[#0A369D] uppercase tracking-wide mb-3">Performance Analytics</h3>
        <div className="space-y-2.5">
          {rankedSubjects.map((s) => {
            const pct = s.scaledScore;
            const tone = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-[#FFC107]" : "bg-[#D9383A]";
            return (
              <div key={s.subject}>
                <div className="flex justify-between text-[11px] font-mono mb-0.5">
                  <span className="font-bold text-gray-700">{s.subject}</span>
                  <span className="text-gray-500">{s.correct}/{s.total} • {pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-[11px] font-mono border-t border-gray-200 pt-3">
          {weakest.length > 0 ? (
            <p className="text-gray-700">
              <span className="font-bold text-[#D9383A]">Focus next on:</span>{" "}
              {weakest.map((s) => s.subject).join(", ")} — you scored below 50% here. Revise these before your next attempt.
            </p>
          ) : (
            <p className="text-green-700 font-bold">Solid work — every subject cleared the 50% mark. Push for 70%+ across the board next.</p>
          )}
          <p className="mt-2 text-gray-500">
            Track your progress over time on your{" "}
            <Link href="/history" className="text-[#0A369D] font-bold underline">attempt history</Link>.
          </p>
        </div>
      </div>

      {/* Email the result slip (optional) */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden bg-white rounded-lg border-2 border-gray-300 shadow p-5">
        <h3 className="text-sm font-black text-[#0A369D] uppercase tracking-wide mb-2">Email My Result Slip</h3>

        {lockedEmail ? (
          <>
            <p className="text-[11px] text-gray-500 font-mono mb-3">
              A copy — with the PDF slip attached — is always sent to your registered email.
              Add more recipients below (up to {MAX_RECIPIENTS} total).
            </p>

            {/* Locked registered email */}
            <div className="mb-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Registered — always receives a copy</label>
              <input
                type="text"
                value={lockedEmail}
                disabled
                aria-label="Registered email (locked)"
                className="w-full border-2 border-gray-200 bg-gray-100 text-gray-500 rounded px-3 py-2 text-sm font-mono cursor-not-allowed outline-none"
              />
            </div>

            {/* Extra recipient rows */}
            {extraRecipients.map((addr, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={addr}
                  onChange={(e) => {
                    const next = [...extraRecipients];
                    next[i] = e.target.value;
                    setExtraRecipients(next);
                    if (emailStatus !== "idle") { setEmailStatus("idle"); setEmailError(""); }
                  }}
                  placeholder="parent@example.com"
                  className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm font-mono focus:border-[#0A369D] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setExtraRecipients(extraRecipients.filter((_, idx) => idx !== i))}
                  aria-label="Remove recipient"
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold rounded"
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              {extraRecipients.length + 1 < MAX_RECIPIENTS && (
                <button
                  type="button"
                  onClick={() => setExtraRecipients([...extraRecipients, ""])}
                  className="px-4 py-2 bg-white border-2 border-[#0A369D] hover:bg-[#E9F1F7] text-[#0A369D] text-xs font-bold uppercase rounded"
                >
                  + Add another recipient
                </button>
              )}
              <button
                onClick={handleEmailSlip}
                disabled={emailStatus === "sending"}
                className="sm:ml-auto px-5 py-2 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow whitespace-nowrap"
              >
                {emailStatus === "sending" ? "Sending…" : "Send Result"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] text-gray-500 font-mono mb-3">
              Send this result — with the PDF slip attached — to one or more inboxes.
              Separate multiple addresses with a comma (up to {MAX_RECIPIENTS}).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={emailAddr}
                onChange={(e) => { setEmailAddr(e.target.value); if (emailStatus !== "idle") { setEmailStatus("idle"); setEmailError(""); } }}
                placeholder="you@example.com, parent@example.com"
                className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm font-mono focus:border-[#0A369D] outline-none"
              />
              <button
                onClick={handleEmailSlip}
                disabled={emailStatus === "sending"}
                className="px-5 py-2 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow whitespace-nowrap"
              >
                {emailStatus === "sending" ? "Sending…" : "Send Result"}
              </button>
            </div>
          </>
        )}
        {emailStatus === "sent" && <p className="text-[11px] text-green-700 font-bold font-mono mt-2">✓ Sent. Check the inbox (and spam folder).</p>}
        {emailStatus === "error" && (
          <p className="text-[11px] text-[#D9383A] font-bold font-mono mt-2">
            Could not send{emailError ? `: ${emailError}` : ". Check the address(es), or email may not be enabled on this deployment."}
          </p>
        )}
      </div>

      {/* 2. Detailed Performance & Analytics review */}
      <div ref={reviewRef} className="max-w-4xl mx-auto bg-white rounded-lg border-2 border-gray-300 shadow-xl p-6">

        {/* Watermark-friendly header for the exported review PDF */}
        <div className="flex items-center gap-3 mb-6 border-b-2 border-[#FFC107] pb-3">
          <div className="w-11 h-11 bg-[#0A369D] rounded-full flex items-center justify-center border-2 border-[#FFC107] overflow-hidden">
            <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#0A369D] uppercase tracking-wide leading-tight">Prepify — Answer Review & Key Breakdown</h2>
            <p className="text-[10px] font-mono text-gray-500">{config.candidateName} • {config.registrationNumber}</p>
          </div>
        </div>

        {/* Quick Statistics Banner */}
        <div className="bg-[#E9F1F7] border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#0A369D] text-sm uppercase">Verification Diagnostics</h3>
            <p className="text-[10px] text-gray-500 font-mono">Detailed analysis of candidate performance during active test focus.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center font-mono">
            <div className="bg-white px-3 py-1.5 rounded border border-gray-250">
              <span className="text-[9px] text-gray-500 block">ACCURACY</span>
              <span className="font-bold text-gray-800 text-sm">{rawPercentage.toFixed(1)}%</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded border border-gray-250">
              <span className="text-[9px] text-gray-500 block">INFRACTIONS</span>
              <span className={`font-bold text-sm ${infractionLogs.length > 0 ? "text-[#D9383A]" : "text-green-600"}`}>
                {infractionLogs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Question Review Grid */}
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-base font-black text-[#0A369D] mb-4 uppercase tracking-wide border-b pb-1.5">
            Answer Review & Key Breakdown
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const graded = breakdownById.get(q.id);
              const userAnswer = graded?.userAnswer ?? null;
              const correctAnswer = graded?.correctAnswer; // 'a'|'b'|'c'|'d'
              const isCorrect = !!graded?.isCorrect;

              const getOptionLabel = (key: 'a' | 'b' | 'c' | 'd') => {
                if (key === 'a') return q.option.a;
                if (key === 'b') return q.option.b;
                if (key === 'c') return q.option.c;
                return q.option.d;
              };

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded border-2 transition-shadow hover:shadow ${
                    isCorrect ? "border-green-300 bg-green-50/50" : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono uppercase">
                      Q{idx + 1} • {q.subject}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                      isCorrect ? "bg-green-600 text-white" : "bg-[#D9383A] text-white"
                    }`}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.question }} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className={`p-2 rounded border ${userAnswer === 'A' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">A.</span>{q.option.a}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'B' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">B.</span>{q.option.b}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'C' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">C.</span>{q.option.c}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'D' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">D.</span>{q.option.d}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] font-mono bg-white p-2 rounded border border-gray-200 mb-2">
                    <div>
                      <span className="text-gray-500">Your Selection:</span>{" "}
                      <span className={`font-bold uppercase ${isCorrect ? "text-green-600" : "text-[#D9383A]"}`}>
                        {userAnswer ? `${userAnswer} (${getOptionLabel(userAnswer.toLowerCase() as 'a'|'b'|'c'|'d')})` : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Correct Answer:</span>{" "}
                      <span className="font-bold uppercase text-green-700">
                        {correctAnswer ? `${correctAnswer.toUpperCase()} (${getOptionLabel(correctAnswer)})` : "—"}
                      </span>
                    </div>
                  </div>

                  {graded?.explanation && (
                    <div className="text-[11px] text-gray-700 bg-amber-50/50 p-2.5 rounded border border-amber-200 mt-2 font-sans leading-relaxed">
                      <span className="font-bold text-[#0A369D] block mb-0.5">Explanation / Reference:</span>
                      {graded.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Action bar — kept OUTSIDE reviewRef so it never appears in the exported PDF */}
      <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <Link
          href="/history"
          className="inline-block px-8 py-3 bg-white border-2 border-[#0A369D] hover:bg-[#E9F1F7] text-[#0A369D] font-extrabold rounded shadow-md text-xs uppercase tracking-wider transition-transform hover:scale-105 duration-150"
        >
          📈 My History
        </Link>
        <Link
          href="/leaderboard"
          className="inline-block px-8 py-3 bg-[#FFC107] hover:bg-yellow-400 text-[#0A369D] font-extrabold rounded shadow-md text-xs uppercase tracking-wider transition-transform hover:scale-105 duration-150"
        >
          🏆 View Leaderboard
        </Link>
        <Link
          href="/setup"
          onClick={clearSessionKeys}
          className="inline-block px-8 py-3 bg-[#0A369D] hover:bg-blue-900 text-white font-extrabold rounded shadow-md text-xs uppercase tracking-wider transition-transform hover:scale-105 duration-150"
        >
          Clear Session & Return to Candidate Portal
        </Link>
      </div>
    </div>
  );
}
