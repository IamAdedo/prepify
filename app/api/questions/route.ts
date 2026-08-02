import { MOCK_JAMB_QUESTIONS } from "@/data/mockJambQuestions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || "english";
  const apiKey = process.env.ALOC_API_KEY;

  if (!apiKey) {
    console.warn("[JAMB API] ALOC_API_KEY missing. Returning fallback dataset.");
    return NextResponse.json({ status: 200, source: "mock", data: MOCK_JAMB_QUESTIONS });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second fail-safe timeout

    const response = await fetch(`https://questions.aloc.ng/api/v2/q/40?subject=${subject}`, {
      headers: {
        "AccessToken": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache responses for 1 hour on Vercel Edge
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ALOC API returned HTTP ${response.status}`);
    }

    const json = await response.json();
    return NextResponse.json({ status: 200, source: "live", data: json.data || json });
  } catch (error) {
    console.error("[JAMB API Proxy Error]:", error);
    // Silent degradation to local dataset
    return NextResponse.json({
      status: 200,
      source: "fallback",
      data: MOCK_JAMB_QUESTIONS,
      error: "Remote service unreachable. Serving offline exam buffer."
    });
  }
}
