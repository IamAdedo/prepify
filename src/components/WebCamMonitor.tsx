import React, { useEffect, useRef, useState } from "react";

interface WebCamMonitorProps {
  onFaceCountChange: (count: number) => void;
}

export const WebCamMonitor: React.FC<WebCamMonitorProps> = ({ onFaceCountChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [faceCount, setFaceCount] = useState(1);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 160, height: 120, facingMode: "user" },
          audio: false, // Audio analyzed separately
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          currentStream = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.warn("Webcam access denied for proctoring feed:", err);
        setPermissionError(true);
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Update parent hook when faceCount changes
  useEffect(() => {
    onFaceCountChange(faceCount);
  }, [faceCount, onFaceCountChange]);

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white border-2 border-[#0A369D] rounded-lg shadow-2xl p-2.5 w-44 font-mono select-none transition-all hover:scale-105">
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
            {faceCount}
          </span>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="mt-2 pt-1.5 border-t border-gray-200">
        <div className="text-[8px] font-bold text-[#0A369D] uppercase tracking-wider mb-1 text-center">
          Simulation Admin
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setFaceCount(0)}
            className={`text-[8px] font-bold py-0.5 rounded border transition-colors ${
              faceCount === 0 ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Simulate candidate leaving their seat"
          >
            0 Face
          </button>
          <button
            onClick={() => setFaceCount(1)}
            className={`text-[8px] font-bold py-0.5 rounded border transition-colors ${
              faceCount === 1 ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Simulate normal status"
          >
            1 Face
          </button>
          <button
            onClick={() => setFaceCount(2)}
            className={`text-[8px] font-bold py-0.5 rounded border transition-colors ${
              faceCount === 2 ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Simulate second person in frame"
          >
            2+ Faces
          </button>
        </div>
      </div>
    </div>
  );
};
