import crypto from "crypto";

// Server-only encryption for the exam answer key. The correct answers and
// explanations are AES-256-GCM encrypted into an opaque token that is sent to
// the browser but cannot be read or tampered with there. At grading time the
// client returns the token and the server decrypts it to grade authoritatively.
//
// This is what makes the leaderboard trustworthy: the client never sees the
// answers during the exam, so it cannot fabricate a perfect score.

const RAW_SECRET =
  process.env.EXAM_SIGNING_SECRET ||
  // Dev-only fallback so the app runs without configuration. Set
  // EXAM_SIGNING_SECRET in production for real integrity guarantees.
  "prepify-dev-insecure-exam-secret-change-me";

// Derive a stable 32-byte key from whatever secret is configured.
const KEY = crypto.createHash("sha256").update(RAW_SECRET).digest();

export interface AnswerKeyItem {
  id: number;
  subject: string;
  answer: "a" | "b" | "c" | "d";
  explanation?: string;
}

export function encryptAnswerKey(items: AnswerKeyItem[]): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(items), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // token = iv(12) + tag(16) + ciphertext, base64url encoded
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptAnswerKey(token: string): AnswerKeyItem[] {
  const buf = Buffer.from(token, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

export const isExamSecretConfigured = Boolean(process.env.EXAM_SIGNING_SECRET);
