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

const ALOC_BASE = "https://dev.aloc.com.ng/api/v1/questions";
const ENGLISH_ALIASES = new Set(["use of english", "english", "english language"]);

// How many questions each subject carries, per exam mode:
//  • Full UTME  → Use of English = 60, every other subject = 40 (equal 100 marks
//    each; the 60 vs 40 split mirrors the real UTME structure).
//  • Single drill → 100 questions on the chosen subject.
function targetCountFor(normalizedSub: string, mode: string): number {
  if (mode === "PRACTICE_SINGLE") return 100;
  return ENGLISH_ALIASES.has(normalizedSub) ? 60 : 40;
}

// ALOC JAMB past questions broadly span these years. Picking a random year gives
// cross-attempt variety cheaply; if a year is thin/missing the caller tops up
// across all years, so counts are never sacrificed for variety.
function randomYear(): string {
  const START = 2001;
  const END = 2020;
  return String(START + Math.floor(Math.random() * (END - START + 1)));
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Page through ALOC (limit=40 is its max) accumulating UNIQUE questions into
// `collected` until we reach `target` or run out. `random=true` is deliberately
// NOT used — it's capped at 10/call on the free tier, which can't fill 40/60/100
// reliably. Pagination returns 40/call, so a full exam is ~5 calls: well under
// the portal's burst rate limit.
async function paginateAloc(
  apiSubject: string,
  target: number,
  year: string | null,
  apiKey: string,
  collected: Map<string, any>
): Promise<void> {
  let cursor: string | null = null;
  const remaining = Math.max(0, target - collected.size);
  const maxPages = Math.ceil(remaining / 40) + 1; // small headroom for dupes

  for (let page = 0; page < maxPages && collected.size < target; page++) {
    let url = `${ALOC_BASE}?subject=${encodeURIComponent(apiSubject)}&examType=jamb&limit=40`;
    if (year) url += `&year=${encodeURIComponent(year)}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
        cache: "no-store",
      });
    } catch (err) {
      console.error(`[ALOC network error] ${apiSubject}:`, err);
      return;
    }
    if (!response.ok) {
      // 404 just means "no questions for this subject/year" — not worth logging.
      if (response.status !== 404) {
        const body = await response.text().catch(() => "");
        console.warn(`[ALOC HTTP ${response.status}] ${apiSubject}: ${body.slice(0, 160)}`);
      }
      return;
    }
    const json = await response.json();
    const rows: any[] = Array.isArray(json?.data) ? json.data : [];
    for (const q of rows) {
      const id = q?.id ?? `${apiSubject}-${collected.size}`;
      if (!collected.has(id)) collected.set(id, q);
    }
    const nextCursor = json?.pagination?.nextCursor;
    if (!json?.pagination?.hasMore || !nextCursor) return;
    cursor = nextCursor;
  }
}

// Fetch `target` unique questions for one subject, shuffled. Uses a random year
// for variety (when the caller didn't pin a specific year), then tops up across
// all years so the exact count is always met when the pool allows.
async function fetchSubjectQuestions(
  apiSubject: string,
  target: number,
  configYear: string | null,
  apiKey: string
): Promise<any[]> {
  const collected = new Map<string, any>();
  const specificYear = configYear && configYear !== "Randomized" ? configYear : null;

  if (specificYear) {
    await paginateAloc(apiSubject, target, specificYear, apiKey, collected);
  } else {
    await paginateAloc(apiSubject, target, randomYear(), apiKey, collected);
    if (collected.size < target) {
      await paginateAloc(apiSubject, target, null, apiKey, collected);
    }
  }
  return shuffle(Array.from(collected.values())).slice(0, target);
}

// Normalize either the ALOC v1 shape ({ text, options:{A..D}, correctAnswer })
// or the local mock shape ({ question, option:{a..d}, answer }) to our Question.
function normalizeQuestion(q: any, displaySubject: string): any {
  const rawOption = q.option || {};
  const alocOptions = q.options || {};
  // ALOC `section` can be a MathML/HTML blob for maths — only keep it when it's
  // plain-text context (e.g. a comprehension passage / instruction).
  const rawSection = q.section || q.passage || "";
  const section =
    typeof rawSection === "string" && !rawSection.includes("<") ? rawSection : "";
  const answerLetter = q.answer || q.correctAnswer || q.correctOption || "a";
  return {
    id: q.id || Math.floor(Math.random() * 100000) + 1,
    subject: displaySubject,
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
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectParam = searchParams.get("subject") || "Use of English";
  const year = searchParams.get("year");
  const mode = searchParams.get("mode") === "PRACTICE_SINGLE" ? "PRACTICE_SINGLE" : "JAMB_FULL";
  const apiKey = process.env.ALOC_API_KEY;

  try {
    const combinedQuestions: any[] = [];
    const subjectsArray = subjectParam.split(",");
    let liveCount = 0; // how many questions actually came from ALOC (not mock)

    for (const sub of subjectsArray) {
      const displaySubject = sub.trim();
      const normalizedSub = displaySubject.toLowerCase();
      const apiSubject = SUBJECT_MAP[normalizedSub] || normalizedSub;
      const target = targetCountFor(normalizedSub, mode);

      // Try live ALOC first (paginated to hit the exact target count).
      let liveQuestions: any[] = [];
      if (apiKey) {
        liveQuestions = await fetchSubjectQuestions(apiSubject, target, year, apiKey);
      }

      let subjectQuestions: any[];
      if (liveQuestions.length > 0) {
        liveCount += liveQuestions.length;
        subjectQuestions = liveQuestions;
      } else {
        // Fallback to local mock data if the live API failed/returned nothing.
        const matchedMocks = MOCK_JAMB_QUESTIONS.filter((q) => {
          const qSub = q.subject.toLowerCase();
          return qSub === normalizedSub || SUBJECT_MAP[qSub] === apiSubject;
        });
        subjectQuestions =
          matchedMocks.length > 0 ? matchedMocks : MOCK_JAMB_QUESTIONS.slice(0, 4);
      }

      combinedQuestions.push(
        ...subjectQuestions.map((q) => normalizeQuestion(q, displaySubject))
      );
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
