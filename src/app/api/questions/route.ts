import { MOCK_JAMB_QUESTIONS } from "@/data/mockJambQuestions";
import { encryptAnswerKey, AnswerKeyItem } from "@/lib/examCrypto";
import { NextResponse } from "next/server";

// Maps the app's display subject names to ALOC dev-portal subject slugs.
// Slugs verified against the live API's `availableSubjects` list
// (https://dev.aloc.com.ng/api/v1/questions).
const SUBJECT_MAP: Record<string, string> = {
  "use of english": "english-language",
  "english": "english-language",
  "english language": "english-language",
  "mathematics": "mathematics",
  "physics": "physics",
  "chemistry": "chemistry",
  "biology": "biology",
  "economics": "economics",
  "government": "government",
  "literature in english": "literature-in-english",
  "literature": "literature-in-english",
  "crk": "christian-religious-studies",
  "christian religion knowledge": "christian-religious-studies",
  "christian religious studies": "christian-religious-studies",
  "commerce": "commerce",
  "geography": "geography",
  "accounting": "accounting",
  "financial accounting": "accounting",
  "civic education": "civic-education",
  "history": "history",
  "insurance": "insurance",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectParam = searchParams.get("subject") || "Use of English";
  const year = searchParams.get("year");
  const apiKey = process.env.ALOC_API_KEY;

  try {
    const combinedQuestions: any[] = [];
    const subjectsArray = subjectParam.split(",");
    let liveCount = 0; // how many questions actually came from ALOC (not mock)

    for (const sub of subjectsArray) {
      const normalizedSub = sub.trim().toLowerCase();
      const apiSubject = SUBJECT_MAP[normalizedSub] || normalizedSub;

      // ALOC developer portal (dev.aloc.com.ng/api/v1). `random=true` returns a
      // fresh set each call so exams aren't identical; limit maxes out at 40.
      let url = `https://dev.aloc.com.ng/api/v1/questions?subject=${encodeURIComponent(
        apiSubject
      )}&examType=jamb&limit=40&random=true`;
      if (year && year !== "Randomized") {
        url += `&year=${encodeURIComponent(year)}`;
      }

      let subjectQuestions: any[] = [];
      let fromLive = false;

      // Attempt live API request if API key is present
      if (apiKey) {
        try {
          const response = await fetch(url, {
            headers: { "X-API-Key": apiKey, Accept: "application/json" },
            cache: "no-store", // don't cache — random=true must vary per exam
          });
          if (response.ok) {
            const json = await response.json();
            // ALOC v1 envelope: { data: [...], pagination, meta }
            const rows = Array.isArray(json?.data) ? json.data : [];
            if (rows.length > 0) {
              subjectQuestions = rows;
              fromLive = true;
            } else {
              console.warn(`[ALOC] 200 but no questions for subject: ${sub}`);
            }
          } else {
            const body = await response.text().catch(() => "");
            console.warn(
              `[ALOC HTTP ${response.status}] subject "${sub}": ${body.slice(0, 200)}`
            );
          }
        } catch (fetchErr) {
          console.error(`[ALOC network error] subject "${sub}":`, fetchErr);
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

      if (fromLive) liveCount += subjectQuestions.length;

      // Normalize to the app's Question shape. Handles BOTH the ALOC v1 shape
      // ({ text, options:{A..D}, correctAnswer }) and the local mock shape
      // ({ question, option:{a..d}, answer }).
      const formatted = subjectQuestions.map((q: any) => {
        const rawOption = q.option || {};
        const alocOptions = q.options || {};
        // ALOC section can be a MathML/HTML blob for maths — only keep it when
        // it's plain-text context (e.g. a comprehension passage / instruction).
        const rawSection = q.section || q.passage || "";
        const section =
          typeof rawSection === "string" && !rawSection.includes("<") ? rawSection : "";
        const answerLetter = q.answer || q.correctAnswer || q.correctOption || "a";
        return {
          id: q.id || Math.floor(Math.random() * 100000) + 1,
          subject: sub.trim(),
          question: q.question || q.text || "",
          option: {
            a: rawOption.a || alocOptions.A || q.optionA || "",
            b: rawOption.b || alocOptions.B || q.optionB || "",
            c: rawOption.c || alocOptions.C || q.optionC || "",
            d: rawOption.d || alocOptions.D || q.optionD || "",
          },
          answer: String(answerLetter).toLowerCase(),
          section,
          explanation: q.explanation || q.solution || "",
        };
      });

      combinedQuestions.push(...formatted);
    }

    // Split into a client-safe payload (no answers/explanations) and an
    // encrypted answer key. The browser never receives the correct answers
    // during the exam — it returns the opaque token to /api/grade at submit.
    const answerKey: AnswerKeyItem[] = combinedQuestions
      .filter((q) => q.answer)
      .map((q) => ({
        id: q.id,
        subject: q.subject,
        answer: q.answer as AnswerKeyItem["answer"],
        explanation: q.explanation || undefined,
      }));

    const clientQuestions = combinedQuestions.map((q) => ({
      id: q.id,
      subject: q.subject,
      question: q.question,
      option: q.option,
      section: q.section,
    }));

    const answerToken = encryptAnswerKey(answerKey);

    return NextResponse.json({
      status: 200,
      source: liveCount > 0 ? "live" : "fallback",
      data: clientQuestions,
      answerToken,
    });
  } catch (error) {
    console.error("[Prepify Questions API Route Error]:", error);
    // Emergency offline buffer — still answer-stripped + tokenized.
    const answerKey: AnswerKeyItem[] = MOCK_JAMB_QUESTIONS
      .filter((q) => q.answer)
      .map((q) => ({
        id: q.id,
        subject: q.subject,
        answer: q.answer as AnswerKeyItem["answer"],
        explanation: q.explanation || undefined,
      }));
    const clientQuestions = MOCK_JAMB_QUESTIONS.map((q) => ({
      id: q.id,
      subject: q.subject,
      question: q.question,
      option: q.option,
      section: (q as any).section || "",
    }));
    return NextResponse.json({
      status: 200,
      source: "fallback",
      data: clientQuestions,
      answerToken: encryptAnswerKey(answerKey),
      error: "Remote service unreachable. Serving offline exam buffer."
    });
  }
}
