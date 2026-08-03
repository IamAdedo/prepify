export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: number;
  subject: string;
  question: string;
  option: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  answer: 'a' | 'b' | 'c' | 'd';
  section?: string; // Comprehension passage or instruction
  explanation?: string;
}

export interface Question {
  id: number;
  subject: string;
  year?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  imageUrl?: string;
}

export interface SubjectScore {
  subject: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  rawPercentage: number;
  scaledScore: number; // Scaled to 100 per subject
}

export interface ExamResults {
  candidateName: string;
  registrationNumber: string;
  dateCompleted: string;
  mode: ExamMode;
  overallScore: number; // Scaled to 400 for JAMB_FULL
  subjectScores: SubjectScore[];
  infractionCount: number;
}
export interface UserAnswers {
  [questionId: number]: "A" | "B" | "C" | "D";
}

export type UserAnswers = Record<number, 'A' | 'B' | 'C' | 'D'>;

export interface ExamSessionState {
  candidateName: string;
  registrationNumber: string;
  durationMinutes: number;
  timeRemainingSeconds: number;
  infractionsCount: number;
  isSubmitted: boolean;
  selectedSubjectIndex: number;
  currentQuestionIndex: number;
  answers: UserAnswers;
  visitedQuestions: number[]; // Question IDs
}

export type ExamMode = 'JAMB_FULL' | 'PRACTICE_SINGLE';

export interface ExamConfig {
  candidateName: string;
  registrationNumber: string;
  candidatePhotoUrl?: string; // Captured during liveness check
  mode: ExamMode;
  subjects: string[]; // ['Use of English', 'Mathematics', 'Physics', 'Chemistry']
  selectedYear?: string; // e.g. "2023" or "random"
  durationMinutes: number;
}

export interface SecurityInfraction {
  id: string;
  timestamp: string;
  reason: string;
  severity: 'WARNING' | 'TERMINATION';
}

export interface SubjectResult {
  subject: string;
  score: number;
  maxScore: number;
  totalAnswered: number;
}
