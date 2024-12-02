export class Lobby {
  constructor(hostId, settings) {
    this.id = settings.id;
    this.code = settings.code;
    this.hostId = hostId;
    this.players = new Map();
    this.maxPlayers = settings.maxPlayers || 8;
    this.gameMode = settings.gameMode;
    this.timeLimit = settings.timeLimit;
    this.questionCount = settings.questionCount;
    this.topic = settings.topic;
    this.status = 'waiting';
    this.questions = [];
    this.createdAt = new Date();
  }

  addPlayer(playerId, username) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Lobby is full');
    }
    
    if (Array.from(this.players.values()).some(p => p.username === username)) {
      throw new Error('Username already taken');
    }

    this.players.set(playerId, {
      username,
      score: 0,
      currentQuestion: 0,
      isHost: playerId === this.hostId,
      connected: true
    });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  isHost(playerId) {
    return playerId === this.hostId;
  }

  setQuestions(questions) {
    this.questions = questions;
  }
} 