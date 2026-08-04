import {
  FullLeaderboardRow,
  LeaderboardSubmission,
  SubjectLeaderboards,
  SubjectLeaderboardRow,
} from "@/types/jamb";
import { getSupabase } from "./supabaseClient";
import { getIsoWeekKey } from "./week";

// Local-storage key for entries submitted on this device (used both as an
// offline fallback and to merge the current user's own attempt into the board).
const LOCAL_KEY = "jamb_local_leaderboard";

interface LocalEntry extends LeaderboardSubmission {
  entryId: string;
  createdAt: string;
}

function readLocal(): LocalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: LocalEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
}

// ---------------------------------------------------------------------------
// Ranking helpers (shared by the Supabase and local paths)
// ---------------------------------------------------------------------------
function toEntryList(subs: Array<LeaderboardSubmission & { entryId: string; createdAt: string }>) {
  return subs;
}

function rankFull(
  subs: Array<LeaderboardSubmission & { entryId: string; createdAt: string }>
): FullLeaderboardRow[] {
  return [...subs]
    .filter((s) => s.mode === "JAMB_FULL")
    .sort(
      (a, b) =>
        b.aggregateScore - a.aggregateScore ||
        a.durationSeconds - b.durationSeconds ||
        a.createdAt.localeCompare(b.createdAt)
    )
    .map((s, i) => ({
      position: i + 1,
      entryId: s.entryId,
      candidateName: s.candidateName,
      aggregateScore: s.aggregateScore,
      totalCorrect: s.totalCorrect,
      totalQuestions: s.totalQuestions,
      infractions: s.infractions,
      durationSeconds: s.durationSeconds,
      createdAt: s.createdAt,
    }));
}

function rankBySubject(
  subs: Array<LeaderboardSubmission & { entryId: string; createdAt: string }>
): SubjectLeaderboards {
  const bySubject: Record<string, Array<SubjectLeaderboardRow & { durationSeconds: number }>> = {};

  for (const entry of subs) {
    for (const ss of entry.subjectScores) {
      if (!bySubject[ss.subject]) bySubject[ss.subject] = [];
      bySubject[ss.subject].push({
        position: 0,
        entryId: entry.entryId,
        candidateName: entry.candidateName,
        correct: ss.correct,
        total: ss.total,
        scaledScore: ss.scaledScore,
        createdAt: entry.createdAt,
        durationSeconds: entry.durationSeconds,
      });
    }
  }

  const result: SubjectLeaderboards = {};
  // A subject only appears if it has >= 1 participant (guaranteed here since
  // keys are only created when a score is pushed).
  for (const [subject, rows] of Object.entries(bySubject)) {
    result[subject] = rows
      .sort(
        (a, b) =>
          b.scaledScore - a.scaledScore ||
          a.durationSeconds - b.durationSeconds ||
          a.createdAt.localeCompare(b.createdAt)
      )
      .map(({ durationSeconds, ...row }, i) => ({ ...row, position: i + 1 }));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Submit a completed weekly-challenge attempt. Always records locally so the
// user sees their own result; also pushes to Supabase when configured.
export async function submitLeaderboardEntry(sub: LeaderboardSubmission): Promise<void> {
  const local = readLocal();
  const entryId =
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) || `local-${Date.now()}`;
  local.push({ ...sub, entryId, createdAt: new Date().toISOString() });
  writeLocal(local);

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // Resolve the challenge for this week.
    const { data: challenge } = await supabase
      .from("weekly_challenges")
      .select("id")
      .eq("week_key", sub.weekKey)
      .maybeSingle();

    if (!challenge) return; // no active challenge row; keep local only

    const { data: inserted, error } = await supabase
      .from("leaderboard_entries")
      .insert({
        challenge_id: challenge.id,
        candidate_name: sub.candidateName,
        registration_number: sub.registrationNumber,
        mode: sub.mode,
        aggregate_score: sub.aggregateScore,
        total_correct: sub.totalCorrect,
        total_questions: sub.totalQuestions,
        infractions: sub.infractions,
        duration_seconds: sub.durationSeconds,
      })
      .select("id")
      .single();

    if (error || !inserted) return;

    if (sub.subjectScores.length > 0) {
      await supabase.from("leaderboard_subject_scores").insert(
        sub.subjectScores.map((ss) => ({
          entry_id: inserted.id,
          challenge_id: challenge.id,
          subject: ss.subject,
          correct: ss.correct,
          total: ss.total,
          scaled_score: ss.scaledScore,
        }))
      );
    }
  } catch (err) {
    console.warn("Leaderboard remote submit failed; kept local copy.", err);
  }
}

export interface LeaderboardData {
  full: FullLeaderboardRow[];
  subjects: SubjectLeaderboards;
  source: "live" | "local";
}

// Fetch the leaderboard for a given week. Falls back to seed + local entries
// when Supabase is unavailable so the board is never empty.
export async function fetchLeaderboard(weekKey = getIsoWeekKey()): Promise<LeaderboardData> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const [{ data: fullRows }, { data: subjectRows }] = await Promise.all([
        supabase
          .from("full_jamb_leaderboard")
          .select("*")
          .eq("week_key", weekKey)
          .order("position", { ascending: true }),
        supabase
          .from("subject_leaderboard")
          .select("*")
          .eq("week_key", weekKey)
          .order("position", { ascending: true }),
      ]);

      const full: FullLeaderboardRow[] = (fullRows || []).map((r: any) => ({
        position: r.position,
        entryId: r.entry_id,
        candidateName: r.candidate_name,
        aggregateScore: r.aggregate_score,
        totalCorrect: r.total_correct,
        totalQuestions: r.total_questions,
        infractions: r.infractions,
        durationSeconds: r.duration_seconds,
        createdAt: r.created_at,
      }));

      const subjects: SubjectLeaderboards = {};
      for (const r of subjectRows || []) {
        if (!subjects[r.subject]) subjects[r.subject] = [];
        subjects[r.subject].push({
          position: r.position,
          entryId: r.entry_id,
          candidateName: r.candidate_name,
          correct: r.correct,
          total: r.total,
          scaledScore: r.scaled_score,
          createdAt: r.created_at,
        });
      }

      return { full, subjects, source: "live" };
    } catch (err) {
      console.warn("Leaderboard remote fetch failed; using local entries.", err);
    }
  }

  // Local/offline path: this device's own submissions for the week.
  const localOwn = readLocal().filter((e) => e.weekKey === weekKey);
  const combined = toEntryList([...localOwn]);

  return {
    full: rankFull(combined),
    subjects: rankBySubject(combined),
    source: "local",
  };
}
