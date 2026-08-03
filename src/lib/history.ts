import { getSupabase } from "@/lib/supabaseClient";
import { AttemptRecord } from "@/types/jamb";

const LOCAL_KEY = "jamb_attempts";

function readLocal(): AttemptRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLocal(list: AttemptRecord[]) {
  if (typeof window === "undefined") return;
  // Keep the most recent 50 attempts on-device.
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 50)));
}

// Persist a completed attempt. Always stored locally; also pushed to Supabase
// when the candidate is signed in, so history follows them across devices.
export async function saveAttempt(attempt: AttemptRecord): Promise<void> {
  const list = readLocal();
  if (!list.some((a) => a.id === attempt.id)) {
    list.unshift(attempt);
    writeLocal(list);
  }

  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return; // anonymous — local only
    await supabase.from("attempts").insert({
      user_id: auth.user.id,
      client_attempt_id: attempt.id,
      candidate_name: attempt.candidateName,
      registration_number: attempt.registrationNumber,
      mode: attempt.mode,
      subjects: attempt.subjects,
      aggregate_score: attempt.aggregateScore,
      total_correct: attempt.totalCorrect,
      total_questions: attempt.totalQuestions,
      accuracy: attempt.accuracy,
      duration_seconds: attempt.durationSeconds,
      infractions: attempt.infractions,
      is_weekly_challenge: attempt.isWeeklyChallenge,
      subject_scores: attempt.subjectScores,
      completed_at: attempt.completedAt,
    });
  } catch (err) {
    console.warn("Attempt remote sync failed; kept local copy.", err);
  }
}

// Load history — merges the signed-in user's remote attempts with local ones,
// de-duplicated by attempt id, newest first.
export async function loadAttempts(): Promise<AttemptRecord[]> {
  const local = readLocal();
  const supabase = getSupabase();
  if (!supabase) return local;

  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return local;

    const { data } = await supabase
      .from("attempts")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("completed_at", { ascending: false });

    const remote: AttemptRecord[] = (data || []).map((r: any) => ({
      id: r.client_attempt_id || r.id,
      completedAt: r.completed_at,
      candidateName: r.candidate_name,
      registrationNumber: r.registration_number,
      mode: r.mode,
      subjects: r.subjects || [],
      aggregateScore: r.aggregate_score,
      totalCorrect: r.total_correct,
      totalQuestions: r.total_questions,
      accuracy: r.accuracy,
      durationSeconds: r.duration_seconds,
      infractions: r.infractions,
      isWeeklyChallenge: r.is_weekly_challenge,
      subjectScores: r.subject_scores || [],
    }));

    const byId = new Map<string, AttemptRecord>();
    [...remote, ...local].forEach((a) => byId.set(a.id, a));
    return Array.from(byId.values()).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  } catch {
    return local;
  }
}
