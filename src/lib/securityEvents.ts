import { SecurityEventSummary } from "@/types/jamb";

// Raw infraction log lines look like: "[10:22:31 AM] Tab visibility hidden (switched away)."
// This groups them into distinct event types with an occurrence count, so the
// result page can show one line per event type instead of a long raw feed.
const RULES: Array<{ test: RegExp; label: string; severity: SecurityEventSummary["severity"] }> = [
  { test: /multiple individuals|multiple people/i, label: "Multiple individuals detected", severity: "CRITICAL" },
  { test: /no candidate detected|left the exam|no person/i, label: "Candidate left the frame", severity: "CRITICAL" },
  { test: /tab visibility hidden|switched away|switched tab/i, label: "Switched tab / window", severity: "CRITICAL" },
  { test: /window focus lost/i, label: "Window focus lost", severity: "WARNING" },
  { test: /background noise/i, label: "Background noise interruption", severity: "WARNING" },
  { test: /fullscreen/i, label: "Exited fullscreen mode", severity: "CRITICAL" },
];

export function summarizeSecurityEvents(logs: string[]): SecurityEventSummary[] {
  const counts = new Map<string, SecurityEventSummary>();

  for (const line of logs) {
    const rule = RULES.find((r) => r.test.test(line));
    const label = rule ? rule.label : "Other security event";
    const severity = rule ? rule.severity : "INFO";

    const existing = counts.get(label);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(label, { label, count: 1, severity });
    }
  }

  // Most severe first, then by frequency.
  const order: Record<SecurityEventSummary["severity"], number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return Array.from(counts.values()).sort(
    (a, b) => order[a.severity] - order[b.severity] || b.count - a.count
  );
}
