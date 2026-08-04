import { clientIp, rateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { Resend } from "resend";

// Contact form handler. Sends via Resend when configured; otherwise logs the
// message server-side and still returns success so the form works in dev.
export async function POST(request: Request) {
  // Throttle: max 5 messages per IP per 10 minutes.
  const limit = rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const { name, email, msg } = await request.json();

    if (!name?.trim() || !email?.trim() || !msg?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || "Prepify <onboarding@resend.dev>";

    if (!apiKey || !to) {
      console.warn("[contact] Resend not configured; message not emailed:", { name, email, msg });
      return NextResponse.json({ ok: true, delivered: false });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Prepify support — ${name}`,
      text: `From: ${name} <${email}>\n\n${msg}`,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json({ error: "Failed to send message." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
