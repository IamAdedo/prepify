import { decryptAnswerKey } from "@/lib/examCrypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { GradedQuestion, GradeResult, SubjectScoreEntry, UserAnswers } from "@/types/jamb";
import { NextResponse } from "next/server";

interface GradeRequest {
  answerToken: string;
  answers: UserAnswers;
  mode: "JAMB_FULL" | "PRACTICE_SINGLE";
  // Leaderboard metadata (only used when isWeeklyChallenge is true).
  isWeeklyChallenge?: boolean;
  weekKey?: string;
  candidateName?: string;
  registrationNumber?: string;
  durationSeconds?: number;
  infractions?: number;
}

// Server-authoritative grading. The correct answers live only inside the
// encrypted token minted by /api/questions; the client cannot see or alter
// them, so the score this route computes is trustworthy — and it, not the
// client, writes the weekly leaderboard entry.
export async function POST(request: Request) {
  let body: GradeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { answerToken, answers } = body;
  if (!answerToken || typeof answerToken !== "string") {
    return NextResponse.json({ error: "Missing answer token." }, { status: 400 });
  }

  let key;
  try {
    key = decryptAnswerKey(answerToken);
  } catch {
    return NextResponse.json({ error: "Answer token is invalid or corrupted." }, { status: 400 });
  }

  const safeAnswers: UserAnswers = answers && typeof answers === "object" ? answers : {};

  // Grade each question against the decrypted key.
  const breakdown: GradedQuestion[] = key.map((k) => {
    const raw = safeAnswers[k.id];
    const userAnswer = (raw ? String(raw).toUpperCase() : null) as GradedQuestion["userAnswer"];
    const isCorrect = !!userAnswer && userAnswer.toLowerCase() === k.answer.toLowerCase();
    return {
      id: k.id,
      subject: k.subject,
      correctAnswer: k.answer,
      userAnswer,
      isCorrect,
      explanation: k.explanation,
    };
  });

  const totalQuestions = breakdown.length;
  const totalCorrect = breakdown.filter((b) => b.isCorrect).length;

  // Per-subject scaled scores.
  const bySubject: Record<string, { correct: number; total: number }> = {};
  for (const b of breakdown) {
    const s = b.subject || "General";
    if (!bySubject[s]) bySubject[s] = { correct: 0, total: 0 };
    bySubject[s].total += 1;
    if (b.isCorrect) bySubject[s].correct += 1;
  }
  const subjectScores: SubjectScoreEntry[] = Object.entries(bySubject).map(([subject, d]) => ({
    subject,
    correct: d.correct,
    total: d.total,
    scaledScore: Math.round((d.correct / (d.total || 1)) * 100),
  }));

  const aggregateScore = Math.round((totalCorrect / (totalQuestions || 1)) * 400);

  // Record the weekly-challenge entry SERVER-SIDE (authoritative).
  let leaderboardRecorded = false;
  if (body.isWeeklyChallenge && body.weekKey) {
    leaderboardRecorded = await recordLeaderboard({
      weekKey: body.weekKey,
      candidateName: body.candidateName || "Anonymous",
      registrationNumber: body.registrationNumber || "",
      mode: body.mode,
      aggregateScore,
      totalCorrect,
      totalQuestions,
      infractions: Math.max(0, Number(body.infractions) || 0),
      durationSeconds: Math.max(0, Number(body.durationSeconds) || 0),
      subjectScores,
    });
  }

  const result: GradeResult = {
    aggregateScore,
    totalCorrect,
    totalQuestions,
    subjectScores,
    breakdown,
    leaderboardRecorded,
  };
  return NextResponse.json(result);
}

interface LeaderboardWrite {
  weekKey: string;
  candidateName: string;
  registrationNumber: string;
  mode: string;
  aggregateScore: number;
  totalCorrect: number;
  totalQuestions: number;
  infractions: number;
  durationSeconds: number;
  subjectScores: SubjectScoreEntry[];
}

async function recordLeaderboard(w: LeaderboardWrite): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  try {
    const { data: challenge } = await supabase
      .from("weekly_challenges")
      .select("id")
      .eq("week_key", w.weekKey)
      .maybeSingle();
    if (!challenge) return false;

    const { data: inserted, error } = await supabase
      .from("leaderboard_entries")
      .insert({
        challenge_id: challenge.id,
        candidate_name: w.candidateName,
        registration_number: w.registrationNumber,
        mode: w.mode,
        aggregate_score: w.aggregateScore,
        total_correct: w.totalCorrect,
        total_questions: w.totalQuestions,
        infractions: w.infractions,
        duration_seconds: w.durationSeconds,
      })
      .select("id")
      .single();
    if (error || !inserted) return false;

    if (w.subjectScores.length > 0) {
      await supabase.from("leaderboard_subject_scores").insert(
        w.subjectScores.map((ss) => ({
          entry_id: inserted.id,
          challenge_id: challenge.id,
          subject: ss.subject,
          correct: ss.correct,
          total: ss.total,
          scaled_score: ss.scaledScore,
        }))
      );
    }
    return true;
  } catch (err) {
    console.error("[grade] leaderboard write failed:", err);
    return false;
  }
}
