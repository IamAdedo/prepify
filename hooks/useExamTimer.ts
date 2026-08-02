import { useEffect, useState } from "react";

export const useExamTimer = (initialSeconds: number, onTimeExpired: () => void) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onTimeExpired]);

  const formatTime = () => {
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;

    return [hours, minutes, seconds]
      .map((val) => String(val).padStart(2, "0"))
      .filter((val, index) => index > 0 || hours > 0) // Hide hours if 00
      .join(":");
  };

  return { secondsLeft, formattedTime: formatTime() };
};
