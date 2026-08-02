import { Question } from "@/types/jamb";

export const MOCK_JAMB_QUESTIONS: Question[] = [
  {
    id: 1,
    subject: "Use of English",
    section: "COMPREHENSION: Read the passage carefully and answer the question that follows.\n\nCorruption in public life degrades national development...",
    question: "According to the passage, what is the primary consequence of public corruption?",
    option: {
      a: "It accelerates economic growth",
      b: "It degrades national development",
      c: "It promotes transparency",
      d: "It empowers local businesses"
    },
    answer: "b",
    explanation: "The passage directly states that corruption degrades national development."
  },
  {
    id: 2,
    subject: "Use of English",
    question: "Choose the word **opposite in meaning** to the underlined word:\n\nThe manager’s **hostile** attitude intimidated the staff.",
    option: {
      a: "Friendly",
      b: "Aggressive",
      c: "Antagonistic",
      d: "Aloof"
    },
    answer: "a",
    explanation: "'Friendly' is the direct antonym of 'hostile'."
  },
  {
    id: 3,
    subject: "Mathematics",
    question: "Evaluate $\\log_{10} 25 + \\log_{10} 4$.",
    option: {
      a: "1",
      b: "2",
      c: "100",
      d: "10"
    },
    answer: "b",
    explanation: "Using logarithm properties: \\log(25 \\times 4) = \\log(100) = 2."
  },
  {
    id: 4,
    subject: "Physics",
    question: "Which of the following is a scalar quantity?",
    option: {
      a: "Displacement",
      b: "Acceleration",
      c: "Electric Potential",
      d: "Force"
    },
    answer: "c",
    explanation: "Electric potential has magnitude only, making it a scalar quantity."
  }
];
