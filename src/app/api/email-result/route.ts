import { clientIp, rateLimit } from "@/lib/rateLimit";
import { SubjectScoreEntry } from "@/types/jamb";
import { NextResponse } from "next/server";
import { Resend } from "resend";

interface EmailResultRequest {
  to: string;
  candidateName: string;
  registrationNumber: string;
  mode: string;
  aggregateScore: number;
  totalCorrect: number;
  totalQuestions: number;
  subjectScores: SubjectScoreEntry[];
}

// Emails a candidate a copy of their result summary. Uses Resend when
// configured; otherwise logs and reports delivered:false so the UI degrades
// gracefully without a mail provider.
export async function POST(request: Request) {
  // Throttle: max 5 result emails per IP per 10 minutes.
  const limit = rateLimit(`email-result:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: EmailResultRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to } = body;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const candidateName = String(body.candidateName || "Candidate").slice(0, 120);
  const registrationNumber = String(body.registrationNumber || "").slice(0, 40);
  const modeLabel = body.mode === "JAMB_FULL" ? "Full UTME 4-Subject" : "Single Subject Drill";
  const subjectScores = Array.isArray(body.subjectScores) ? body.subjectScores : [];

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL || "Prepify <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email-result] Resend not configured; result not emailed to:", to);
    return NextResponse.json({ ok: true, delivered: false });
  }

  const rows = subjectScores
    .map(
      (s) =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(s.subject)}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${s.correct}/${s.total}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right;font-weight:bold">${s.scaledScore}/100</td></tr>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <div style="background:#0A369D;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <h1 style="margin:0;font-size:18px;letter-spacing:.5px">Prepify — UTME Practice Result</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#FFC107">Practice document — not an official examination result</p>
    </div>
    <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px">
      <p style="font-size:13px">Hello <strong>${escapeHtml(candidateName)}</strong>,</p>
      <p style="font-size:13px">Here is a summary of your practice attempt.</p>
      <table style="font-size:13px;margin:12px 0"><tbody>
        <tr><td style="padding:2px 0;color:#666">Registration:</td><td style="padding:2px 0 2px 12px;font-weight:bold">${escapeHtml(registrationNumber)}</td></tr>
        <tr><td style="padding:2px 0;color:#666">Mode:</td><td style="padding:2px 0 2px 12px;font-weight:bold">${escapeHtml(modeLabel)}</td></tr>
      </tbody></table>
      <div style="background:#E9F1F7;border:1px solid #b9d0e8;border-radius:8px;padding:14px;text-align:center;margin:14px 0">
        <div style="font-size:11px;color:#0A369D;text-transform:uppercase;letter-spacing:1px">Aggregate Score</div>
        <div style="font-size:32px;font-weight:bold;color:#0A369D">${body.aggregateScore} <span style="font-size:16px;color:#666">/ 400</span></div>
        <div style="font-size:12px;color:#444">${body.totalCorrect} of ${body.totalQuestions} correct</div>
      </div>
      ${
        rows
          ? `<table style="border-collapse:collapse;width:100%;font-size:12px;margin-top:8px">
              <thead><tr style="background:#0A369D;color:#fff">
                <th style="padding:6px 10px;text-align:left">Subject</th>
                <th style="padding:6px 10px;text-align:center">Correct</th>
                <th style="padding:6px 10px;text-align:right">Scaled</th>
              </tr></thead><tbody>${rows}</tbody></table>`
          : ""
      }
      <p style="font-size:11px;color:#888;margin-top:18px">You received this because your address was entered on the Prepify results page. Prepify is a practice platform and is not affiliated with any examination body.</p>
    </div>
  </div>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Your Prepify practice result — ${body.aggregateScore}/400`,
      html,
    });
    if (error) {
      console.error("[email-result] Resend error:", error);
      return NextResponse.json({ error: "Failed to send email." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[email-result] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
