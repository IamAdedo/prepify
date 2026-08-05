import { clientIp, rateLimit } from "@/lib/rateLimit";
import { SubjectScoreEntry } from "@/types/jamb";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// nodemailer needs Node's net/tls sockets — force the Node.js runtime (not Edge)
// and allow enough wall-clock for the SMTP handshake + send.
export const runtime = "nodejs";
export const maxDuration = 30;

interface EmailResultRequest {
  to: string | string[];
  candidateName: string;
  registrationNumber: string;
  mode: string;
  aggregateScore: number;
  maxAggregate?: number;
  totalCorrect: number;
  totalQuestions: number;
  subjectScores: SubjectScoreEntry[];
  // Optional result-slip PDF to attach (base64, no data-URI prefix).
  attachment?: { filename: string; contentBase64: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 5;

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

  // Accept one address or a list; normalize, validate, dedupe, and cap.
  const rawRecipients = Array.isArray(body.to) ? body.to : [body.to];
  const recipients = Array.from(
    new Set(
      rawRecipients
        .map((r) => String(r || "").trim().toLowerCase())
        .filter((r) => EMAIL_RE.test(r))
    )
  ).slice(0, MAX_RECIPIENTS);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "At least one valid recipient email is required." },
      { status: 400 }
    );
  }

  const candidateName = String(body.candidateName || "Candidate").slice(0, 120);
  const registrationNumber = String(body.registrationNumber || "").slice(0, 40);
  const modeLabel = body.mode === "JAMB_FULL" ? "Full UTME 4-Subject" : "Single Subject Drill";
  const subjectScores = Array.isArray(body.subjectScores) ? body.subjectScores : [];
  // Ceiling: 100 per subject (400 full UTME, 100 single drill).
  const maxAggregate =
    Number(body.maxAggregate) > 0 ? Number(body.maxAggregate) : Math.max(100, subjectScores.length * 100);

  // Optional result-slip PDF attachment.
  let attachments: { filename: string; content: Buffer }[] | undefined;
  if (body.attachment?.contentBase64) {
    try {
      const filename = String(body.attachment.filename || "Prepify_Result_Slip.pdf").slice(0, 120);
      attachments = [{ filename, content: Buffer.from(body.attachment.contentBase64, "base64") }];
    } catch {
      // Malformed attachment — send the email without it rather than failing.
      attachments = undefined;
    }
  }

  // Gmail SMTP (Nodemailer). GMAIL_USER + GMAIL_APP_PASSWORD are server-only
  // secrets (no NEXT_PUBLIC_ prefix). The app password requires 2FA on the
  // Google account. Gmail rewrites the envelope sender to the authenticated
  // account, so `from` is always that address (with a friendly display name).
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.CONTACT_FROM_NAME || "Prepify";
  const from = gmailUser ? `${fromName} <${gmailUser}>` : "";

  if (!gmailUser || !gmailPass) {
    console.warn(
      "[email-result] Gmail SMTP not configured; result not emailed to:",
      recipients.join(", ")
    );
    return NextResponse.json({ ok: true, delivered: false, recipients: recipients.length });
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
        <div style="font-size:32px;font-weight:bold;color:#0A369D">${body.aggregateScore} <span style="font-size:16px;color:#666">/ ${maxAggregate}</span></div>
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
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
      // Serverless (Vercel/Lambda) can hang on SMTP if the provider throttles
      // the datacenter IP. Fail fast with a real error instead of letting the
      // function time out into an opaque 504.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    const subject = `Your Prepify practice result — ${body.aggregateScore}/${maxAggregate}`;
    // Send each recipient their OWN email so addresses aren't exposed to each
    // other. One malformed/rejected address shouldn't sink the rest.
    const mailAttachments = attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    }));
    const sends = await Promise.allSettled(
      recipients.map((recipient) =>
        transporter.sendMail({
          from,
          to: recipient,
          subject,
          html,
          attachments: mailAttachments,
        })
      )
    );

    const delivered = sends.filter((s) => s.status === "fulfilled").length;
    const rejections = sends
      .filter((s): s is PromiseRejectedResult => s.status === "rejected")
      .map((s) => s.reason);
    rejections.forEach((reason) => console.error("[email-result] Gmail SMTP error:", reason));

    if (delivered === 0) {
      // Surface the real SMTP reason so misconfiguration (e.g. a bad app
      // password) is diagnosable instead of a generic failure.
      const first = rejections[0] as { message?: string; code?: string } | undefined;
      const reason = first?.message || first?.code || "Email provider rejected the request.";
      return NextResponse.json({ error: "Failed to send email.", reason }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      delivered,
      recipients: recipients.length,
      partial: delivered < recipients.length,
    });
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
