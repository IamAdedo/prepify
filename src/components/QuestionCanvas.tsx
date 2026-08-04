import { Question } from "@/types/jamb";
import React from "react";

interface CanvasProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onSelectOption: (option: 'A' | 'B' | 'C' | 'D') => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

export const QuestionCanvas: React.FC<CanvasProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectOption,
  onNext,
  onPrevious,
  onSubmit,
}) => {
  const options: Array<{ key: 'A' | 'B' | 'C' | 'D'; label: string }> = [
    { key: 'A', label: question.option.a },
    { key: 'B', label: question.option.b },
    { key: 'C', label: question.option.c },
    { key: 'D', label: question.option.d },
  ];

  return (
    <div className="flex-1 bg-white p-4 md:p-6 rounded border-2 border-gray-300 shadow-inner flex flex-col justify-between select-none">
      <div>
        {/* Subject Header */}
        <div className="flex justify-between items-center border-b-2 border-jamb-blue pb-2 mb-4">
          <span className="bg-jamb-blue text-white text-xs font-bold px-2.5 py-1 uppercase rounded">
            Subject: {question.subject}
          </span>
          <span className="text-sm font-bold text-gray-600 font-mono">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Optional Section/Comprehension Passage */}
        {question.section && (
          <div className="mb-4 p-3 bg-jamb-blue-light border-l-4 border-jamb-blue text-xs md:text-sm max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed font-serif">
            {question.section}
          </div>
        )}

        {/* Question Text */}
        <div
          className="text-base md:text-lg font-semibold text-jamb-dark mb-6 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: question.question }}
        />

        {/* Options List */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSelectOption(opt.key)}
                className={`w-full text-left p-3 md:p-4 rounded border-2 transition-all flex items-center space-x-3 ${isSelected
                  ? "border-jamb-blue bg-jamb-blue-light font-bold text-jamb-blue shadow"
                  : "border-gray-200 hover:border-gray-400 bg-gray-50 text-gray-800"
                  }`}
              >
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono font-bold text-sm ${isSelected ? "bg-jamb-blue text-white border-jamb-blue" : "bg-white border-gray-400 text-gray-600"
                  }`}>
                  {opt.key}
                </span>
                <span className="text-sm md:text-base">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Buttons (N, P, S) */}
      <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white font-bold rounded shadow text-sm flex items-center space-x-1"
        >
          <span>[P]</span> <span>Previous</span>
        </button>

        <button
          onClick={onSubmit}
          className="px-6 py-2.5 bg-jamb-red hover:bg-red-700 text-white font-bold rounded shadow text-sm animate-pulse"
        >
          [S] Submit Exam
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === totalQuestions - 1}
          className="px-5 py-2.5 bg-jamb-blue hover:bg-blue-900 disabled:opacity-40 text-white font-bold rounded shadow text-sm flex items-center space-x-1"
        >
          <span>Next</span> <span>[N]</span>
        </button>
      </div>
    </div>
  );
};
