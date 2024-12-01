export function calculateScore(timeElapsed: number, timeLimit: number): number {
  const baseScore = 1000;
  const timePenalty = (timeElapsed / timeLimit) * 500;
  return Math.max(Math.floor(baseScore - timePenalty), 0);
}
