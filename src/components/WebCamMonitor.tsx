import React, { useEffect, useRef, useState } from "react";

interface WebCamMonitorProps {
  onFaceCountChange: (count: number) => void;
  // Biometric snapshot captured during setup, shown beneath the live feed.
  candidatePhotoUrl?: string;
  // When false, the camera is released immediately (e.g. on exam submission).
  active?: boolean;
}

// Native FaceDetector is experimental; typed loosely so it compiles everywhere.
declare global {
  interface Window {
    FaceDetector?: any;
  }
}

export const WebCamMonitor: React.FC<WebCamMonitorProps> = ({
  onFaceCountChange,
  candidatePhotoUrl,
  active = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [faceCount, setFaceCount] = useState(1);
  const [permissionError, setPermissionError] = useState(false);
  const [detectionSupported, setDetectionSupported] = useState(true);

  // Release the camera immediately. Used on submit and on unmount.
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        // If deactivated while permission was pending, release at once.
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStreamActive(true);
      } catch (err) {
        console.warn("Webcam access denied for proctoring feed:", err);
        setPermissionError(true);
      }
    }
    initCamera();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop the camera the moment the monitor is deactivated (exam submitted).
  useEffect(() => {
    if (!active) stopCamera();
  }, [active]);

  // Attach the stream once the <video> element is mounted.
  useEffect(() => {
    if (streamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [streamActive]);

  // Real face detection loop using the native FaceDetector API when available.
  useEffect(() => {
    if (!streamActive) return;

    const FD = typeof window !== "undefined" ? window.FaceDetector : undefined;
    if (!FD) {
      // No native detector: keep the live feed but we can't count faces.
      setDetectionSupported(false);
      return;
    }

    const detector = new FD({ fastMode: true, maxDetectedFaces: 5 });
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const detect = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        timer = setTimeout(detect, 1200);
        return;
      }
      try {
        const faces = await detector.detect(videoRef.current);
        if (!cancelled) {
          const count = faces.length;
          setFaceCount(count);
          onFaceCountChange(count);
        }
      } catch {
        /* transient detect error; ignore this frame */
      }
      if (!cancelled) timer = setTimeout(detect, 1200);
    };
    detect();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [streamActive, onFaceCountChange]);

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white border-2 border-[#0A369D] rounded-lg shadow-2xl p-2.5 w-44 font-mono select-none">
      <div className="relative aspect-video bg-black rounded overflow-hidden mb-1.5 border border-gray-300">
        {permissionError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-red-50 text-[9px] text-[#D9383A] font-bold">
            <span>📷 Camera Denied</span>
            <span className="text-[8px] font-normal text-gray-500 mt-1">Check permissions</span>
          </div>
        ) : !streamActive ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
            Connecting Feed...
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {/* Liveness Indicator Overlay */}
        <div className="absolute top-1 left-1.5 flex items-center space-x-1 bg-black/60 px-1 rounded text-[8px] text-white">
          <span className={`w-1.5 h-1.5 rounded-full ${streamActive ? "bg-green-500 animate-ping" : "bg-red-500"}`} />
          <span>LIVE PROCTOR</span>
        </div>
      </div>

      {/* Proctoring Status Details */}
      <div className="text-[9px] space-y-1 bg-gray-50 p-1.5 rounded border">
        <div className="flex justify-between">
          <span className="text-gray-500">Status:</span>
          <span className={streamActive ? "text-green-600 font-bold" : "text-[#D9383A] font-bold"}>
            {streamActive ? "Active" : "Offline"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Faces:</span>
          <span className={faceCount === 1 ? "text-green-600 font-bold" : "text-[#D9383A] font-bold"}>
            {detectionSupported ? faceCount : "—"}
          </span>
        </div>
      </div>

      {/* Biometric verification snapshot — shown directly below the live feed */}
      <div className="mt-2 pt-1.5 border-t border-gray-200">
        <div className="text-[8px] font-bold text-[#0A369D] uppercase tracking-wider mb-1 text-center">
          Verified Identity
        </div>
        <div className="flex justify-center">
          {candidatePhotoUrl ? (
            <img
              src={candidatePhotoUrl}
              alt="Candidate biometric snapshot"
              className="w-16 h-16 object-cover rounded border-2 border-green-500 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-[7px] text-gray-400 text-center px-1">
              No snapshot
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
