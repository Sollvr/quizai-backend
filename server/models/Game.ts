export class Game {
  public roomId: string;
  public currentQuestion: number;
  public timeLimit: number;
  public totalQuestions: number;
  private scores: Map<string, number[]>;
  private hostId: string;
  private gameMode: 'time-based' | 'independent';
  
  constructor(roomId: string, settings: {
    timeLimit: number;
    totalQuestions: number;
    gameMode: 'time-based' | 'independent';
    hostId: string;
  }) {
    this.roomId = roomId;
    this.currentQuestion = 0;
    this.timeLimit = settings.timeLimit;
    this.totalQuestions = settings.totalQuestions;
    this.scores = new Map();
    this.hostId = settings.hostId;
    this.gameMode = settings.gameMode;
  }

  public addPlayerScore(playerId: string, score: number): void {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, []);
    }
    this.scores.get(playerId)!.push(score);
  }

  public getPlayerTotalScore(playerId: string): number {
    const playerScores = this.scores.get(playerId);
    if (!playerScores) return 0;
    return playerScores.reduce((sum, score) => sum + score, 0);
  }

  public moveToNextQuestion(): boolean {
    if (this.currentQuestion >= this.totalQuestions - 1) {
      return false;
    }
    this.currentQuestion++;
    return true;
  }

  public getFinalScores(): { playerId: string; totalScore: number }[] {
    return Array.from(this.scores.entries())
      .map(([playerId, scores]) => ({
        playerId,
        totalScore: scores.reduce((sum, score) => sum + score, 0)
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  public isHost(socketId: string): boolean {
    return socketId === this.hostId;
  }
}
