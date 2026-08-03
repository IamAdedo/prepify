"use client";

import { ExamMode } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const AVAILABLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Economics", "Government", "Literature in English", "CRK", "Commerce"
];

const AVAILABLE_YEARS = ["Randomized", "2023", "2022", "2021", "2020", "2019"];

export default function EducationalHomepage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Exam Configuration States
  const [mode, setMode] = useState<ExamMode>("JAMB_FULL");
  const [candidateName, setCandidateName] = useState("");
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [singleSubject, setSingleSubject] = useState("Mathematics");
  const [selectedYear, setSelectedYear] = useState("Randomized");
  const [candidateSnapshot, setCandidateSnapshot] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Contact Form State
  const [contactMessage, setContactMessage] = useState({ name: "", email: "", msg: "" });

  // Camera Liveness Check
  const startLivenessCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      alert("Camera access is required for candidate biometric verification.");
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
      setCandidateSnapshot(canvas.toDataURL("image/png"));
    }
  };

  const toggleElective = (sub: string) => {
    if (selectedElectives.includes(sub)) {
      setSelectedElectives(selectedElectives.filter((s) => s !== sub));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives([...selectedElectives, sub]);
    }
  };

  const handleStartExam = () => {
    if (!candidateName.trim()) return alert("Please enter your candidate name.");
    if (!candidateSnapshot) return alert("Please perform the liveness photo capture.");

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
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans select-none">

      {/* 1. Global Navigation Header */}
      <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white text-[#0A369D] font-black rounded-full flex items-center justify-center border-2 border-[#FFC107] text-lg shadow">
              UTME
            </div>
            <div>
              <span className="font-extrabold text-base md:text-lg uppercase tracking-wide block leading-tight">
                JAMB CBT Portal
              </span>
              <span className="text-[10px] text-gray-200 font-mono">Official UTME Web Simulation Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold uppercase tracking-wider">
            <a href="#portal" className="hover:text-[#FFC107] transition-colors">Candidate Portal</a>
            <a href="#about" className="hover:text-[#FFC107] transition-colors">About Us</a>
            <a href="#features" className="hover:text-[#FFC107] transition-colors">Platform Features</a>
            <a href="#contact" className="hover:text-[#FFC107] transition-colors">Contact</a>
          </nav>

          <a
            href="#portal"
            className="px-4 py-2 bg-[#D9383A] hover:bg-red-700 text-white font-bold text-xs uppercase rounded shadow transition-transform hover:scale-105"
          >
            Start Exam Now
          </a>
        </div>
      </header>

      {/* 2. Educational Hero Banner */}
      <section className="bg-[#0A369D] text-white py-12 px-4 border-b border-blue-900">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <span className="inline-block bg-[#FFC107] text-[#0A369D] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow">
            100% Free UTME Exam Readiness
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
            Master the JAMB Examination Environment
          </h1>
          <p className="text-sm md:text-base text-gray-200 max-w-2xl mx-auto font-serif leading-relaxed">
            Practice with full 8-key keyboard navigation, multi-subject combinations, custom year drills, real-time AI web-proctoring, and instant printable result slips.
          </p>
        </div>
      </section>

      {/* 3. Main Examination Portal Configuration Form */}
      <section id="portal" className="py-10 px-4 max-w-4xl mx-auto w-full -mt-6">
        <div className="bg-white border-4 border-[#0A369D] rounded-lg shadow-2xl p-6 md:p-8">

          <div className="text-center border-b-4 border-[#FFC107] pb-4 mb-6">
            <h2 className="text-2xl font-black text-[#0A369D] uppercase tracking-wide">
              Candidate Examination Setup
            </h2>
            <p className="text-xs text-gray-600 font-mono">Configure Mode & Perform Biometric Verification</p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode("JAMB_FULL")}
              className={`p-4 rounded-lg border-2 text-left font-bold transition-all ${mode === "JAMB_FULL"
                  ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
            >
              <div className="text-sm uppercase font-extrabold mb-1">Full UTME Mode</div>
              <div className="text-xs font-normal text-gray-600">4 Subjects (Use of English Mandatory), 120 Minutes timer.</div>
            </button>

            <button
              onClick={() => setMode("PRACTICE_SINGLE")}
              className={`p-4 rounded-lg border-2 text-left font-bold transition-all ${mode === "PRACTICE_SINGLE"
                  ? "border-[#0A369D] bg-[#E9F1F7] text-[#0A369D] shadow-md"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
            >
              <div className="text-sm uppercase font-extrabold mb-1">Single Subject Practice</div>
              <div className="text-xs font-normal text-gray-600">1 Subject focus, specific past questions year or randomized.</div>
            </button>
          </div>

          {/* Candidate Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Full Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. ADEBAYO, OLUMIDE CHUKWUEMEKA"
              className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
            />
          </div>

          {/* Subject Configuration */}
          {mode === "JAMB_FULL" ? (
            <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="text-xs font-bold uppercase text-[#0A369D] mb-2">
                Select 3 Elective Subjects
              </h3>
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-[#0A369D] text-white text-xs font-bold px-3 py-1.5 rounded">
                  ✓ Use of English (Auto-Locked)
                </span>
                <span className="text-xs font-mono text-gray-500">
                  ({selectedElectives.length}/3 Selected)
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
                <label className="block text-xs font-bold uppercase mb-2 text-gray-700">Select Past Question Year</label>
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

          {/* Biometric Liveness Capture */}
          <div className="mb-6 border-2 border-dashed border-gray-300 p-4 rounded text-center bg-gray-50">
            <h3 className="text-xs font-bold uppercase text-gray-700 mb-2">Biometric Verification Snapshot</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isCameraReady ? (
                <button
                  type="button"
                  onClick={startLivenessCheck}
                  className="px-4 py-2 bg-[#0A369D] text-white text-xs font-bold rounded shadow hover:bg-blue-900"
                >
                  Initialize WebCam
                </button>
              ) : (
                <div className="relative w-32 h-32 border-2 border-[#0A369D] rounded overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              )}

              {isCameraReady && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-[#FFC107] text-gray-900 text-xs font-bold rounded shadow hover:bg-yellow-500"
                >
                  Take Snapshot
                </button>
              )}

              {candidateSnapshot && (
                <div className="text-center">
                  <img src={candidateSnapshot} alt="Snapshot" className="w-32 h-32 object-cover border-2 border-green-600 rounded" />
                  <span className="text-[10px] text-green-700 font-bold block mt-1">Snapshot Attached</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full py-4 bg-[#D9383A] hover:bg-red-700 text-white font-extrabold uppercase tracking-wider rounded text-base shadow-lg transition-transform hover:scale-[1.01]"
          >
            Launch Examination Workspace
          </button>
        </div>
      </section>

      {/* 4. About Us Section */}
      <section id="about" className="py-12 bg-white border-y border-gray-200 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold text-[#0A369D] uppercase tracking-widest block mb-2">About The Platform</span>
            <h2 className="text-2xl font-black text-gray-900 uppercase mb-4">
              Engineered for Authentic UTME Exam Simulations
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed font-serif mb-4">
              This CBT platform replicates the exact terminal layout, retro styling, single-key navigation commands, and anti-cheating restrictions of the official Joint Admissions and Matriculation Board testing interface.
            </p>
            <ul className="text-xs space-y-2 font-mono text-gray-700">
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Standardized 8-Key Keyboard Navigation (`A`, `B`, `C`, `D`, `P`, `N`, `S`, `Y`)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Live WebCam & Audio Noise Security Proctoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Authentic 400-Point Scaled Scoring & PDF Result Slips</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#E9F1F7] p-6 rounded-lg border-2 border-[#0A369D]">
            <h3 className="font-bold text-sm text-[#0A369D] uppercase mb-3">Keybindings Reference Guide</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border"><kbd className="font-bold text-[#0A369D]">A, B, C, D</kbd> - Select Option</div>
              <div className="bg-white p-2 rounded border"><kbd className="font-bold text-[#0A369D]">N</kbd> - Next Question</div>
              <div className="bg-white p-2 rounded border"><kbd className="font-bold text-[#0A369D]">P</kbd> - Previous Question</div>
              <div className="bg-white p-2 rounded border"><kbd className="font-bold text-[#D9383A]">S</kbd> - Submit Exam</div>
              <div className="bg-white p-2 rounded border"><kbd className="font-bold text-green-700">Y</kbd> - Confirm Submission</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contact Us Section */}
      <section id="contact" className="py-12 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md">
          <h2 className="text-xl font-black text-[#0A369D] uppercase text-center mb-2">Contact & Feedback</h2>
          <p className="text-xs text-gray-500 text-center font-mono mb-6">Have suggestions or found an issue with a question? Reach out to us.</p>

          <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your feedback has been logged."); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={contactMessage.name}
                onChange={(e) => setContactMessage({ ...contactMessage, name: e.target.value })}
                className="p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={contactMessage.email}
                onChange={(e) => setContactMessage({ ...contactMessage, email: e.target.value })}
                className="p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
              />
            </div>
            <textarea
              rows={4}
              placeholder="Your Message or Inquiry..."
              required
              value={contactMessage.msg}
              onChange={(e) => setContactMessage({ ...contactMessage, msg: e.target.value })}
              className="w-full p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
            ></textarea>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#0A369D] hover:bg-blue-900 text-white font-bold text-xs uppercase rounded shadow"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* 6. Comprehensive Educational Footer */}
      <footer className="bg-[#0A369D] text-white mt-auto border-t-4 border-[#FFC107] text-xs select-none">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-extrabold uppercase text-sm mb-2 text-[#FFC107]">JAMB UTME CBT Portal</h4>
            <p className="text-gray-300 leading-relaxed font-serif text-[11px]">
              An independent, ultra-secure computer-based test simulation engine created to help students master examination workflows and keybindings.
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">Quick Navigation</h4>
            <ul className="space-y-1 font-mono text-[11px] text-gray-300">
              <li><a href="#portal" className="hover:underline">Candidate Verification Portal</a></li>
              <li><a href="#about" className="hover:underline">Keybindings Guide</a></li>
              <li><a href="#contact" className="hover:underline">Support & Inquiries</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">System Status</h4>
            <p className="text-gray-300 text-[11px] font-mono">
              Status: <span className="text-green-400 font-bold">Operational</span><br />
              Question Engine: ALOC API & Offline Buffer<br />
              Vercel Deployment: Free Tier Ready
            </p>
          </div>
        </div>

        <div className="bg-black/30 py-3 text-center border-t border-white/10 font-mono text-[11px]">
          © {new Date().getFullYear()} JAMB CBT Portal by IamAdedo
        </div>
      </footer>

    </div>
  );
}
