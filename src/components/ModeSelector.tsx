import { ExamMode } from "@/types/jamb";
import React from "react";

interface ModeSelectorProps {
  mode: ExamMode;
  setMode: (mode: ExamMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <button
        type="button"
        onClick={() => setMode("JAMB_FULL")}
        className={`p-4 rounded-lg border-2 text-left font-bold transition-all relative flex flex-col justify-between hover:border-[#0A369D] ${
          mode === "JAMB_FULL"
            ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
        }`}
      >
        <div>
          <div className="text-sm uppercase font-extrabold mb-1 tracking-wide flex items-center">
            {mode === "JAMB_FULL" && <span className="mr-1.5 text-xs">✓</span>}
            Full UTME Exam Mode
          </div>
          <div className="text-xs font-normal text-gray-500 leading-relaxed font-sans">
            Full 4-subject UTME practice exam. Requires Use of English and 3 elective subjects. 120 Minutes total duration.
          </div>
        </div>
        {mode === "JAMB_FULL" && (
          <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-[#0A369D] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
            Active
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setMode("PRACTICE_SINGLE")}
        className={`p-4 rounded-lg border-2 text-left font-bold transition-all relative flex flex-col justify-between hover:border-[#0A369D] ${
          mode === "PRACTICE_SINGLE"
            ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
        }`}
      >
        <div>
          <div className="text-sm uppercase font-extrabold mb-1 tracking-wide flex items-center">
            {mode === "PRACTICE_SINGLE" && <span className="mr-1.5 text-xs">✓</span>}
            Single Subject Practice
          </div>
          <div className="text-xs font-normal text-gray-500 leading-relaxed font-sans">
            Focus on a single chosen subject. Select a specific past examination year or randomized questions. 40 Minutes duration.
          </div>
        </div>
        {mode === "PRACTICE_SINGLE" && (
          <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-[#0A369D] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
            Active
          </span>
        )}
      </button>
    </div>
  );
};
