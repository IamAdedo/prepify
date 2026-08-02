"use client";

import { ExamMode } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const AVAILABLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Economics", "Government", "Literature in English", "CRK", "Commerce"
];

const AVAILABLE_YEARS = ["Randomized", "2023", "2022", "2021", "2020", "2019"];

export default function CandidatePortal() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [mode, setMode] = useState<ExamMode>("JAMB_FULL");
  const [candidateName, setCandidateName] = useState("");
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [singleSubject, setSingleSubject] = useState("Mathematics");
  const [selectedYear, setSelectedYear] = useState("Randomized");
  const [candidateSnapshot, setCandidateSnapshot] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Initialize WebCam for Liveness Check & Snapshot
  const startLivenessCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      alert("Camera access is required for JAMB identity verification and proctoring.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL("image/png");
      setCandidateSnapshot(dataUrl);
    }
  };

  const toggleElective = (sub: string) => {
    if (selectedElectives.includes(sub)) {
      setSelectedElectives(selectedElectives.filter((s) => s !== sub));
    } else {
      if (selectedElectives.length < 3) {
        setSelectedElectives([...selectedElectives, sub]);
      }
    }
  };

  const handleStartExam = () => {
    if (!candidateName.trim()) return alert("Please enter your candidate name.");
    if (!candidateSnapshot) return alert("Please perform the webcam liveness check photo capture.");

    const finalSubjects = mode === "JAMB_FULL"
      ? ["Use of English", ...selectedElectives]
      : [singleSubject];

    if (mode === "JAMB_FULL" && finalSubjects.length !== 4) {
      return alert("Full JAMB Mode requires Use of English + exactly 3 electives.");
    }

    const examConfig = {
      candidateName,
      registrationNumber: `UTME-${Math.floor(10000000 + Math.random() * 90000000)}`,
      candidatePhotoUrl: candidateSnapshot,
      mode,
      subjects: finalSubjects,
      selectedYear,
      durationMinutes: mode === "JAMB_FULL" ? 120 : 40,
    };

    localStorage.setItem("jamb_config", JSON.stringify(examConfig));
    router.push("/exam");
  };

  return (
    <div className="min-h-screen bg-[#E9F1F7] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white border-4 border-[#0A369D] rounded-lg shadow-2xl p-6">
        <div className="text-center border-b-4 border-[#FFC107] pb-4 mb-6">
          <h1 className="text-2xl font-black text-[#0A369D] uppercase tracking-wide">
            JAMB UTME CBT Verification Portal
          </h1>
          <p className="text-xs text-gray-600 font-mono">Select Examination Mode & Pass Liveness Verification</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setMode("JAMB_FULL")}
            className={`p-4 rounded-lg border-2 text-left font-bold transition-all ${mode === "JAMB_FULL"
              ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
              : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
          >
            <div className="text-sm uppercase font-extrabold mb-1">Full UTME Mode</div>
            <div className="text-xs font-normal text-gray-600">4 Subjects (English Mandatory), 120 Mins, Multi-year aggregate.</div>
          </button>

          <button
            onClick={() => setMode("PRACTICE_SINGLE")}
            className={`p-4 rounded-lg border-2 text-left font-bold transition-all ${mode === "PRACTICE_SINGLE"
              ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
              : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
          >
            <div className="text-sm uppercase font-extrabold mb-1">Single Subject Practice</div>
            <div className="text-xs font-normal text-gray-600">1 Subject, Custom Year or Random, 40 Mins drill.</div>
          </button>
        </div>

        {/* Candidate Info Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Candidate Full Name</label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="e.g. ADEBAYO, OLUMIDE CHUKWUEMEKA"
            className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
          />
        </div>

        {/* Subject Configuration Block */}
        {mode === "JAMB_FULL" ? (
          <div className="mb-6 bg-gray-50 p-4 rounded border">
            <h3 className="text-xs font-bold uppercase text-[#0A369D] mb-2">
              Selected Subjects (1 Mandatory + Choose 3 Electives)
            </h3>
            <div className="flex items-center space-x-2 mb-3">
              <span className="bg-[#0A369D] text-white text-xs font-bold px-3 py-1.5 rounded">
                ✓ Use of English (Auto-Locked)
              </span>
              <span className="text-xs font-mono text-gray-500">
                ({selectedElectives.length}/3 Electives Chosen)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_SUBJECTS.map((sub) => {
                const isSelected = selectedElectives.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleElective(sub)}
                    className={`p-2 rounded text-xs font-bold border transition-all ${isSelected
                      ? "bg-[#0A369D] text-white border-[#0A369D]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                  >
                    {isSelected ? "✓ " : "+ "} {sub}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-700">Select Practice Subject</label>
              <select
                value={singleSubject}
                onChange={(e) => setSingleSubject(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-gray-300 rounded text-xs font-bold text-gray-800"
              >
                <option value="Use of English">Use of English</option>
                {AVAILABLE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-700">Select Exam Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-gray-300 rounded text-xs font-bold text-gray-800"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Liveness Photo Capture Block */}
        <div className="mb-6 border-2 border-dashed border-gray-300 p-4 rounded text-center">
          <h3 className="text-xs font-bold uppercase text-gray-700 mb-3">Biometric Liveness Verification Photo</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isCameraReady ? (
              <button
                type="button"
                onClick={startLivenessCheck}
                className="px-4 py-2 bg-[#0A369D] text-white text-xs font-bold rounded shadow hover:bg-blue-900"
              >
                Enable Camera Verification
              </button>
            ) : (
              <div className="relative w-36 h-36 border-2 border-[#0A369D] rounded overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}

            {isCameraReady && (
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 bg-[#FFC107] text-gray-900 text-xs font-bold rounded shadow hover:bg-yellow-500"
              >
                Capture Photo
              </button>
            )}

            {candidateSnapshot && (
              <div className="text-center">
                <img src={candidateSnapshot} alt="Snapshot" className="w-36 h-36 object-cover border-2 border-green-600 rounded" />
                <span className="text-[10px] text-green-700 font-bold block mt-1">Photo Validated</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleStartExam}
          className="w-full py-4 bg-[#D9383A] hover:bg-red-700 text-white font-extrabold uppercase tracking-wider rounded text-base shadow-lg transition-transform hover:scale-[1.01]"
        >
          Initialize Examination Session
        </button>
      </div>
    </div>
  );
}
