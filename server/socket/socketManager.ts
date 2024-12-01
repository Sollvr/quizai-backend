import { Server, Socket } from 'socket.io';
import { GameHandlers } from './gameHandlers';
import { LobbyHandlers } from './lobbyHandlers';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../config/redis';

export class SocketManager {
  private io: Server;
  private gameHandlers: GameHandlers;
  private lobbyHandlers: LobbyHandlers;

  constructor(io: Server) {
    this.io = io;
    this.gameHandlers = new GameHandlers(io);
    this.lobbyHandlers = new LobbyHandlers(io);
    this.setupRedisAdapter();
    this.setupConnectionHandlers();
  }

  private async setupRedisAdapter() {
    try {
      const pubClient = await getRedisClient();
      if (pubClient && pubClient.isOpen) {
        const subClient = pubClient.duplicate();
        await subClient.connect();
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log('Redis adapter setup successful');
      } else {
        console.log('Using default in-memory adapter');
      }
    } catch (err) {
      console.log('Using default in-memory adapter');
    }
  }

  private setupConnectionHandlers() {
    this.io.engine.on('connection_error', (err) => {
      console.log('Socket.IO connection error:', {
        type: err.type,
        message: err.message,
        context: err.context
      });
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', {
        id: socket.id,
        transport: socket.conn.transport.name,
        handshake: {
          headers: socket.handshake.headers,
          query: socket.handshake.query,
          time: new Date().toISOString()
        }
      });

      // Ping/Pong for connection testing
      socket.on('ping', (callback) => {
        console.log('Ping received from:', socket.id);
        callback({ status: 'pong', timestamp: Date.now() });
      });

      // Lobby Events
      socket.on('create-lobby', (data) => this.lobbyHandlers.handleCreateLobby(socket, data));
      socket.on('join-lobby', (data) => this.lobbyHandlers.handleJoinLobby(socket, data));
      socket.on('leave-lobby', () => this.lobbyHandlers.handleLeaveLobby(socket));
      socket.on('start-game', () => this.lobbyHandlers.handleStartGame(socket));

      // Game Events
      socket.on('submit-answer', (data) => this.gameHandlers.handleSubmitAnswer(socket, data));
      socket.on('next-question', () => this.gameHandlers.handleNextQuestion(socket));
      socket.on('end-game', () => this.gameHandlers.handleEndGame(socket));

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleDisconnect(socket: Socket) {
    console.log('Client disconnected:', socket.id);
    this.lobbyHandlers.handleLeaveLobby(socket);
  }
}
