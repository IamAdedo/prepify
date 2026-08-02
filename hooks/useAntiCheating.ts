import { useCallback, useEffect, useState } from "react";

export const useAntiCheating = (onAutoSubmit: () => void, maxInfractions: number = 3) => {
  const [infractions, setInfractions] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const registerInfraction = useCallback((reason: string) => {
    setInfractions((prev) => {
      const nextCount = prev + 1;
      console.warn(`[SECURITY INFRACTION #${nextCount}]: ${reason}`);
      if (nextCount >= maxInfractions) {
        alert("Maximum proctoring violations reached! Automatically submitting your examination.");
        onAutoSubmit();
      }
      return nextCount;
    });
  }, [maxInfractions, onAutoSubmit]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Fullscreen denial or error:", err);
    }
  };

  useEffect(() => {
    // 1. Tab-Blur / Focus-Loss Monitoring
    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerInfraction("Navigated away from examination tab.");
      }
    };

    const handleWindowBlur = () => {
      registerInfraction("Window lost active focus.");
    };

    // 2. Fullscreen State Monitoring
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        registerInfraction("Exited required fullscreen mode.");
      }
    };

    // 3. Disable Context Menu, Text Selection & Copy Shortcuts
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopy);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopy);
    };
  }, [registerInfraction]);

  return { infractions, isFullscreen, requestFullscreen };
};
