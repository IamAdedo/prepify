import React from "react";

interface SubmissionModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-lg border-4 border-jamb-blue max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <h2 className="text-xl font-bold text-jamb-blue border-b pb-2 mb-4 uppercase tracking-wide">
          Submit Examination Confirmation
        </h2>

        <p className="text-sm text-gray-700 mb-4">
          Are you sure you want to end your test session now?
        </p>

        <div className="bg-jamb-blue-light p-3 rounded border border-blue-200 mb-6 space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span>Total Questions:</span>
            <span className="font-bold">{totalQuestions}</span>
          </div>
          <div className="flex justify-between text-jamb-green">
            <span>Answered:</span>
            <span className="font-bold">{answeredCount}</span>
          </div>
          <div className="flex justify-between text-jamb-red">
            <span>Unanswered:</span>
            <span className="font-bold">{unansweredCount}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-6 text-center italic">
          Press <kbd className="px-1.5 py-0.5 bg-gray-200 border rounded font-bold">Y</kbd> on your keyboard to confirm or click below.
        </p>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded text-sm"
          >
            Return to Exam
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-jamb-red hover:bg-red-700 text-white font-bold rounded text-sm shadow"
          >
            Confirm Submit [Y]
          </button>
        </div>
      </div>
    </div>
  );
};
