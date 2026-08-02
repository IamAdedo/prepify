"use client";

import { QuestionCanvas } from "@/components/QuestionCanvas";
import { QuestionMap } from "@/components/QuestionMap";
import { SubmissionModal } from "@/components/SubmissionModal";
import { TopHeader } from "@/components/TopHeader";
import { useAntiCheating } from "@/hooks/useAntiCheating";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useJambKeybindings } from "@/hooks/useJambKeybindings";
import { Question, UserAnswers } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [visitedQuestions, setVisitedQuestions] = useState<number[]>([1]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Snapshot from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem("jamb_answers");
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

    // Fetch initial exam batch
    async function loadQuestions() {
      try {
        const res = await fetch("/api/questions?subject=english");
        const json = await res.json();
        setQuestions(json.data);
      } catch (e) {
        console.error("Failed loading questions from internal API proxy:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const executeSubmission = useCallback(() => {
    localStorage.setItem("jamb_final_answers", JSON.stringify(answers));
    localStorage.setItem("jamb_questions", JSON.stringify(questions));
    router.push("/results");
  }, [answers, questions, router]);

  // Hook 1: Anti-Cheating Sandbox
  const { infractions, isFullscreen, requestFullscreen } = useAntiCheating(executeSubmission);

  // Hook 2: Countdown Timer (2 Hours = 7200 seconds)
  const { formattedTime } = useExamTimer(7200, executeSubmission);

  // Option Selection Handler
  const handleSelectOption = useCallback((option: 'A' | 'B' | 'C' | 'D') => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];

    setAnswers((prev) => {
      const updated = { ...prev, [currentQ.id]: option };
      localStorage.setItem("jamb_answers", JSON.stringify(updated));
      return updated;
    });
  }, [currentIndex, questions]);

  // Navigation Logic
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

  // Hook 3: Keyboard Navigation Controller
  useJambKeybindings({
    onSelectOption: handleSelectOption,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSubmitPrompt: () => setIsModalOpen(true),
    onConfirmSubmit: executeSubmission,
    isModalOpen,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-jamb-blue-light flex flex-col items-center justify-center font-mono">
        <div className="w-12 h-12 border-4 border-jamb-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-jamb-blue font-bold text-sm">LOADING UTME EXAMINATION DATA...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-jamb-blue-light flex flex-col font-sans">
      <TopHeader
        candidateName="OKONKWO, EMMANUEL"
        registrationNumber="202610492812GA"
        formattedTime={formattedTime}
        infractions={infractions}
        isFullscreen={isFullscreen}
        onRequestFullscreen={requestFullscreen}
      />

      <main className="flex-1 p-3 md:p-6 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-4">
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
    </div>
  );
}
