import { Server, Socket } from 'socket.io';
import { Game } from '../models/Game';
import { calculateScore } from '../utils/scoreCalculator';

export class GameHandlers {
  private io: Server;
  private activeGames: Map<string, Game> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  public handleSubmitAnswer(socket: Socket, data: { answer: string; timeElapsed: number }) {
    const game = this.getGameBySocket(socket);
    if (!game) return;

    const score = calculateScore(data.timeElapsed, game.timeLimit);
    game.addPlayerScore(socket.id, score);

    // Broadcast score update to all players in the room
    this.io.to(game.roomId).emit('score-update', {
      playerId: socket.id,
      score,
      totalScore: game.getPlayerTotalScore(socket.id)
    });
  }

  public handleNextQuestion(socket: Socket) {
    const game = this.getGameBySocket(socket);
    if (!game || !game.isHost(socket.id)) return;

    if (game.moveToNextQuestion()) {
      this.io.to(game.roomId).emit('question-update', {
        questionNumber: game.currentQuestion,
        totalQuestions: game.totalQuestions
      });
    } else {
      this.handleEndGame(socket);
    }
  }

  public handleEndGame(socket: Socket) {
    const game = this.getGameBySocket(socket);
    if (!game) return;

    const finalScores = game.getFinalScores();
    this.io.to(game.roomId).emit('game-end', { finalScores });
    this.activeGames.delete(game.roomId);
  }

  private getGameBySocket(socket: Socket): Game | undefined {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    return roomId ? this.activeGames.get(roomId) : undefined;
  }

  public createGame(roomId: string, settings: any): Game {
    const game = new Game(roomId, settings);
    this.activeGames.set(roomId, game);
    
    // Broadcast initial game state
    this.io.to(roomId).emit('game-state-update', game.getGameStatus());
    
    // Start game after a short delay
    setTimeout(() => {
      game.setState('starting');
      this.io.to(roomId).emit('game-state-update', game.getGameStatus());
      
      // Move to in_progress after countdown
      setTimeout(() => {
        game.setState('in_progress');
        this.io.to(roomId).emit('game-state-update', game.getGameStatus());
      }, 3000); // 3 second countdown
    }, 1000);
    
    return game;
  }

  public handleGameStatus(socket: Socket) {
    const game = this.getGameBySocket(socket);
    if (!game) return;
    
    socket.emit('game-state-update', game.getGameStatus());
  }
}
