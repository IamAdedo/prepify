// Registration number format: 3271 + HHmmss (24h time the exam was taken)
// + two random uppercase letters.
// Example: 3271220000EB  ->  prefix 3271, 22:00:00 (10pm), random "EB".
export function generateRegistrationNumber(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rand = () => A[Math.floor(Math.random() * A.length)];

  return `3271${time}${rand()}${rand()}`;
}
