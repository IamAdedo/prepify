import { Question } from "@/types/jamb";

export const MOCK_JAMB_QUESTIONS: Question[] = [
  {
    id: 101,
    subject: "Use of English",
    section: "COMPREHENSION: Read the passage carefully and answer the question that follows.\n\nGreat scientific achievements are rarely the result of isolated efforts. Rather, they are the culmination of historical contributions, collaborative experiments, and sudden flashes of insight that synthesize existing knowledge...",
    question: "According to the passage, scientific breakthroughs are best described as:",
    option: {
      a: "Accidental findings by lonely researchers.",
      b: "Collaborative and cumulative historical outcomes.",
      c: "Mystical experiences reserved for genius minds.",
      d: "Events independent of any past discoveries."
    },
    answer: "b",
    explanation: "The passage notes that breakthroughs are the culmination of historical contributions and collaborative insights."
  },
  {
    id: 102,
    subject: "Use of English",
    question: "From the options lettered A - D, choose the option that has the **opposite meaning** to the underlined word:\n\nThe witness was praised for her <span class='underline font-bold'>candid</span> testimony in court.",
    option: {
      a: "Sincere",
      b: "Guarded",
      c: "Evasive",
      d: "Deceitful"
    },
    answer: "d",
    explanation: "'Candid' means truthful and straightforward. The opposite is 'deceitful'."
  },
  {
    id: 103,
    subject: "Mathematics",
    question: "Find the value of $x$ for which $\\log_2 (x^2 - 2x) = 3$.",
    option: {
      a: "x = 4 or x = -2",
      b: "x = 8 or x = -1",
      c: "x = 2 or x = -4",
      d: "x = 4 or x = 2"
    },
    answer: "a",
    explanation: "Converting to exponential form: $x^2 - 2x = 2^3 = 8 \\Rightarrow x^2 - 2x - 8 = 0 \\Rightarrow (x-4)(x+2) = 0$, so $x = 4$ or $x = -2$."
  },
  {
    id: 104,
    subject: "Mathematics",
    question: "If the 3rd and 7th terms of an Arithmetic Progression (AP) are 9 and 21 respectively, find the common difference.",
    option: {
      a: "2",
      b: "3",
      c: "4",
      d: "5"
    },
    answer: "b",
    explanation: "Formula: $T_n = a + (n-1)d$. $T_3 = a + 2d = 9$ and $T_7 = a + 6d = 21$. Subtracting gives $4d = 12 \\Rightarrow d = 3$."
  },
  {
    id: 105,
    subject: "Physics",
    question: "A stone thrown horizontally with a velocity of $15\\text{ m/s}$ from a cliff takes $4\\text{ seconds}$ to hit the ground. Calculate the height of the cliff. [Take $g = 10\\text{ m/s}^2$]",
    option: {
      a: "60 m",
      b: "80 m",
      c: "45 m",
      d: "100 m"
    },
    answer: "b",
    explanation: "Using $s = ut + 0.5gt^2$. Since initial vertical velocity $u = 0$, $h = 0.5 \\times 10 \\times 4^2 = 80\\text{ m}$."
  },
  {
    id: 106,
    subject: "Physics",
    question: "Which of the following is the correct unit of electric field intensity?",
    option: {
      a: "Joules per Coulomb",
      b: "Coulomb per Newton",
      c: "Newton per Coulomb",
      d: "Ampere per Volt"
    },
    answer: "c",
    explanation: "Electric field intensity is force per unit charge: $E = F/q$, hence Newtons per Coulomb ($N/C$)."
  },
  {
    id: 107,
    subject: "Chemistry",
    question: "What is the oxidation number of chromium in the dichromate ion ($K_2Cr_2O_7$)?",
    option: {
      a: "+3",
      b: "+5",
      c: "+6",
      d: "+7"
    },
    answer: "c",
    explanation: "$2(+1) + 2(Cr) + 7(-2) = 0 \\Rightarrow 2 + 2Cr - 14 = 0 \\Rightarrow 2Cr = 12 \\Rightarrow Cr = +6$."
  },
  {
    id: 108,
    subject: "Chemistry",
    question: "Which of the following gases turns lime water milky?",
    option: {
      a: "Oxygen",
      b: "Nitrogen dioxide",
      c: "Carbon dioxide",
      d: "Sulphur dioxide"
    },
    answer: "c",
    explanation: "Carbon dioxide reacts with calcium hydroxide (lime water) to form an insoluble white precipitate of calcium carbonate."
  },
  {
    id: 109,
    subject: "Biology",
    question: "Which of the following organelles is responsible for cellular respiration?",
    option: {
      a: "Ribosome",
      b: "Mitochondrion",
      c: "Chloroplast",
      d: "Golgi body"
    },
    answer: "b",
    explanation: "The mitochondrion is the powerhouse of the cell, where ATP is generated through aerobic respiration."
  },
  {
    id: 110,
    subject: "Biology",
    question: "The process of maintaining a constant internal environment in an organism is known as:",
    option: {
      a: "Plasmolysis",
      b: "Osmoregulation",
      c: "Homeostasis",
      d: "Thermoregulation"
    },
    answer: "c",
    explanation: "Homeostasis is the regulation of physiological processes to maintain internal balance."
  },
  {
    id: 111,
    subject: "Economics",
    question: "Which of the following is a primary function of money?",
    option: {
      a: "Standard of deferred payment",
      b: "Store of value",
      c: "Medium of exchange",
      d: "Measure of liquidity"
    },
    answer: "c",
    explanation: "The primary function of money is to act as a medium of exchange to facilitate trade."
  },
  {
    id: 112,
    subject: "Government",
    question: "The ultimate authority in a state which can make and enforce laws is called:",
    option: {
      a: "Democracy",
      b: "Sovereignty",
      c: "Constitution",
      d: "Legitimacy"
    },
    answer: "b",
    explanation: "Sovereignty refers to the supreme, absolute power of a state to govern itself."
  },
  {
    id: 113,
    subject: "Literature in English",
    question: "A figure of speech in which a part is made to represent the whole, or vice versa, is:",
    option: {
      a: "Metonymy",
      b: "Synecdoche",
      c: "Hyperbole",
      d: "Personification"
    },
    answer: "b",
    explanation: "Synecdoche is where a part represents the whole (e.g. 'all hands on deck')."
  },
  {
    id: 114,
    subject: "CRK",
    question: "Who was chosen to replace Judas Iscariot as one of the twelve apostles?",
    option: {
      a: "Barnabas",
      b: "Stephen",
      c: "Matthias",
      d: "Paul"
    },
    answer: "c",
    explanation: "Acts 1 records that Matthias was chosen by casting lots to succeed Judas."
  },
  {
    id: 115,
    subject: "Commerce",
    question: "A document that gives a buyer possession of goods before full payment is made under hire purchase is the:",
    option: {
      a: "Consignment note",
      b: "Hire purchase agreement",
      c: "Delivery note",
      d: "Proforma invoice"
    },
    answer: "b",
    explanation: "The hire purchase agreement outlines terms letting the buyer possess the goods while paying installments."
  }
];
