"use client";

import { QuestionCanvas } from "@/components/QuestionCanvas";
import { QuestionMap } from "@/components/QuestionMap";
import { SubmissionModal } from "@/components/SubmissionModal";
import { TopHeader } from "@/components/TopHeader";
import { WebCamMonitor } from "@/components/WebCamMonitor";
import { useAdvancedProctoring } from "@/hooks/useAdvancedProctoring";
import { useCandidateGate } from "@/hooks/useCandidateGate";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useJambKeybindings } from "@/hooks/useJambKeybindings";
import { ExamConfig, Question, UserAnswers } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ExamWorkspacePage() {
  const router = useRouter();
  const gate = useCandidateGate();
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [visitedQuestions, setVisitedQuestions] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Flips true when the candidate submits so proctoring devices (camera/mic)
  // are released immediately rather than on route unmount.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Holds the proctoring hook's beginSubmission so executeSubmission (declared
  // before the hook) can flag an intentional fullscreen exit.
  const beginSubmissionRef = useRef<(() => void) | null>(null);

  // Initialize Exam Session. Questions were pre-fetched and cached by the setup
  // page (server-authoritative flow — the answer key never reaches the client
  // here, only the encrypted jamb_answer_token that /api/grade consumes later).
  // We read from cache and support resuming an in-progress exam after a refresh.
  useEffect(() => {
    const storedConfig = localStorage.getItem("jamb_config");
    if (!storedConfig) {
      router.push("/");
      return;
    }
    const parsedConfig: ExamConfig = JSON.parse(storedConfig);
    setConfig(parsedConfig);

    // Restore any in-progress answers / navigation position.
    const savedAnswers = localStorage.getItem("jamb_answers");
    if (savedAnswers) {
      try { setAnswers(JSON.parse(savedAnswers)); } catch {/* ignore */}
    }

    async function loadQuestions() {
      // 1) Prefer the cache written at launch — no answers are exposed and the
      //    exam starts instantly even on a flaky connection.
      const cached = localStorage.getItem("jamb_questions");
      if (cached) {
        try {
          const parsed: Question[] = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            hydrate(parsed);
            return;
          }
        } catch {/* fall through to network */}
      }

      // 2) Fallback: fetch directly (e.g. cache cleared / opened exam URL cold).
      try {
        const subjectsParam = parsedConfig.subjects.join(",");
        const yearParam = parsedConfig.selectedYear ? `&year=${parsedConfig.selectedYear}` : "";
        const res = await fetch(`/api/questions?subject=${encodeURIComponent(subjectsParam)}${yearParam}`);
        const json = await res.json();
        const data: Question[] = json.data || [];
        localStorage.setItem("jamb_questions", JSON.stringify(data));
        if (json.answerToken) localStorage.setItem("jamb_answer_token", json.answerToken);
        hydrate(data);
      } catch (err) {
        console.error("Failed loading questions:", err);
        setIsLoading(false);
      }
    }

    function hydrate(data: Question[]) {
      setQuestions(data);
      // Restore prior position when resuming; otherwise start at the first item.
      const savedIndex = parseInt(localStorage.getItem("jamb_current_index") || "0", 10);
      const safeIndex = Number.isFinite(savedIndex) && savedIndex >= 0 && savedIndex < data.length ? savedIndex : 0;
      setCurrentIndex(safeIndex);

      const savedVisited = localStorage.getItem("jamb_visited");
      if (savedVisited) {
        try {
          const v = JSON.parse(savedVisited);
          if (Array.isArray(v) && v.length) { setVisitedQuestions(v); setIsLoading(false); return; }
        } catch {/* ignore */}
      }
      if (data.length > 0) setVisitedQuestions([data[safeIndex].id]);
      setIsLoading(false);
    }

    loadQuestions();
  }, [router]);

  const executeSubmission = useCallback((reason?: string) => {
    // If terminated by proctoring, save state before redirecting
    if (reason) {
      console.warn("Exam submitted due to security termination:", reason);
    }
    // Release proctoring camera immediately (WebCamMonitor watches this flag).
    setIsSubmitting(true);
    localStorage.setItem("jamb_final_answers", JSON.stringify(answers));
    localStorage.setItem("jamb_questions", JSON.stringify(questions));

    // Exit fullscreen on successful submission before showing results.
    // Flag the intentional exit first so it isn't logged as a violation.
    beginSubmissionRef.current?.();
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {/* ignore */});
    }

    router.push("/results");
  }, [answers, questions, router]);

  // Hook 1: Consolidated Advanced Proctoring
  const {
    tabSwitchGraceSeconds,
    audioNoiseWarning,
    multiPersonWarning,
    noPersonGraceSeconds,
    infractionLogs,
    infractionCount,
    isFullscreen,
    requestFullscreen,
    beginSubmission,
    triggerMultiPersonAlert
  } = useAdvancedProctoring({ onTerminate: () => executeSubmission("Security termination trigger.") });

  // Expose beginSubmission to executeSubmission via ref.
  beginSubmissionRef.current = beginSubmission;

  // Hook 2: Timer
  const { formattedTime } = useExamTimer(config ? config.durationMinutes * 60 : 7200, () => executeSubmission("Time expired."));

  // Enforce fullscreen for the whole exam: request it once questions are ready.
  useEffect(() => {
    if (!isLoading && config && !isFullscreen) {
      // Attempt automatically; browsers may require a user gesture, in which
      // case the blocking overlay below lets the candidate re-enter manually.
      requestFullscreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, config]);

  // Persist navigation position so a refresh/crash resumes where we left off.
  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem("jamb_current_index", String(currentIndex));
    localStorage.setItem("jamb_visited", JSON.stringify(visitedQuestions));
  }, [currentIndex, visitedQuestions, isLoading]);

  // Option Handler
  const handleSelectOption = useCallback((option: 'A' | 'B' | 'C' | 'D') => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    setAnswers((prev) => {
      const updated = { ...prev, [currentQ.id]: option };
      localStorage.setItem("jamb_answers", JSON.stringify(updated));
      return updated;
    });
  }, [currentIndex, questions]);

  // Navigation Handlers
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIdx = Math.min(prev + 1, questions.length - 1);
      const nextQ = questions[nextIdx];
      if (nextQ) {
        setVisitedQuestions((v) => Array.from(new Set([...v, nextQ.id])));
      }
      return nextIdx;
    });
  }, [questions]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const prevIdx = Math.max(prev - 1, 0);
      const prevQ = questions[prevIdx];
      if (prevQ) {
        setVisitedQuestions((v) => Array.from(new Set([...v, prevQ.id])));
      }
      return prevIdx;
    });
  }, [questions]);

  // Hook 3: Keyboard Controls
  useJambKeybindings({
    onSelectOption: handleSelectOption,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSubmitPrompt: () => setIsModalOpen(true),
    onConfirmSubmit: () => executeSubmission(),
    isModalOpen,
  });

  // Jump to specific subject tab
  const handleJumpToSubject = (subjectName: string) => {
    const idx = questions.findIndex(q => q.subject.toLowerCase() === subjectName.toLowerCase());
    if (idx !== -1) {
      setCurrentIndex(idx);
      setVisitedQuestions((v) => Array.from(new Set([...v, questions[idx].id])));
    }
  };

  if (gate.checking || gate.blocked) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">
          {gate.blocked ? "Redirecting to sign-in…" : "Verifying candidate access…"}
        </p>
      </div>
    );
  }

  if (isLoading || !config) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Syncing Exam Buffer...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  // Extract unique subjects in fetched order
  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject)));

  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans select-none relative">

      {/* Reusable official Header */}
      <TopHeader
        candidateName={config.candidateName}
        registrationNumber={config.registrationNumber}
        formattedTime={formattedTime}
        infractions={infractionCount}
        isFullscreen={isFullscreen}
        onRequestFullscreen={requestFullscreen}
      />

      {/* Proctoring Warning Banners */}
      {tabSwitchGraceSeconds !== null && (
        <div className="bg-[#D9383A] text-white text-center py-2 text-xs font-mono font-bold animate-pulse z-30">
          ⚠️ WARNING: Focus Lost! Tab grace period ending in {tabSwitchGraceSeconds} seconds!
        </div>
      )}

      {audioNoiseWarning && (
        <div className="bg-[#FFC107] text-gray-900 text-center py-1.5 text-xs font-mono font-bold z-30">
          ⚠️ Excessive background noise detected. Please maintain exam room silence.
        </div>
      )}

      {multiPersonWarning && (
        <div className="bg-[#D9383A] text-white text-center py-2 text-xs font-mono font-bold z-30">
          ⚠️ {multiPersonWarning}
        </div>
      )}

      {noPersonGraceSeconds !== null && (
        <div className="bg-[#D9383A] text-white text-center py-2 text-xs font-mono font-bold animate-pulse z-30">
          ⚠️ CANDIDATE LEFT THE EXAM — return to the camera frame within {noPersonGraceSeconds}s or the exam will be submitted automatically.
        </div>
      )}

      {/* Subject Switching Navigation Tabs */}
      {uniqueSubjects.length > 1 && (
        <div className="bg-white border-b border-gray-300 py-2 px-4 shadow-sm z-10 flex space-x-2 overflow-x-auto">
          {uniqueSubjects.map((sub) => {
            const isCurrentSubject = currentQuestion?.subject === sub;
            return (
              <button
                key={sub}
                onClick={() => handleJumpToSubject(sub)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all duration-150 whitespace-nowrap ${
                  isCurrentSubject
                    ? "bg-[#0A369D] text-white shadow-sm"
                    : "bg-gray-150 text-gray-600 border border-gray-305 hover:bg-gray-200"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* Exam Main Workspace */}
      <main className="flex-1 p-3 md:p-4 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-4 relative pb-24">
        {currentQuestion ? (
          <QuestionCanvas
            question={currentQuestion}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion.id]}
            onSelectOption={handleSelectOption}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="flex-1 bg-white p-6 rounded border border-gray-300 text-center font-bold text-gray-500">
            No questions loaded. Please verify your internet connection or try again.
          </div>
        )}

        <QuestionMap
          questions={questions}
          currentIndex={currentIndex}
          answers={answers}
          visitedQuestions={visitedQuestions}
          onSelectQuestion={(idx) => {
            setCurrentIndex(idx);
            setVisitedQuestions((v) => Array.from(new Set([...v, questions[idx]?.id])));
          }}
        />
      </main>

      {/* Fullscreen enforcement gate — blocks the exam until fullscreen is active */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0A369D]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="max-w-md">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-black uppercase tracking-wide mb-2">Fullscreen Required</h2>
            <p className="text-xs font-mono text-blue-100 mb-6 leading-relaxed">
              This practice exam must run in fullscreen. Exiting fullscreen is recorded as a security
              event. Click below to continue your session.
            </p>
            <button
              onClick={requestFullscreen}
              className="px-8 py-3 bg-[#FFC107] text-gray-900 font-extrabold uppercase text-sm rounded shadow-lg hover:bg-yellow-400 transition-colors"
            >
              Enter Fullscreen & Continue
            </button>
          </div>
        </div>
      )}

      {/* Floating live video monitor feed */}
      <WebCamMonitor
        onFaceCountChange={triggerMultiPersonAlert}
        candidatePhotoUrl={config.candidatePhotoUrl}
        active={!isSubmitting}
      />

      {/* Submit verification Overlay */}
      <SubmissionModal
        isOpen={isModalOpen}
        totalQuestions={questions.length}
        answeredCount={Object.keys(answers).length}
        onConfirm={() => executeSubmission()}
        onCancel={() => setIsModalOpen(false)}
      />

      {/* Flat simple footer */}
      <footer className="bg-[#0A369D] text-white py-2 text-center text-[11px] font-mono border-t-2 border-[#FFC107]">
        © {new Date().getFullYear()} Prepify • UTME CBT Practice Terminal
      </footer>

    </div>
  );
}
