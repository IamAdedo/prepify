import { useEffect } from "react";

interface KeybindingProps {
  onSelectOption: (option: 'A' | 'B' | 'C' | 'D') => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmitPrompt: () => void;
  onConfirmSubmit: () => void;
  isModalOpen: boolean;
}

export const useJambKeybindings = ({
  onSelectOption,
  onNext,
  onPrevious,
  onSubmitPrompt,
  onConfirmSubmit,
  isModalOpen,
}: KeybindingProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keybindings inside input fields if any exist
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();

      // Block defaults for exam control keys
      if (['A', 'B', 'C', 'D', 'N', 'P', 'S', 'Y', ' '].includes(key)) {
        if (e.key === ' ' || key === 'P') e.preventDefault(); // Prevent page scroll
      }

      if (isModalOpen) {
        if (key === 'Y') {
          e.preventDefault();
          onConfirmSubmit();
        }
        return;
      }

      switch (key) {
        case 'A':
        case 'B':
        case 'C':
        case 'D':
          onSelectOption(key as 'A' | 'B' | 'C' | 'D');
          break;
        case 'N':
          onNext();
          break;
        case 'P':
          onPrevious();
          break;
        case 'S':
          onSubmitPrompt();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectOption, onNext, onPrevious, onSubmitPrompt, onConfirmSubmit, isModalOpen]);
};
