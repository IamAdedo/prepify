import { useCallback, useEffect, useRef, useState } from "react";

interface ProctoringOptions {
  onTerminate: (reason: string) => void;
  maxNoiseDecibels?: number; // Decibel threshold trigger
}

export const useAdvancedProctoring = ({ onTerminate, maxNoiseDecibels = 65 }: ProctoringOptions) => {
  const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState<number | null>(null);
  const [audioNoiseWarning, setAudioNoiseWarning] = useState<boolean>(false);
  const [multiPersonWarning, setMultiPersonWarning] = useState<string | null>(null);
  const [infractionLogs, setInfractionLogs] = useState<string[]>([]);

  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const multiPersonTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logViolation = useCallback((msg: string) => {
    setInfractionLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // 1. Audio Noise Detector via Web Audio API Analyser
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const setupAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

          if (average > maxNoiseDecibels) {
            setAudioNoiseWarning(true);
            logViolation(`Excessive background noise detected: ~${Math.round(average)}dB`);
          } else {
            setAudioNoiseWarning(false);
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (e) {
        console.warn("Microphone unaccessible for noise proctoring:", e);
      }
    };

    setupAudio();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [maxNoiseDecibels, logViolation]);

  // 2. Tab Switch & Focus Loss: 15-Second Grace Countdown
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation("Focus lost/tab switched. 15-second grace countdown initiated.");
        setTabSwitchGraceSeconds(15);

        graceTimerRef.current = setInterval(() => {
          setTabSwitchGraceSeconds((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(graceTimerRef.current!);
              onTerminate("Exam terminated: Tab blur grace period exceeded 15 seconds.");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Returned within grace period
        if (graceTimerRef.current) clearInterval(graceTimerRef.current);
        setTabSwitchGraceSeconds(null);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [onTerminate, logViolation]);

  // 3. Multi-Person Detection Warning Simulator
  const triggerMultiPersonAlert = useCallback((detectedCount: number) => {
    if (detectedCount > 1) {
      const msg = "CRITICAL: Multiple individuals detected in camera stream. Extra presence must leave within 60 seconds.";
      setMultiPersonWarning(msg);
      logViolation(msg);

      if (!multiPersonTimerRef.current) {
        multiPersonTimerRef.current = setTimeout(() => {
          onTerminate("Exam terminated: Failure to clear extra individuals from camera view within 60s.");
        }, 60000);
      }
    } else {
      setMultiPersonWarning(null);
      if (multiPersonTimerRef.current) {
        clearTimeout(multiPersonTimerRef.current);
        multiPersonTimerRef.current = null;
      }
    }
  }, [onTerminate, logViolation]);

  return {
    tabSwitchGraceSeconds,
    audioNoiseWarning,
    multiPersonWarning,
    infractionLogs,
    triggerMultiPersonAlert,
  };
};
