export class Game {
  constructor(lobby) {
    console.log('Creating new game with lobby:', {
      code: lobby.code,
      players: lobby.players.size,
      settings: {
        timeLimit: lobby.timeLimit,
        gameMode: lobby.gameMode,
        questionCount: lobby.questionCount
      }
    });

    this.lobbyCode = lobby.code;
    this.players = new Map(lobby.players);
    this.questions = lobby.questions;
    this.currentQuestionIndex = 0;
    this.timeLimit = lobby.timeLimit;
    this.gameMode = lobby.gameMode;
    this.status = 'in_progress';
    this.roundStartTime = null;
    this.answers = new Map();
    this.hostId = lobby.hostId;

    // Add test questions if none exist
    if (!this.questions || this.questions.length === 0) {
      this.questions = [
        {
          id: 1,
          question_text: "What is JavaScript?",
          options: ["A programming language", "A type of coffee", "A book", "A car"],
          correct_answer: "A programming language"
        },
        {
          id: 2,
          question_text: "What is Node.js?",
          options: ["A runtime environment", "A database", "A framework", "A language"],
          correct_answer: "A runtime environment"
        }
      ];
    }
  }

  startRound() {
    this.roundStartTime = Date.now();
    this.answers.clear();
    return this.getCurrentQuestion();
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  submitAnswer(playerId, answer) {
    const player = this.players.get(playerId);
    if (!player || !player.connected) {
      throw new Error('Player not found or disconnected');
    }

    const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
    const isCorrect = answer === this.getCurrentQuestion().correct_answer;
    const points = isCorrect ? this.calculatePoints(timeElapsed) : 0;

    this.answers.set(playerId, {
      answer,
      isCorrect,
      timeElapsed,
      points
    });

    if (player) {
      player.score += points;
      player.currentQuestion = this.currentQuestionIndex + 1;
    }

    return {
      isCorrect,
      points,
      correctAnswer: this.getCurrentQuestion().correct_answer
    };
  }

  calculatePoints(timeElapsed) {
    if (timeElapsed > this.timeLimit) return 0;
    const basePoints = 1000;
    const timeBonus = 1 - (timeElapsed / this.timeLimit);
    return Math.round(basePoints * timeBonus);
  }

  isRoundComplete() {
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    return this.answers.size >= connectedPlayers.length;
  }

  canAdvance() {
    return this.currentQuestionIndex < this.questions.length - 1;
  }

  advanceQuestion() {
    if (this.canAdvance()) {
      this.currentQuestionIndex++;
      return true;
    }
    return false;
  }

  getRoundResults() {
    return Array.from(this.answers.entries())
      .filter(([playerId]) => this.players.get(playerId)?.connected)
      .map(([playerId, result]) => ({
        username: this.players.get(playerId).username,
        ...result
      }));
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .filter(player => player.connected)
      .sort((a, b) => b.score - a.score)
      .map(player => ({
        username: player.username,
        score: player.score,
        progress: player.currentQuestion
      }));
  }
} 