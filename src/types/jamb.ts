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
  // Optional on the client: the correct answer is withheld during the exam and
  // only revealed by /api/grade after submission (see examCrypto).
  answer?: 'a' | 'b' | 'c' | 'd';
  section?: string; // Comprehension passage or instruction
  explanation?: string;
  year?: string;
  imageUrl?: string;
}

export type UserAnswers = Record<number, 'A' | 'B' | 'C' | 'D'>;

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
  selectedYear?: string; // e.g. "2023" or "Randomized"
  durationMinutes: number;
  isWeeklyChallenge?: boolean; // Result counts toward the weekly leaderboard
  weekKey?: string; // ISO week the challenge belongs to
  startedAt?: number; // epoch ms, for duration tracking
}

export interface SecurityInfraction {
  id: string;
  timestamp: string;
  reason: string;
  severity: 'WARNING' | 'TERMINATION';
}

// A single parsed proctoring event with its type and how many times it occurred.
export interface SecurityEventSummary {
  label: string;
  count: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// ---- Weekly Challenge / Leaderboard ----

export interface SubjectScoreEntry {
  subject: string;
  correct: number;
  total: number;
  scaledScore: number; // scaled to 100
}

// Payload submitted to the leaderboard after a weekly challenge attempt.
export interface LeaderboardSubmission {
  weekKey: string;
  candidateName: string;
  registrationNumber: string;
  mode: ExamMode;
  aggregateScore: number; // scaled to 400
  totalCorrect: number;
  totalQuestions: number;
  infractions: number;
  durationSeconds: number;
  subjectScores: SubjectScoreEntry[];
}

export interface FullLeaderboardRow {
  position: number;
  entryId: string;
  candidateName: string;
  aggregateScore: number;
  totalCorrect: number;
  totalQuestions: number;
  infractions: number;
  durationSeconds: number;
  createdAt: string;
}

export interface SubjectLeaderboardRow {
  position: number;
  entryId: string;
  candidateName: string;
  correct: number;
  total: number;
  scaledScore: number;
  createdAt: string;
}

// Grouped by subject; a subject key exists only if it has >= 1 participant.
export type SubjectLeaderboards = Record<string, SubjectLeaderboardRow[]>;

export interface SubjectResult {
  subject: string;
  score: number;
  maxScore: number;
  totalAnswered: number;
}

// ---- Server-authoritative grading ----

// Per-question result returned by /api/grade (answer key revealed only AFTER
// submission, never during the exam).
export interface GradedQuestion {
  id: number;
  subject: string;
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  userAnswer: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
  explanation?: string;
}

export interface GradeResult {
  aggregateScore: number; // scaled to 400
  totalCorrect: number;
  totalQuestions: number;
  subjectScores: SubjectScoreEntry[];
  breakdown: GradedQuestion[];
  // Present when this attempt was a weekly challenge and was recorded remotely.
  leaderboardRecorded: boolean;
}

// ---- Attempt history (progress over time) ----

export interface AttemptRecord {
  id: string;
  completedAt: string; // ISO
  candidateName: string;
  registrationNumber: string;
  mode: ExamMode;
  subjects: string[];
  aggregateScore: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number; // 0..100
  durationSeconds: number;
  infractions: number;
  isWeeklyChallenge: boolean;
  subjectScores: SubjectScoreEntry[];
}
