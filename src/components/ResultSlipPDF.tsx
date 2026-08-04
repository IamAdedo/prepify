import { ExamConfig, GradeResult } from "@/types/jamb";
import { summarizeSecurityEvents } from "@/lib/securityEvents";
import React from "react";

interface ResultSlipProps {
  config: ExamConfig;
  // Authoritative scores from /api/grade — the client never sees the answer key.
  grade: GradeResult;
  infractionLogs: string[];
  // Forwarded ref target so the parent can render this to PDF.
  slipRef?: React.RefObject<HTMLDivElement>;
  onExportPdf?: () => void;
  isExporting?: boolean;
}

export const ResultSlipPDF: React.FC<ResultSlipProps> = ({
  config,
  grade,
  infractionLogs,
  slipRef,
  onExportPdf,
  isExporting,
}) => {
  // Scores come straight from the server-authoritative grade result.
  const subjectScores = grade.subjectScores;
  const aggregateScore = grade.aggregateScore;
  // Each subject is scaled to 100 marks, so the ceiling is 100 × subject count:
  // 400 for a full UTME (4 subjects), 100 for a single-subject drill.
  const maxAggregate = Math.max(100, subjectScores.length * 100);

  // Encode candidate verification payload into standard QR service URL
  const qrVerificationUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `PREPIFY-PRACTICE|REG:${config.registrationNumber}|SCORE:${aggregateScore}/${maxAggregate}|NAME:${config.candidateName}`
  )}`;

  const eventSummary = summarizeSecurityEvents(infractionLogs);

  const handlePrint = () => {
    if (onExportPdf) onExportPdf();
    else window.print();
  };

  return (
    <>
    <div
      ref={slipRef}
      className="max-w-4xl mx-auto bg-white p-8 rounded border-4 border-[#0A369D] shadow-2xl print:shadow-none print:border-none font-sans select-none"
    >

      {/* Official Header */}
      <div className="flex items-center justify-between border-b-4 border-[#FFC107] pb-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-[#0A369D] rounded-full flex items-center justify-center border-2 border-[#FFC107] overflow-hidden">
            <img
              src="/logo.png"
              alt="Prepify"
              className="w-full h-full object-contain p-1.5"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.onerror = null;
                t.src = "/prepify-logo.svg";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0A369D] uppercase tracking-wide">
              Prepify
            </h1>
            <p className="text-xs font-mono text-gray-600">UTME CBT PRACTICE RESULT SLIP</p>
            <p className="text-[10px] text-gray-400">jamb.prepify.vercel.app</p>
          </div>
        </div>

        {/* Verification QR */}
        <div className="text-center">
          <img src={qrVerificationUrl} alt="Verification QR" className="w-20 h-20 border p-1 rounded" />
          <span className="text-[9px] font-mono text-gray-500 block mt-1">Practice Scan QR</span>
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
          <span className="text-xs text-yellow-300">
            {config.mode === "JAMB_FULL"
              ? "Scaled to standard 400-point ceiling"
              : "Single-subject drill • scaled to 100"}
          </span>
        </div>
        <div className="text-4xl font-black font-mono text-[#FFC107]">
          {aggregateScore} <span className="text-xl text-white">/ {maxAggregate}</span>
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
          {subjectScores.map((data) => (
            <tr key={data.subject} className="border-b hover:bg-gray-50">
              <td className="border p-2 font-bold">{data.subject}</td>
              <td className="border p-2 text-center text-green-700 font-bold">{data.correct}</td>
              <td className="border p-2 text-center">{data.total}</td>
              <td className="border p-2 text-right font-bold text-[#0A369D]">{data.scaledScore}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Proctoring Log Summary — one line per event type with occurrence count */}
      {eventSummary.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 p-3 rounded">
          <h4 className="text-[11px] font-bold text-[#D9383A] uppercase mb-2">Proctoring Security Event Log</h4>
          <table className="w-full text-[10px] font-mono">
            <tbody>
              {eventSummary.map((ev) => (
                <tr key={ev.label} className="border-b border-red-100 last:border-0">
                  <td className="py-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${
                        ev.severity === "CRITICAL"
                          ? "bg-[#D9383A]"
                          : ev.severity === "WARNING"
                          ? "bg-[#FFC107]"
                          : "bg-gray-400"
                      }`}
                    />
                    {ev.label}
                  </td>
                  <td className="py-1 text-right font-bold text-gray-800 whitespace-nowrap">
                    {ev.count} {ev.count === 1 ? "time" : "times"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slip content ends here — everything above is captured into the PDF. */}
      </div>

      {/* Print / Export Action Bar — OUTSIDE slipRef so it never appears in the
          exported/emailed PDF (html2canvas ignores `print:hidden`). */}
      <div className="max-w-4xl mx-auto flex justify-end space-x-3 mt-4 print:hidden">
        <button
          onClick={handlePrint}
          disabled={isExporting}
          className="px-6 py-3 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow"
        >
          {isExporting ? "Preparing PDFs…" : "⬇ Export / Print PDF Result Slip"}
        </button>
      </div>
    </>
  );
};
