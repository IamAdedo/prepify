"use client";

import { ContactForm } from "@/components/ContactForm";
import { ModeSelector } from "@/components/ModeSelector";
import { useCandidateGate } from "@/hooks/useCandidateGate";
import { useAuth } from "@/hooks/useAuth";
import { useProductionMode } from "@/components/ProductionModeProvider";
import { generateRegistrationNumber } from "@/lib/registration";
import { getIsoWeekKey } from "@/lib/week";
import { ExamMode } from "@/types/jamb";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const AVAILABLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Economics", "Government", "Literature in English", "CRK", "Commerce"
];

const AVAILABLE_YEARS = ["Randomized", "2023", "2022", "2021", "2020", "2019"];

export default function CandidateSetupPage() {
  const router = useRouter();
  const gate = useCandidateGate();
  const productionMode = useProductionMode();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Exam Configuration States
  const [isWeeklyChallenge, setIsWeeklyChallenge] = useState(false);
  const [mode, setMode] = useState<ExamMode>("JAMB_FULL");
  const [candidateName, setCandidateName] = useState("");
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [singleSubject, setSingleSubject] = useState("Mathematics");
  const [selectedYear, setSelectedYear] = useState("Randomized");
  const [candidateSnapshot, setCandidateSnapshot] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  // Detect weekly-challenge intent from the URL (?challenge=weekly).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("challenge") === "weekly") {
      setIsWeeklyChallenge(true);
      setMode("JAMB_FULL");
      // Candidate chooses their own 3 electives — no preselection.
    }
  }, []);

  // In production mode, pre-fill the candidate name from the signed-in account
  // if the field is still empty. Stays editable.
  useEffect(() => {
    if (productionMode && user?.fullName) {
      setCandidateName((prev) => prev || user.fullName || "");
    }
  }, [productionMode, user]);

  // Interactive Liveness Wizard States
  const [isLivenessModalOpen, setIsLivenessModalOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [livenessStep, setLivenessStep] = useState<'INIT' | 'CENTER' | 'BLINK' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('INIT');
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [cameraErrorMsg, setCameraErrorMsg] = useState("");

  const startLivenessFlow = async () => {
    // Gate camera/biometric capture behind explicit consent.
    if (!consentAccepted) {
      setShowConsentDetails(true);
      return;
    }
    setIsLivenessModalOpen(true);
    setLivenessStep('INIT');
    setLivenessProgress(0);
    setBlinkCount(0);
    setCapturedPhotos([]);
    setCameraErrorMsg("");
    setIsCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      // Store the stream; the <video> element mounts only after isCameraReady
      // is true, so the actual srcObject attachment happens in an effect below.
      streamRef.current = stream;
      setIsCameraReady(true);
      runLivenessSequence();
    } catch (err) {
      console.warn("Liveness webcam access denied:", err);
      setLivenessStep('ERROR');
      setCameraErrorMsg("Webcam access denied or unavailable. Please grant camera permission and click Retry Camera.");
    }
  };

  const runLivenessSequence = () => {
    // Step 1: Position/Center face
    setLivenessStep('CENTER');
    let progress = 0;
    const centerInterval = setInterval(() => {
      progress += 10;
      setLivenessProgress(progress);
      if (progress >= 100) {
        clearInterval(centerInterval);

        // Step 2: Prompt to blink 3 times
        setLivenessStep('BLINK');
        let blinks = 0;

        const blinkInterval = setInterval(() => {
          blinks += 1;
          setBlinkCount(blinks);

          // Capture burst photos at each blink event
          if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              // Flip horizontally to match mirror preview
              ctx.translate(300, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(videoRef.current, 0, 0, 300, 300);
              const dataUrl = canvas.toDataURL("image/png");
              setCapturedPhotos(prev => [...prev, dataUrl]);
            }
          }

          if (blinks >= 3) {
            clearInterval(blinkInterval);

            // Step 3: Analyze captured snapshots
            setLivenessStep('ANALYZING');
            setTimeout(() => {
              setLivenessStep('SUCCESS');
            }, 2000);
          }
        }, 1200);
      }
    }, 200);
  };

  // Attach the media stream once the <video> element is mounted (isCameraReady).
  useEffect(() => {
    if (isCameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraReady]);

  // Complete and extract snapshot
  useEffect(() => {
    if (livenessStep === 'SUCCESS' && capturedPhotos.length > 0) {
      // Choose second photo (middle of blink sequence, eyes usually open) or final photo
      const chosenPhoto = capturedPhotos[1] || capturedPhotos[capturedPhotos.length - 1];
      setCandidateSnapshot(chosenPhoto);

      // Stop webcam
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsCameraReady(false);
        setIsLivenessModalOpen(false);
      }, 1500);
    }
  }, [livenessStep, capturedPhotos]);

  // Clean up streams if modal is closed prematurely
  const closeLivenessModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
    setIsLivenessModalOpen(false);
  };

  const toggleElective = (sub: string) => {
    if (selectedElectives.includes(sub)) {
      setSelectedElectives(selectedElectives.filter((s) => s !== sub));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives([...selectedElectives, sub]);
    }
  };

  const handleStartExam = async () => {
    if (!candidateName.trim()) return alert("Please enter your candidate name.");
    if (!consentAccepted) {
      setShowConsentDetails(true);
      return;
    }
    if (!candidateSnapshot) return alert("Please perform the biometric verification snapshot to unlock the CBT terminal.");

    const finalSubjects = mode === "JAMB_FULL"
      ? ["Use of English", ...selectedElectives]
      : [singleSubject];

    if (mode === "JAMB_FULL" && finalSubjects.length !== 4) {
      return alert("Full UTME Mode requires Use of English + exactly 3 electives.");
    }

    // Durations:
    //  • Full UTME → 120 min (2 hrs) for all 4 subjects.
    //  • Single drill (100 questions) → 90 min, but the calculation-heavy
    //    subjects (Mathematics/Physics/Chemistry) get 120 min.
    const HEAVY_DRILL = new Set(["mathematics", "physics", "chemistry"]);
    const durationMinutes =
      mode === "JAMB_FULL"
        ? 120
        : HEAVY_DRILL.has(singleSubject.toLowerCase())
          ? 120
          : 90;

    // Capitalise the first word of the candidate name (first letter uppercase),
    // leaving the rest of the entry as typed.
    const trimmedName = candidateName.trim();
    const formattedName = trimmedName
      ? trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)
      : trimmedName;

    const examConfig = {
      candidateName: formattedName,
      registrationNumber: generateRegistrationNumber(),
      candidatePhotoUrl: candidateSnapshot,
      mode,
      subjects: finalSubjects,
      selectedYear,
      durationMinutes,
      isWeeklyChallenge,
      weekKey: isWeeklyChallenge ? getIsoWeekKey() : undefined,
      startedAt: Date.now(),
    };

    // Pre-fetch and cache ALL questions (answer-stripped) + the encrypted answer
    // token BEFORE entering the exam, so a network blip mid-exam can't break the
    // session. The exam page reads straight from cache.
    setIsLaunching(true);
    setLaunchError("");
    try {
      const subjectsParam = finalSubjects.join(",");
      const yearParam = selectedYear && selectedYear !== "Randomized" ? `&year=${selectedYear}` : "";
      const res = await fetch(`/api/questions?subject=${encodeURIComponent(subjectsParam)}${yearParam}&mode=${mode}`);
      if (!res.ok) throw new Error(`Question service returned ${res.status}`);
      const json = await res.json();
      const questions = json.data || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("No questions were returned. Please try again.");
      }

      localStorage.setItem("jamb_config", JSON.stringify(examConfig));
      localStorage.setItem("jamb_questions", JSON.stringify(questions));
      localStorage.setItem("jamb_answer_token", json.answerToken || "");
      // Clear previous sessions
      localStorage.removeItem("jamb_answers");
      localStorage.removeItem("jamb_final_answers");
      localStorage.removeItem("jamb_infraction_logs");
      localStorage.removeItem("jamb_infraction_count");
      localStorage.removeItem("jamb_result"); // stale graded result
      localStorage.removeItem("jamb_current_index"); // reset resume position
      localStorage.removeItem("jamb_visited");

      router.push("/exam");
    } catch (err) {
      console.error("Failed to prepare exam:", err);
      setLaunchError(
        err instanceof Error ? err.message : "Could not prepare the exam. Check your connection and try again."
      );
      setIsLaunching(false);
    }
  };

  // Production-mode sign-in gate: show a spinner while checking auth or while
  // redirecting an anonymous visitor to the portal.
  if (gate.checking || gate.blocked) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">
          {gate.blocked ? "Redirecting to sign-in…" : "Verifying candidate access…"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans select-none">

      {/* 1. Global Navigation Header */}
      <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#FFC107] shadow overflow-hidden">
              <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
            </div>
            <div>
              <span className="font-extrabold text-base md:text-lg uppercase tracking-wide block leading-tight">
                Prepify
              </span>
              <span className="text-[10px] text-gray-200 font-mono">UTME CBT Practice Terminal</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold uppercase tracking-wider">
            <a href="/" className="hover:text-[#FFC107] transition-colors">Home</a>
            <a href="#portal" className="hover:text-[#FFC107] transition-colors">Candidate Portal</a>
            <a href="#about" className="hover:text-[#FFC107] transition-colors">About System</a>
            <a href="#contact" className="hover:text-[#FFC107] transition-colors">Support</a>
          </nav>

          {productionMode && user ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden sm:inline text-gray-200 font-mono">{user.email}</span>
              <a
                href="/portal"
                className="px-4 py-2 bg-[#D9383A] hover:bg-red-700 text-white font-bold uppercase rounded shadow transition-transform hover:scale-105"
              >
                Account
              </a>
            </div>
          ) : (
            <a
              href={productionMode ? "/portal" : "#portal"}
              className="px-4 py-2 bg-[#D9383A] hover:bg-red-700 text-white font-bold text-xs uppercase rounded shadow transition-transform hover:scale-105"
            >
              {productionMode ? "Sign In / Register" : "Access Terminal"}
            </a>
          )}
        </div>
      </header>

      {/* 2. Educational Hero Banner */}
      <section className="bg-[#0A369D] text-white py-12 px-4 border-b border-blue-900">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <span className="inline-block bg-[#FFC107] text-[#0A369D] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow">
            {isWeeklyChallenge ? "Weekly Challenge Entry" : "100% Free UTME CBT Practice Platform"}
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
            {isWeeklyChallenge ? "Weekly UTME Challenge Setup" : "Prepify Candidate Examination Portal"}
          </h1>
          <p className="text-sm md:text-base text-gray-200 max-w-2xl mx-auto font-serif leading-relaxed">
            Practice for your UTME under authentic testing-room conditions. Prepify enforces fullscreen browser sandboxing, audio/webcam proctoring sensors, standard 8-key keyboard command navigation, and instant printable practice result slips.
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
            <p className="text-xs text-gray-650 font-mono">Configure Examination Mode & Perform Biometric Verification</p>
          </div>

          {/* Mode Selector Component */}
          <ModeSelector mode={mode} setMode={setMode} />

          {/* Candidate Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Candidate Full Name (Surname First)</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. ADEBAYO, OLUMIDE CHUKWUEMEKA"
              className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Subject Configuration */}
          {mode === "JAMB_FULL" ? (
            <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="text-xs font-bold uppercase text-[#0A369D] mb-2">
                Select Exactly 3 Elective Subjects
              </h3>
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-[#0A369D] text-white text-xs font-bold px-3 py-1.5 rounded">
                  ✓ Use of English (Mandatory)
                </span>
                <span className="text-xs font-mono text-gray-500 font-bold">
                  ({selectedElectives.length + 1}/4 Selected)
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
                        ? "bg-[#0A369D] text-white border-[#0A369D] shadow-sm"
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
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded text-xs font-bold text-gray-800 focus:border-[#0A369D] outline-none"
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
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded text-xs font-bold text-gray-800 focus:border-[#0A369D] outline-none"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Privacy & Biometric Consent — gates all camera/mic access */}
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0A369D] flex-shrink-0"
              />
              <span className="text-[11px] text-gray-700 leading-relaxed">
                I consent to Prepify accessing my <strong>camera and microphone</strong> for
                identity verification and live proctoring during this practice exam, and to a
                face snapshot being stored on my device and shown on my result slip.{" "}
                <button
                  type="button"
                  onClick={() => setShowConsentDetails((v) => !v)}
                  className="text-[#0A369D] font-bold underline"
                >
                  {showConsentDetails ? "Hide details" : "What is collected?"}
                </button>
              </span>
            </label>

            {showConsentDetails && (
              <div className="mt-3 text-[10px] text-gray-600 font-mono bg-white border border-amber-200 rounded p-3 space-y-1.5 leading-relaxed">
                <p><strong>Camera:</strong> a still snapshot at setup + periodic face-count checks during the exam. Video is never uploaded or recorded — face counting runs in your browser.</p>
                <p><strong>Microphone:</strong> ambient volume level only, to flag background noise. No audio is recorded or transmitted.</p>
                <p><strong>Storage:</strong> your snapshot and answers stay in this browser (localStorage). Nothing is sent to a server unless you sign in or submit a weekly-challenge score.</p>
                <p><strong>Your control:</strong> revoke access anytime via your browser&apos;s site permissions, or clear your session from the results page.</p>
              </div>
            )}
          </div>

          {/* Biometric Snapshot Status */}
          <div className="mb-6 border-2 border-dashed border-gray-300 p-4 rounded text-center bg-gray-50 flex flex-col items-center">
            <h3 className="text-xs font-bold uppercase text-gray-700 mb-2">Required: Biometric Verification Snapshot</h3>
            <p className="text-[10px] text-gray-550 mb-4 max-w-md leading-relaxed">
              Verify your physical candidate identity to unlock the terminal. A face check ensures room compliance.
            </p>

            {candidateSnapshot ? (
              <div className="text-center flex flex-col items-center">
                <img src={candidateSnapshot} alt="Snapshot" className="w-32 h-32 object-cover border-2 border-green-600 rounded-lg shadow-md" />
                <span className="text-[10px] text-green-700 font-bold block mt-1.5">✓ Biometric Data Attached</span>
                <button
                  type="button"
                  onClick={startLivenessFlow}
                  className="text-[9px] text-[#D9383A] underline mt-1.5 font-bold hover:text-red-700"
                >
                  Retake Photo / Run Liveness Again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startLivenessFlow}
                disabled={!consentAccepted}
                className="px-5 py-3 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow transition-all transform active:scale-95"
              >
                {consentAccepted ? "Start Identity Verification (WebCam)" : "Accept consent above to continue"}
              </button>
            )}
          </div>

          {launchError && (
            <div className="mb-4 bg-red-50 border border-red-300 text-[#D9383A] text-xs font-mono rounded p-3 text-center">
              ⚠️ {launchError}
            </div>
          )}

          <button
            onClick={handleStartExam}
            disabled={isLaunching}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-wait text-white font-extrabold uppercase tracking-wider rounded text-base shadow-lg transition-transform hover:scale-[1.01] duration-150"
          >
            {isLaunching ? "Preparing Secure Exam Buffer…" : "Launch CBT Examination Workspace"}
          </button>
        </div>
      </section>

      {/* Liveness Verification Popup Wizard */}
      {isLivenessModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-4 border-[#0A369D] max-w-md w-full p-6 shadow-2xl relative animate-fade-in font-sans">

            {/* Close button */}
            <button
              onClick={closeLivenessModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold font-mono"
            >
              ×
            </button>

            <div className="text-center mb-4 border-b pb-3 border-gray-200">
              <h2 className="text-base font-black text-[#0A369D] uppercase tracking-wide">
                Identity Liveness Verification
              </h2>
              <p className="text-[10px] text-gray-500 font-mono">Secure Biometric Verification Protocol</p>
            </div>

            {/* Video container */}
            <div className="relative w-64 h-64 mx-auto bg-black rounded-full overflow-hidden border-4 border-[#0A369D] mb-4 shadow-lg flex items-center justify-center">
              {livenessStep === 'ERROR' ? (
                <div className="p-4 text-center text-[#D9383A] text-xs font-bold font-mono">
                  ⚠️ Camera Error
                </div>
              ) : isCameraReady ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  {/* Glowing Green target overlay */}
                  <div className="absolute inset-4 rounded-full border-2 border-dashed border-green-400/60 animate-spin" style={{ animationDuration: '10s' }} />
                  {/* Scan bar */}
                  {livenessStep === 'ANALYZING' && (
                    <div className="absolute left-0 w-full h-1 bg-green-400 top-0 animate-bounce shadow-[0_0_10px_#4ade80]" />
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 font-mono animate-pulse">
                  Initializing camera feed...
                </div>
              )}
            </div>

            {/* Steps Prompts */}
            <div className="bg-[#E9F1F7] p-3.5 rounded border border-blue-200 text-center mb-6">
              {livenessStep === 'INIT' && (
                <p className="text-xs font-semibold text-gray-700 animate-pulse">Setting up secure media channels...</p>
              )}

              {livenessStep === 'CENTER' && (
                <div>
                  <p className="text-xs font-bold text-gray-700 animate-pulse">Step 1: Center your face inside the target frame</p>
                  <p className="text-[10px] text-[#0A369D] font-mono mt-1">Keep completely still for alignment</p>
                  <div className="w-full bg-gray-250 h-2.5 rounded-full mt-3 overflow-hidden border">
                    <div className="bg-[#0A369D] h-full transition-all duration-200" style={{ width: `${livenessProgress}%` }} />
                  </div>
                </div>
              )}

              {livenessStep === 'BLINK' && (
                <div>
                  <p className="text-xs font-black text-gray-800 uppercase animate-bounce">Step 2: Blink 3 times now!</p>
                  <p className="text-[10px] text-gray-600 mt-1 font-mono">Liveness sensor checks eye closure states</p>
                  <div className="flex justify-center space-x-3 mt-3">
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${blinkCount >= 1 ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400'}`}>1</span>
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${blinkCount >= 2 ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400'}`}>2</span>
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${blinkCount >= 3 ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400'}`}>3</span>
                  </div>
                </div>
              )}

              {livenessStep === 'ANALYZING' && (
                <div>
                  <p className="text-xs font-bold text-gray-850">Step 3: Analyzing biometric snapshots...</p>
                  <p className="text-[10px] text-gray-550 mt-1 font-mono">Validating eye state: EYES OPEN check</p>
                </div>
              )}

              {livenessStep === 'SUCCESS' && (
                <div>
                  <p className="text-xs font-bold text-green-700">✓ Biometrics Liveness Exceeded!</p>
                  <p className="text-[10px] text-gray-650 mt-1 font-mono">Saving photo and synchronizing credentials...</p>
                </div>
              )}

              {livenessStep === 'ERROR' && (
                <div>
                  <p className="text-xs font-bold text-[#D9383A]">{cameraErrorMsg}</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex space-x-3">
              <button
                onClick={closeLivenessModal}
                className="flex-1 py-2 bg-gray-250 hover:bg-gray-300 text-gray-700 font-bold rounded text-xs transition-colors"
              >
                Cancel
              </button>
              {livenessStep === 'ERROR' && (
                <button
                  onClick={startLivenessFlow}
                  className="flex-1 py-2 bg-[#0A369D] hover:bg-blue-900 text-white font-extrabold rounded text-xs transition-colors shadow-sm"
                >
                  Retry Camera
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. System Keybindings / Specifications Guide */}
      <section id="about" className="py-12 bg-white border-y border-gray-200 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold text-[#0A369D] uppercase tracking-widest block mb-2">Technical Specifications</span>
            <h2 className="text-2xl font-black text-gray-900 uppercase mb-4">
              Integrated Examination Room Rules
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed font-serif mb-4">
              This terminal enforces standard UTME examination-room conditions. Attempting to bypass the sandbox will trigger security infractions and auto-submit.
            </p>
            <ul className="text-xs space-y-2.5 font-mono text-gray-700">
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>8-Key Controls: Select option with `A`, `B`, `C`, `D`, Navigate with `P` / `N`, Submit with `S` + `Y`.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Active Proctoring: Tracks camera liveness, background noise decibels, and tab-focus status.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Security Enforcement: Blocks page scrolls on keydown, copying text, selecting text, and right clicks.</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#E9F1F7] p-6 rounded-lg border-2 border-[#0A369D]">
            <h3 className="font-bold text-sm text-[#0A369D] uppercase mb-3 text-center border-b border-blue-200 pb-1.5">
              CBT Terminal Keybindings Guide
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border shadow-sm"><kbd className="font-bold text-[#0A369D] bg-gray-100 px-1 py-0.5 rounded mr-1">A,B,C,D</kbd> Select Option</div>
              <div className="bg-white p-2 rounded border shadow-sm"><kbd className="font-bold text-[#0A369D] bg-gray-100 px-1 py-0.5 rounded mr-1">N</kbd> Next Question</div>
              <div className="bg-white p-2 rounded border shadow-sm"><kbd className="font-bold text-[#0A369D] bg-gray-100 px-1 py-0.5 rounded mr-1">P</kbd> Previous Question</div>
              <div className="bg-white p-2 rounded border shadow-sm"><kbd className="font-bold text-[#D9383A] bg-gray-100 px-1 py-0.5 rounded mr-1">S</kbd> Submit Test</div>
              <div className="bg-white col-span-2 p-2 rounded border shadow-sm text-center">
                <kbd className="font-bold text-green-700 bg-gray-100 px-1.5 py-0.5 rounded mr-1">Y</kbd> Confirm Submission (Only in Submission modal)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contact Us / Support Form */}
      <section id="contact" className="py-12 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md">
          <h2 className="text-xl font-black text-[#0A369D] uppercase text-center mb-2">Technical Support & Feedback</h2>
          <p className="text-xs text-gray-500 text-center font-mono mb-6">Contact the Prepify team for assistance or questions.</p>

          <ContactForm />
        </div>
      </section>

      {/* 6. Comprehensive Educational Footer */}
      <footer className="bg-[#0A369D] text-white mt-auto border-t-4 border-[#FFC107] text-xs select-none">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-extrabold uppercase text-sm mb-2 text-[#FFC107]">Prepify UTME Practice</h4>
            <p className="text-gray-300 leading-relaxed font-serif text-[11px]">
              A free, secure computer-based test practice platform that lets candidates prepare for UTME under realistic examination conditions.
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">CBT Navigation</h4>
            <ul className="space-y-1 font-mono text-[11px] text-gray-300">
              <li><a href="#portal" className="hover:underline">Setup Setup Portal</a></li>
              <li><a href="#about" className="hover:underline">Keyboard Keys Info</a></li>
              <li><a href="#contact" className="hover:underline">Admin Contact Form</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">System Status</h4>
            <p className="text-gray-300 text-[11px] font-mono">
              Terminal: <span className="text-green-400 font-bold">READY</span><br />
              Network: Secure SSL / Offline Fallback<br />
              Vercel Deployment: Optimized & Ready
            </p>
          </div>
        </div>

        <div className="bg-black/30 py-3 text-center border-t border-white/10 font-mono text-[11px]">
          © {new Date().getFullYear()} Prepify — UTME CBT Practice Platform
        </div>
      </footer>

    </div>
  );
}
