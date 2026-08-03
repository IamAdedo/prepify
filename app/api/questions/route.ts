import { MOCK_JAMB_QUESTIONS } from "@/data/mockJambQuestions";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || "english";
  const year = searchParams.get("year");
  const apiKey = process.env.ALOC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ status: 200, source: "mock", data: MOCK_JAMB_QUESTIONS });
  }

  try {
    let url = `https://questions.aloc.ng/api/v2/q/40?subject=${subject}`;
    if (year && year !== "Randomized") {
      url += `&year=${year}`;
    }

    const response = await fetch(url, {
      headers: { "AccessToken": apiKey },
      next: { revalidate: 3600 },
    });

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
