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
