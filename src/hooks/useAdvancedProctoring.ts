import { useCallback, useEffect, useRef, useState } from "react";

interface ProctoringOptions {
  onTerminate: (reason: string) => void;
  maxNoiseDecibels?: number;
}

export const useAdvancedProctoring = ({ onTerminate, maxNoiseDecibels = 60 }: ProctoringOptions) => {
  const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState<number | null>(null);
  const [audioNoiseWarning, setAudioNoiseWarning] = useState<boolean>(false);
  const [multiPersonWarning, setMultiPersonWarning] = useState<string | null>(null);
  const [infractionLogs, setInfractionLogs] = useState<string[]>([]);
  const [infractionCount, setInfractionCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const multiPersonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNoiseLoggedRef = useRef<number>(0);

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
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [maxNoiseDecibels, registerViolation]);

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
      if (!active) {
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

  // 3. Multi-Person Detection Alerts
  const triggerMultiPersonAlert = useCallback((detectedCount: number) => {
    if (detectedCount > 1) {
      const msg = `Security warning: Multiple people (${detectedCount}) detected in camera frame.`;
      setMultiPersonWarning(msg);
      
      const now = Date.now();
      if (now - lastNoiseLoggedRef.current > 15000) {
        registerViolation("Multiple individuals detected in camera feed.", false);
      }

      if (!multiPersonTimerRef.current) {
        multiPersonTimerRef.current = setTimeout(() => {
          onTerminate("Exam terminated: Failure to clear extra individuals from camera frame within 60s.");
        }, 60000);
      }
    } else if (detectedCount === 0) {
      const msg = "Security warning: No candidate detected in camera frame.";
      setMultiPersonWarning(msg);
      
      const now = Date.now();
      if (now - lastNoiseLoggedRef.current > 15000) {
        registerViolation("No candidate detected in camera feed.", false);
      }
    } else {
      setMultiPersonWarning(null);
      if (multiPersonTimerRef.current) {
        clearTimeout(multiPersonTimerRef.current);
        multiPersonTimerRef.current = null;
      }
    }
  }, [onTerminate, registerViolation]);

  return {
    tabSwitchGraceSeconds,
    audioNoiseWarning,
    multiPersonWarning,
    infractionLogs,
    infractionCount,
    isFullscreen,
    requestFullscreen,
    triggerMultiPersonAlert,
  };
};
