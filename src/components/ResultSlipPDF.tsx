import { ExamConfig, Question, UserAnswers } from "@/types/jamb";
import React from "react";

interface ResultSlipProps {
  config: ExamConfig;
  questions: Question[];
  answers: UserAnswers;
  infractionLogs: string[];
}

export const ResultSlipPDF: React.FC<ResultSlipProps> = ({
  config,
  questions,
  answers,
  infractionLogs,
}) => {
  // Aggregate subject score calculation
  const subjectScores: Record<string, { correct: number; total: number }> = {};

  questions.forEach((q) => {
    const sub = q.subject || "General";
    if (!subjectScores[sub]) subjectScores[sub] = { correct: 0, total: 0 };
    subjectScores[sub].total += 1;

    if (answers[q.id]?.toLowerCase() === q.answer.toLowerCase()) {
      subjectScores[sub].correct += 1;
    }
  });

  const totalQuestions = questions.length || 1;
  const totalCorrect = Object.values(subjectScores).reduce((acc, curr) => acc + curr.correct, 0);
  const aggregateScore = Math.round((totalCorrect / totalQuestions) * 400);

  // Encode candidate verification payload into standard QR service URL
  const qrVerificationUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `JAMB-VERIFIED|REG:${config.registrationNumber}|SCORE:${aggregateScore}/400|NAME:${config.candidateName}`
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded border-4 border-[#0A369D] shadow-2xl print:shadow-none print:border-none font-sans select-none">

      {/* Official Header */}
      <div className="flex items-center justify-between border-b-4 border-[#FFC107] pb-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-[#0A369D] text-white font-extrabold rounded-full flex items-center justify-center text-xl border-2 border-[#FFC107]">
            UTME
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0A369D] uppercase tracking-wide">
              Joint Admissions and Matriculation Board
            </h1>
            <p className="text-xs font-mono text-gray-600">OFFICIAL UTME CBT EXAMINATION RESULT SLIP</p>
            <p className="text-[10px] text-gray-400">Issued by Platform Simulator Terminal • Site: jamb-cbt-sim.vercel.app</p>
          </div>
        </div>

        {/* Verification QR */}
        <div className="text-center">
          <img src={qrVerificationUrl} alt="Verification QR" className="w-20 h-20 border p-1 rounded" />
          <span className="text-[9px] font-mono text-gray-500 block mt-1">Official Scan QR</span>
        </div>
      </div>

      {/* Candidate Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#E9F1F7] p-4 rounded-lg border border-blue-200 mb-6">
        <div className="flex justify-center md:justify-start">
          {config.candidatePhotoUrl ? (
            <img
              src={config.candidatePhotoUrl}
              alt="Candidate Biometric Photo"
              className="w-28 h-28 object-cover border-2 border-[#0A369D] rounded shadow"
            />
          ) : (
            <div className="w-28 h-28 bg-gray-300 border-2 border-gray-400 flex items-center justify-center text-xs text-gray-600">
              No Snapshot
            </div>
          )}
        </div>

        <div className="md:col-span-3 grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <span className="text-gray-500 block">Candidate Name:</span>
            <span className="font-bold text-gray-900 text-sm">{config.candidateName}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Registration Number:</span>
            <span className="font-bold text-[#0A369D] text-sm">{config.registrationNumber}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Exam Mode:</span>
            <span className="font-bold text-gray-800">{config.mode === "JAMB_FULL" ? "Full UTME 4-Subject" : "Single Subject Drill"}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Examination Year:</span>
            <span className="font-bold text-gray-800">{config.selectedYear || "2026/Aggregated"}</span>
          </div>
        </div>
      </div>

      {/* Aggregate Score Highlight */}
      <div className="bg-[#0A369D] text-white p-4 rounded-lg flex items-center justify-between mb-6 shadow">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#E9F1F7] block">Aggregate UTME Score</span>
          <span className="text-xs text-yellow-300">Scaled to standard 400-point ceiling</span>
        </div>
        <div className="text-4xl font-black font-mono text-[#FFC107]">
          {aggregateScore} <span className="text-xl text-white">/ 400</span>
        </div>
      </div>

      {/* Subject Scores Table */}
      <h3 className="text-xs font-bold uppercase text-[#0A369D] mb-3">Subject Score Performance</h3>
      <table className="w-full border-collapse border border-gray-300 text-xs font-mono mb-6">
        <thead>
          <tr className="bg-[#0A369D] text-white">
            <th className="border p-2 text-left">Subject</th>
            <th className="border p-2 text-center">Correct Answers</th>
            <th className="border p-2 text-center">Total Questions</th>
            <th className="border p-2 text-right">Scaled Score (100)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(subjectScores).map(([sub, data]) => {
            const scaled = Math.round((data.correct / (data.total || 1)) * 100);
            return (
              <tr key={sub} className="border-b hover:bg-gray-50">
                <td className="border p-2 font-bold">{sub}</td>
                <td className="border p-2 text-center text-green-700 font-bold">{data.correct}</td>
                <td className="border p-2 text-center">{data.total}</td>
                <td className="border p-2 text-right font-bold text-[#0A369D]">{scaled}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Proctoring Log Summary */}
      {infractionLogs.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 p-3 rounded">
          <h4 className="text-[11px] font-bold text-[#D9383A] uppercase mb-1">Proctoring Security Event Log</h4>
          <ul className="text-[10px] font-mono text-gray-700 list-disc pl-4 space-y-1">
            {infractionLogs.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Print / Export Action Bar */}
      <div className="flex justify-end space-x-3 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-[#0A369D] hover:bg-blue-900 text-white text-xs font-extrabold uppercase rounded shadow"
        >
          🖨️ Export / Print PDF Result Slip
        </button>
      </div>
    </div>
  );
};
