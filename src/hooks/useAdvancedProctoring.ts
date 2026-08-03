import { useCallback, useEffect, useRef, useState } from "react";

interface ProctoringOptions {
  onTerminate: (reason: string) => void;
  maxNoiseDecibels?: number;
}

export const useAdvancedProctoring = ({ onTerminate, maxNoiseDecibels = 60 }: ProctoringOptions) => {
  const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState<number | null>(null);
  const [audioNoiseWarning, setAudioNoiseWarning] = useState<boolean>(false);
  const [multiPersonWarning, setMultiPersonWarning] = useState<string | null>(null);
  // Countdown shown when the candidate has left the camera frame. When it hits
  // zero the exam is auto-submitted.
  const [noPersonGraceSeconds, setNoPersonGraceSeconds] = useState<number | null>(null);
  const [infractionLogs, setInfractionLogs] = useState<string[]>([]);
  const [infractionCount, setInfractionCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const multiPersonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noPersonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNoiseLoggedRef = useRef<number>(0);
  const lastPresenceLoggedRef = useRef<number>(0);
  // Set true when the candidate is intentionally submitting so we don't log the
  // resulting fullscreen exit as a security violation.
  const isSubmittingRef = useRef<boolean>(false);

  // Release the proctoring microphone immediately. Called on submit and unmount.
  const stopAudioMonitoring = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {/* already closed */});
      audioContextRef.current = null;
    }
  }, []);

  const beginSubmission = useCallback(() => {
    isSubmittingRef.current = true;
    // Stop the mic the instant the candidate submits — don't wait for unmount.
    stopAudioMonitoring();
  }, [stopAudioMonitoring]);

  // Initialize state from localStorage if available
  useEffect(() => {
    const savedLogs = localStorage.getItem("jamb_infraction_logs");
    const savedCount = localStorage.getItem("jamb_infraction_count");
    if (savedLogs) setInfractionLogs(JSON.parse(savedLogs));
    if (savedCount) setInfractionCount(Number(savedCount));

    // Determine initial fullscreen state
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  const registerViolation = useCallback((msg: string, incrementInfraction = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    
    setInfractionLogs((prev) => {
      const updated = [...prev, logEntry];
      localStorage.setItem("jamb_infraction_logs", JSON.stringify(updated));
      return updated;
    });

    if (incrementInfraction) {
      setInfractionCount((prev) => {
        const nextCount = prev + 1;
        localStorage.setItem("jamb_infraction_count", String(nextCount));
        if (nextCount >= 3) {
          onTerminate("Maximum security infractions (3) reached.");
        }
        return nextCount;
      });
    }
  }, [onTerminate]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  };

  // 1. Audio Noise Detector
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const setupAudio = async () => {
      // Don't (re)acquire the mic if the candidate already submitted.
      if (isSubmittingRef.current) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // If submission happened while permission was pending, release at once.
        if (isSubmittingRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!audioContextRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

          // Average volume goes from 0 to 255. 
          if (average > maxNoiseDecibels) {
            setAudioNoiseWarning(true);
            const now = Date.now();
            // Throttle logs for continuous noise to once every 10 seconds
            if (now - lastNoiseLoggedRef.current > 10000) {
              lastNoiseLoggedRef.current = now;
              registerViolation(`High background noise level detected (~${Math.round(average)}dB)`, false);
            }
          } else {
            setAudioNoiseWarning(false);
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (e) {
        console.warn("Microphone access denied or failed for noise proctoring:", e);
      }
    };

    setupAudio();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopAudioMonitoring();
    };
  }, [maxNoiseDecibels, registerViolation, stopAudioMonitoring]);

  // 2. Tab Focus Loss and Fullscreen Changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation("Tab visibility hidden (switched away).", true);
        setTabSwitchGraceSeconds(15);

        graceTimerRef.current = setInterval(() => {
          setTabSwitchGraceSeconds((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(graceTimerRef.current!);
              onTerminate("Exam terminated: Switched tab for more than 15 seconds.");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (graceTimerRef.current) {
          clearInterval(graceTimerRef.current);
          graceTimerRef.current = null;
        }
        setTabSwitchGraceSeconds(null);
      }
    };

    const handleWindowBlur = () => {
      registerViolation("Window focus lost.", false);
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      // Don't flag the fullscreen exit that happens during intentional submit.
      if (!active && !isSubmittingRef.current) {
        registerViolation("Exited required fullscreen mode.", true);
      }
    };

    // Text & right click prevention
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventSelectStart = (e: Event) => e.preventDefault();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("selectstart", preventSelectStart);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("selectstart", preventSelectStart);
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [onTerminate, registerViolation]);

  // 3. Camera presence detection — multi-person and no-person (candidate left).
  const clearNoPerson = useCallback(() => {
    if (noPersonTimerRef.current) {
      clearInterval(noPersonTimerRef.current);
      noPersonTimerRef.current = null;
    }
    setNoPersonGraceSeconds((prev) => (prev === null ? prev : null));
  }, []);

  const clearMultiPerson = useCallback(() => {
    if (multiPersonTimerRef.current) {
      clearTimeout(multiPersonTimerRef.current);
      multiPersonTimerRef.current = null;
    }
  }, []);

  const triggerMultiPersonAlert = useCallback((detectedCount: number) => {
    if (detectedCount > 1) {
      // More than one face in frame.
      clearNoPerson();
      const msg = `Security warning: Multiple people (${detectedCount}) detected in camera frame.`;
      setMultiPersonWarning(msg);

      const now = Date.now();
      if (now - lastPresenceLoggedRef.current > 15000) {
        lastPresenceLoggedRef.current = now;
        registerViolation("Multiple individuals detected in camera feed.", false);
      }

      if (!multiPersonTimerRef.current) {
        multiPersonTimerRef.current = setTimeout(() => {
          onTerminate("Exam terminated: Failure to clear extra individuals from camera frame within 60s.");
        }, 60000);
      }
    } else if (detectedCount === 0) {
      // No one in frame — the candidate has left the exam. Start a 60s countdown
      // and auto-submit if they don't return.
      clearMultiPerson();
      setMultiPersonWarning("Candidate left the exam — no one detected in the camera frame.");

      if (noPersonTimerRef.current) return; // countdown already running

      const now = Date.now();
      if (now - lastPresenceLoggedRef.current > 15000) {
        lastPresenceLoggedRef.current = now;
        registerViolation("Candidate left the exam (no person in camera feed).", true);
      }

      setNoPersonGraceSeconds(60);
      noPersonTimerRef.current = setInterval(() => {
        setNoPersonGraceSeconds((prev) => {
          if (prev === null || prev <= 1) {
            if (noPersonTimerRef.current) {
              clearInterval(noPersonTimerRef.current);
              noPersonTimerRef.current = null;
            }
            onTerminate("Exam terminated: Candidate left the exam and did not return within 60 seconds.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Exactly one candidate present — clear all presence warnings.
      setMultiPersonWarning(null);
      clearMultiPerson();
      clearNoPerson();
    }
  }, [onTerminate, registerViolation, clearNoPerson, clearMultiPerson]);

  // Clear presence timers on unmount.
  useEffect(() => {
    return () => {
      if (multiPersonTimerRef.current) clearTimeout(multiPersonTimerRef.current);
      if (noPersonTimerRef.current) clearInterval(noPersonTimerRef.current);
    };
  }, []);

  return {
    tabSwitchGraceSeconds,
    audioNoiseWarning,
    multiPersonWarning,
    noPersonGraceSeconds,
    infractionLogs,
    infractionCount,
    isFullscreen,
    requestFullscreen,
    beginSubmission,
    triggerMultiPersonAlert,
  };
};
