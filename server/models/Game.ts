export type GameState = 'waiting' | 'starting' | 'in_progress' | 'completed';

export class Game {
  public roomId: string;
  public currentQuestion: number;
  public timeLimit: number;
  public totalQuestions: number;
  private scores: Map<string, number[]>;
  private hostId: string;
  private gameMode: 'time-based' | 'independent';
  private state: GameState = 'waiting';
  private startTime: number | null = null;
  
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

  public getState(): GameState {
    return this.state;
  }

  public setState(newState: GameState): void {
    this.state = newState;
    if (newState === 'in_progress' && !this.startTime) {
      this.startTime = Date.now();
    }
  }

  public getGameStatus(): {
    state: GameState;
    currentQuestion: number;
    totalQuestions: number;
    timeElapsed?: number;
  } {
    const status: {
      state: GameState;
      currentQuestion: number;
      totalQuestions: number;
      timeElapsed?: number;
    } = {
      state: this.state,
      currentQuestion: this.currentQuestion,
      totalQuestions: this.totalQuestions,
    };

    if (this.startTime && this.state === 'in_progress') {
      status.timeElapsed = Date.now() - this.startTime;
    }

    return status;
  }
  public isHost(socketId: string): boolean {
    return socketId === this.hostId;
  }
}
