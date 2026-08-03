import { MOCK_JAMB_QUESTIONS } from "@/data/mockJambQuestions";
import { NextResponse } from "next/server";

const SUBJECT_MAP: Record<string, string> = {
  "use of english": "english",
  "english": "english",
  "mathematics": "mathematics",
  "physics": "physics",
  "chemistry": "chemistry",
  "biology": "biology",
  "economics": "economics",
  "government": "government",
  "literature in english": "literature",
  "literature": "literature",
  "crk": "christianreligion_knowledge",
  "christian religion knowledge": "christianreligion_knowledge",
  "commerce": "commerce"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectParam = searchParams.get("subject") || "Use of English";
  const year = searchParams.get("year");
  const apiKey = process.env.ALOC_API_KEY;

  try {
    const combinedQuestions: any[] = [];
    const subjectsArray = subjectParam.split(",");

    for (const sub of subjectsArray) {
      const normalizedSub = sub.trim().toLowerCase();
      const apiSubject = SUBJECT_MAP[normalizedSub] || normalizedSub;

      let url = `https://questions.aloc.ng/api/v2/q/40?subject=${apiSubject}`;
      if (year && year !== "Randomized") {
        url += `&year=${year}`;
      }

      let subjectQuestions: any[] = [];

      // Attempt live API request if API key is present
      if (apiKey) {
        try {
          const response = await fetch(url, {
            headers: { "AccessToken": apiKey },
            next: { revalidate: 3600 },
          });
          if (response.ok) {
            const json = await response.json();
            // ALOC response format: { data: [...] } or direct array
            subjectQuestions = json.data || json;
          } else {
            console.warn(`[ALOC API HTTP Error ${response.status}] for subject: ${sub}`);
          }
        } catch (fetchErr) {
          console.error(`[ALOC API Network Error] for subject ${sub}:`, fetchErr);
        }
      }

      // Fallback to local mock data if API results are empty/failed
      if (!subjectQuestions || !Array.isArray(subjectQuestions) || subjectQuestions.length === 0) {
        const matchedMocks = MOCK_JAMB_QUESTIONS.filter((q) => {
          const qSub = q.subject.toLowerCase();
          return qSub === normalizedSub || SUBJECT_MAP[qSub] === apiSubject;
        });

        if (matchedMocks.length > 0) {
          subjectQuestions = matchedMocks;
        } else {
          // If no specific match, load first 4 questions as emergency buffer
          subjectQuestions = MOCK_JAMB_QUESTIONS.slice(0, 4);
        }
      }

      // Normalize format to conform to standard Question interface
      const formatted = subjectQuestions.map((q: any) => {
        const rawOption = q.option || {};
        return {
          id: q.id || Math.floor(Math.random() * 100000) + 1,
          subject: sub.trim(),
          question: q.question || "",
          option: {
            a: rawOption.a || q.optionA || "",
            b: rawOption.b || q.optionB || "",
            c: rawOption.c || q.optionC || "",
            d: rawOption.d || q.optionD || "",
          },
          answer: (q.answer || q.correctOption || "a").toLowerCase(),
          section: q.section || q.passage || "",
          explanation: q.explanation || q.solution || ""
        };
      });

      combinedQuestions.push(...formatted);
    }

    return NextResponse.json({
      status: 200,
      source: apiKey ? "live" : "fallback",
      data: combinedQuestions,
    });
  } catch (error) {
    console.error("[JAMB API Proxy Route Error]:", error);
    return NextResponse.json({
      status: 200,
      source: "fallback",
      data: MOCK_JAMB_QUESTIONS,
      error: "Remote service unreachable. Serving offline exam buffer."
    });
  }
}
