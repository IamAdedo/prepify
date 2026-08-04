import { Question, UserAnswers } from "@/types/jamb";
import React, { useEffect, useRef } from "react";

interface QuestionMapProps {
  questions: Question[];
  currentIndex: number;
  answers: UserAnswers;
  visitedQuestions: number[];
  onSelectQuestion: (index: number) => void;
}

export const QuestionMap: React.FC<QuestionMapProps> = ({
  questions,
  currentIndex,
  answers,
  visitedQuestions,
  onSelectQuestion,
}) => {
  // Keep the active question tile visible: scroll it into view within the grid
  // as the candidate progresses (or jumps around).
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIndex]);

  return (
    <aside className="w-full lg:w-64 bg-white p-4 rounded border-2 border-gray-300 shadow-inner select-none flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b pb-2 mb-3">
        Question Navigation Grid
      </h2>

      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2 max-h-64 lg:max-h-96 overflow-y-auto p-1">
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = !!answers[q.id];
          const isVisited = visitedQuestions.includes(q.id);

          let btnStyle = "bg-gray-100 text-gray-600 border-gray-300"; // Default / Unvisited
          if (isAnswered) btnStyle = "bg-jamb-green text-white border-green-700 font-bold";
          else if (isVisited) btnStyle = "bg-gray-300 text-gray-850 border-gray-450";

          if (isCurrent) {
            btnStyle = "bg-[#0A369D] text-white border-jamb-gold ring-2 ring-jamb-gold font-bold scale-105";
          }

          return (
            <button
              key={q.id}
              ref={isCurrent ? activeBtnRef : null}
              onClick={() => onSelectQuestion(idx)}
              className={`h-9 w-full rounded border text-xs font-mono transition-transform flex items-center justify-center ${btnStyle}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend Block */}
      <div className="mt-4 pt-3 border-t text-[11px] space-y-1.5 text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-[#0A369D] rounded-full border"></span>
          <span>Current Question</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-jamb-green rounded-full border"></span>
          <span>Answered</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-gray-300 rounded-full border"></span>
          <span>Unanswered / Visited</span>
        </div>
      </div>
    </aside>
  );
};
