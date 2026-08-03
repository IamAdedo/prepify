// ISO-8601 week key, e.g. "2026-W31". Matches the Postgres seed
// (to_char(now(),'IYYY') || '-W' || to_char(now(),'IW')).
export function getIsoWeekKey(date: Date = new Date()): string {
  // Copy so we don't mutate the caller's date.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO week day (Mon=1..Sun=7)
  const dayNum = d.getUTCDay() || 7;
  // Shift to the Thursday of this week (ISO weeks are Thursday-anchored).
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Human-readable label for the current week's challenge.
export function getWeeklyChallengeTitle(date: Date = new Date()): string {
  return `Weekly UTME Challenge — ${getIsoWeekKey(date)}`;
}

// Milliseconds until the current ISO week ends (next Monday 00:00 UTC).
export function millisUntilWeekEnd(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  const daysUntilMonday = 8 - dayNum; // days to next Monday
  const nextMonday = new Date(d);
  nextMonday.setUTCDate(d.getUTCDate() + daysUntilMonday);
  return nextMonday.getTime() - date.getTime();
}
