"use client";

import { Question, UserAnswers } from "@/types/jamb";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResultsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswers>({});

  useEffect(() => {
    const storedAnswers = localStorage.getItem("jamb_final_answers");
    const storedQuestions = localStorage.getItem("jamb_questions");

    if (storedAnswers) setAnswers(JSON.parse(storedAnswers));
    if (storedQuestions) setQuestions(JSON.parse(storedQuestions));
  }, []);

  const totalQuestions = questions.length || 1;
  let correctCount = 0;

  questions.forEach((q) => {
    if (answers[q.id]?.toLowerCase() === q.answer.toLowerCase()) {
      correctCount += 1;
    }
  });

  const rawPercentage = (correctCount / totalQuestions) * 100;
  // Scaled directly to standard 400-point UTME aggregate ceiling
  const jambScaledScore = Math.round((correctCount / totalQuestions) * 400);

  return (
    <div className="min-h-screen bg-jamb-blue-light p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg border-4 border-jamb-blue shadow-2xl p-6">

        {/* Banner */}
        <div className="border-b-4 border-jamb-gold pb-4 mb-6 text-center">
          <h1 className="text-2xl font-bold text-jamb-blue uppercase">Joint Admissions and Matriculation Board</h1>
          <p className="text-sm text-gray-600 font-mono">OFFICIAL EXAMINATION RESULT SLIP & REVIEW SHEET</p>
        </div>

        {/* High-level Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-jamb-blue text-white p-4 rounded text-center shadow">
            <span className="text-xs uppercase tracking-wider block text-jamb-blue-light">Aggregate Score</span>
            <span className="text-3xl font-extrabold font-mono text-jamb-gold">{jambScaledScore} / 400</span>
          </div>

          <div className="bg-gray-100 border p-4 rounded text-center">
            <span className="text-xs uppercase tracking-wider block text-gray-500">Accuracy Rate</span>
            <span className="text-2xl font-bold font-mono text-gray-800">{rawPercentage.toFixed(1)}%</span>
          </div>

          <div className="bg-gray-100 border p-4 rounded text-center">
            <span className="text-xs uppercase tracking-wider block text-gray-500">Questions Answered</span>
            <span className="text-2xl font-bold font-mono text-jamb-green">
              {Object.keys(answers).length} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Answer Breakdown Grid */}
        <h2 className="text-lg font-bold text-jamb-blue mb-4 border-b pb-1">Detailed Question Performance</h2>
        <div className="space-y-4 mb-8">
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer?.toLowerCase() === q.answer.toLowerCase();

            return (
              <div key={q.id} className={`p-4 rounded border-2 ${isCorrect ? "border-green-300 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">
                    Q{idx + 1} ({q.subject})
                  </span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isCorrect ? "bg-green-600 text-white" : "bg-jamb-red text-white"}`}>
                    {isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>

                <p className="text-sm font-semibold mb-2" dangerouslySetInnerHTML={{ __html: q.question }} />

                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
                  <div>Your Choice: <span className="font-bold uppercase">{userAnswer || "None"}</span></div>
                  <div>Correct Key: <span className="font-bold uppercase text-jamb-green">{q.answer}</span></div>
                </div>

                {q.explanation && (
                  <p className="text-xs text-gray-600 italic bg-white p-2 rounded border border-gray-200 mt-2">
                    <span className="font-bold">Explanation:</span> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/"
            onClick={() => localStorage.clear()}
            className="inline-block px-8 py-3 bg-jamb-blue hover:bg-blue-900 text-white font-bold rounded shadow transition-transform hover:scale-105"
          >
            Return to Candidate Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
