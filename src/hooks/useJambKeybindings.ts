"use client";

import { useEffect } from "react";

interface KeybindingsProps {
  onSelectOption: (option: "A" | "B" | "C" | "D") => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmitPrompt: () => void;
  onConfirmSubmit: () => void;
  isModalOpen: boolean;
}

export function useJambKeybindings({
  onSelectOption,
  onNext,
  onPrevious,
  onSubmitPrompt,
  onConfirmSubmit,
  isModalOpen,
}: KeybindingsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Avoid key triggers when candidate is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const key = event.key.toUpperCase();

      if (isModalOpen) {
        if (key === "Y") {
          event.preventDefault();
          onConfirmSubmit();
        }
        return;
      }

      switch (key) {
        case "A":
          event.preventDefault();
          onSelectOption("A");
          break;
        case "B":
          event.preventDefault();
          onSelectOption("B");
          break;
        case "C":
          event.preventDefault();
          onSelectOption("C");
          break;
        case "D":
          event.preventDefault();
          onSelectOption("D");
          break;
        case "N":
          event.preventDefault();
          onNext();
          break;
        case "P":
          event.preventDefault();
          onPrevious();
          break;
        case "S":
          event.preventDefault();
          onSubmitPrompt();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectOption, onNext, onPrevious, onSubmitPrompt, onConfirmSubmit, isModalOpen]);
}
