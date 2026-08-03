"use client";

import { ResultSlipPDF } from "@/components/ResultSlipPDF";
import { ExamConfig, Question, UserAnswers } from "@/types/jamb";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResultsPage() {
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [infractionLogs, setInfractionLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedConfig = localStorage.getItem("jamb_config");
    const storedAnswers = localStorage.getItem("jamb_final_answers");
    const storedQuestions = localStorage.getItem("jamb_questions");
    const storedInfractions = localStorage.getItem("jamb_infraction_logs");

    if (storedConfig) setConfig(JSON.parse(storedConfig));
    if (storedAnswers) setAnswers(JSON.parse(storedAnswers));
    if (storedQuestions) setQuestions(JSON.parse(storedQuestions));
    if (storedInfractions) setInfractionLogs(JSON.parse(storedInfractions));

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Generating Score Sheet...</p>
      </div>
    );
  }

  if (!config || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono text-center p-4">
        <div className="max-w-md bg-white border-2 border-[#D9383A] rounded-lg p-6 shadow-lg">
          <h1 className="text-xl font-bold text-[#D9383A] mb-2 uppercase">No Active Session Found</h1>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            There is no graded session found on this device. Please register and run an exam to generate grading details.
          </p>
          <Link href="/" className="px-5 py-2.5 bg-[#0A369D] text-white text-xs font-bold rounded shadow hover:bg-blue-900">
            Go to Candidate Setup
          </Link>
        </div>
      </div>
    );
  }

  // Analytics
  const totalQuestions = questions.length || 1;
  const answeredCount = Object.keys(answers).length;
  let correctCount = 0;
  
  questions.forEach((q) => {
    if (answers[q.id]?.toLowerCase() === q.answer.toLowerCase()) {
      correctCount += 1;
    }
  });

  const rawPercentage = (correctCount / totalQuestions) * 100;
  const aggregateScore = Math.round((correctCount / totalQuestions) * 400);

  return (
    <div className="min-h-screen bg-[#E9F1F7] p-4 md:p-8 font-sans select-none print:bg-white print:p-0">
      
      {/* 1. Official Result Slip Component */}
      <div className="mb-8 print:mb-0">
        <ResultSlipPDF
          config={config}
          questions={questions}
          answers={answers}
          infractionLogs={infractionLogs}
        />
      </div>

      {/* 2. Detailed Performance & Analytics review (Hidden in print) */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg border-2 border-gray-300 shadow-xl p-6 print:hidden">
        
        {/* Quick Statistics Banner */}
        <div className="bg-[#E9F1F7] border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#0A369D] text-sm uppercase">Verification Diagnostics</h3>
            <p className="text-[10px] text-gray-500 font-mono">Detailed analysis of student performance during active test focus.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center font-mono">
            <div className="bg-white px-3 py-1.5 rounded border border-gray-250">
              <span className="text-[9px] text-gray-500 block">ACCURACY</span>
              <span className="font-bold text-gray-800 text-sm">{rawPercentage.toFixed(1)}%</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded border border-gray-250">
              <span className="text-[9px] text-gray-500 block">INFRACTIONS</span>
              <span className={`font-bold text-sm ${infractionLogs.length > 0 ? "text-[#D9383A]" : "text-green-600"}`}>
                {infractionLogs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Question Review Grid */}
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-base font-black text-[#0A369D] mb-4 uppercase tracking-wide border-b pb-1.5">
            Answer Review & Key Breakdown
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer?.toLowerCase() === q.answer.toLowerCase();
              
              // Map options keys for displaying labels
              const getOptionLabel = (key: 'a' | 'b' | 'c' | 'd') => {
                if (key === 'a') return q.option.a;
                if (key === 'b') return q.option.b;
                if (key === 'c') return q.option.c;
                return q.option.d;
              };

              return (
                <div 
                  key={q.id} 
                  className={`p-4 rounded border-2 transition-shadow hover:shadow ${
                    isCorrect 
                      ? "border-green-300 bg-green-50/50" 
                      : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono uppercase">
                      Q{idx + 1} • {q.subject}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                      isCorrect ? "bg-green-600 text-white" : "bg-[#D9383A] text-white"
                    }`}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-semibold text-gray-900 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.question }} />

                  {/* Options display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className={`p-2 rounded border ${userAnswer === 'A' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">A.</span>{q.option.a}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'B' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">B.</span>{q.option.b}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'C' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">C.</span>{q.option.c}
                    </div>
                    <div className={`p-2 rounded border ${userAnswer === 'D' ? (isCorrect ? 'bg-green-100 border-green-400 font-bold' : 'bg-red-100 border-red-300') : 'bg-white'}`}>
                      <span className="font-bold mr-1.5 text-[#0A369D]">D.</span>{q.option.d}
                    </div>
                  </div>

                  {/* Answers Comparison */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] font-mono bg-white p-2 rounded border border-gray-200 mb-2">
                    <div>
                      <span className="text-gray-500">Your Selection:</span>{" "}
                      <span className={`font-bold uppercase ${isCorrect ? "text-green-605" : "text-[#D9383A]"}`}>
                        {userAnswer ? `${userAnswer} (${getOptionLabel(userAnswer.toLowerCase() as 'a'|'b'|'c'|'d')})` : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Correct Answer:</span>{" "}
                      <span className="font-bold uppercase text-green-700">
                        {q.answer.toUpperCase()} ({getOptionLabel(q.answer.toLowerCase() as 'a'|'b'|'c'|'d')})
                      </span>
                    </div>
                  </div>

                  {/* Explanation Block */}
                  {q.explanation && (
                    <div className="text-[11px] text-gray-700 bg-amber-50/50 p-2.5 rounded border border-amber-200 mt-2 font-sans leading-relaxed">
                      <span className="font-bold text-[#0A369D] block mb-0.5">Explanation / Reference:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            onClick={() => localStorage.clear()}
            className="inline-block px-8 py-3 bg-[#0A369D] hover:bg-blue-900 text-white font-extrabold rounded shadow-md text-xs uppercase tracking-wider transition-transform hover:scale-105 duration-150"
          >
            Clear Session & Return to Candidate Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
