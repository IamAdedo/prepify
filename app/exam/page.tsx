"use client";

import { QuestionCanvas } from "@/components/QuestionCanvas";
import { QuestionMap } from "@/components/QuestionMap";
import { SubmissionModal } from "@/components/SubmissionModal";
import { useAdvancedProctoring } from "@/hooks/useAdvancedProctoring";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useJambKeybindings } from "@/hooks/useJambKeybindings";
import { ExamConfig, Question, UserAnswers } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ExamWorkspacePage() {
  const router = useRouter();
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [visitedQuestions, setVisitedQuestions] = useState<number[]>([1]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Exam Session
  useEffect(() => {
    const storedConfig = localStorage.getItem("jamb_config");
    if (!storedConfig) {
      router.push("/");
      return;
    }
    const parsedConfig: ExamConfig = JSON.parse(storedConfig);
    setConfig(parsedConfig);

    const savedAnswers = localStorage.getItem("jamb_answers");
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

    // Fetch Subject Questions
    async function fetchQuestions() {
      try {
        const firstSubject = parsedConfig.subjects[0] || "english";
        const yearParam = parsedConfig.selectedYear ? `&year=${parsedConfig.selectedYear}` : "";
        const res = await fetch(`/api/questions?subject=${encodeURIComponent(firstSubject)}${yearParam}`);
        const json = await res.json();
        setQuestions(json.data);
      } catch (err) {
        console.error("Failed loading questions:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [router]);

  const executeSubmission = useCallback(() => {
    localStorage.setItem("jamb_final_answers", JSON.stringify(answers));
    localStorage.setItem("jamb_questions", JSON.stringify(questions));
    router.push("/results");
  }, [answers, questions, router]);

  // Hook 1: Advanced Proctoring
  const { tabSwitchGraceSeconds, audioNoiseWarning, multiPersonWarning, infractionLogs } =
    useAdvancedProctoring({ onTerminate: executeSubmission });

  // Hook 2: Timer
  const { formattedTime } = useExamTimer(config ? config.durationMinutes * 60 : 7200, executeSubmission);

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
      setVisitedQuestions((v) => Array.from(new Set([...v, questions[nextIdx]?.id])));
      return nextIdx;
    });
  }, [questions]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Hook 3: Keyboard Controls
  useJambKeybindings({
    onSelectOption: handleSelectOption,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSubmitPrompt: () => setIsModalOpen(true),
    onConfirmSubmit: executeSubmission,
    isModalOpen,
  });

  if (isLoading || !config) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Loading Exam Buffer...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans select-none">

      {/* 🔴 ONE-LINE HEADER */}
      <header className="bg-[#0A369D] text-white px-4 py-2 shadow border-b-2 border-[#FFC107] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3 overflow-hidden whitespace-nowrap">
          <span className="font-extrabold uppercase tracking-wide text-[#FFC107]">JAMB CBT Portal</span>
          <span>|</span>
          <span className="font-bold text-gray-200">
            {config.mode === "JAMB_FULL" ? "UTME Full Exam" : `Practice (${config.subjects[0]})`}
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline text-yellow-300 font-bold truncate">
            Candidate: {config.candidateName}
          </span>
        </div>

        <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded border border-white/20">
          <span className="text-[10px] text-gray-300 uppercase">Time:</span>
          <span className="font-bold text-[#FFC107] text-sm tracking-widest">{formattedTime}</span>
        </div>
      </header>

      {/* Proctoring Grace Warnings */}
      {tabSwitchGraceSeconds !== null && (
        <div className="bg-[#D9383A] text-white text-center py-1.5 text-xs font-mono font-bold animate-pulse">
          ⚠️ WARNING: Focus Lost! Tab grace period ending in {tabSwitchGraceSeconds} seconds!
        </div>
      )}

      {audioNoiseWarning && (
        <div className="bg-[#FFC107] text-gray-900 text-center py-1 text-xs font-mono font-bold">
          ⚠️ Excessive background noise detected. Maintain test room silence.
        </div>
      )}

      {multiPersonWarning && (
        <div className="bg-[#D9383A] text-white text-center py-1.5 text-xs font-mono font-bold">
          {multiPersonWarning}
        </div>
      )}

      {/* Exam Main Area */}
      <main className="flex-1 p-3 md:p-4 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-4">
        {currentQuestion && (
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
        )}

        <QuestionMap
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          answers={answers}
          visitedQuestions={visitedQuestions}
          onSelectQuestion={(idx) => {
            setCurrentIndex(idx);
            setVisitedQuestions((v) => Array.from(new Set([...v, questions[idx]?.id])));
          }}
        />
      </main>

      <SubmissionModal
        isOpen={isModalOpen}
        totalQuestions={questions.length}
        answeredCount={Object.keys(answers).length}
        onConfirm={executeSubmission}
        onCancel={() => setIsModalOpen(false)}
      />

      {/* 🔴 ONE-LINE FOOTER */}
      <footer className="bg-[#0A369D] text-white py-2 text-center text-[11px] font-mono border-t-2 border-[#FFC107]">
        © {new Date().getFullYear()}, JAMB CBT Portal by IamAdedo
      </footer>

    </div>
  );
}
