import { Server, Socket } from 'socket.io';
import { Lobby } from '../models/Lobby';
import { generateLobbyCode } from '../utils/codeGenerator';

export class LobbyHandlers {
  private io: Server;
  private activeLobbies: Map<string, Lobby> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  public async handleCreateLobby(socket: Socket, data: { username: string }) {
    const lobbyCode = await generateLobbyCode();
    const lobby = new Lobby(lobbyCode, socket.id, data.username);
    
    this.activeLobbies.set(lobbyCode, lobby);
    socket.join(lobbyCode);
    
    socket.emit('lobby-created', {
      code: lobbyCode,
      hostId: socket.id,
      players: lobby.getPlayers()
    });
  }

  public handleJoinLobby(socket: Socket, data: { code: string; username: string }) {
    const lobby = this.activeLobbies.get(data.code);
    
    if (!lobby) {
      socket.emit('error', { message: 'Invalid lobby code' });
      return;
    }

    if (lobby.isFull()) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    if (lobby.hasPlayer(data.username)) {
      socket.emit('error', { message: 'Username already taken' });
      return;
    }

    lobby.addPlayer(socket.id, data.username);
    socket.join(data.code);

    // Notify all players in the lobby
    this.io.to(data.code).emit('player-joined', {
      players: lobby.getPlayers()
    });
  }

  public handleLeaveLobby(socket: Socket) {
    const lobby = this.getLobbyBySocket(socket);
    if (!lobby) return;

    if (lobby.isHost(socket.id)) {
      // If host leaves, end the lobby
      this.io.to(lobby.code).emit('lobby-ended', {
        message: 'Host has left the lobby'
      });
      this.activeLobbies.delete(lobby.code);
    } else {
      lobby.removePlayer(socket.id);
      this.io.to(lobby.code).emit('player-left', {
        players: lobby.getPlayers()
      });
    }

    socket.leave(lobby.code);
  }

  public handleStartGame(socket: Socket) {
    const lobby = this.getLobbyBySocket(socket);
    if (!lobby || !lobby.isHost(socket.id)) return;

    if (lobby.getPlayerCount() < 2) {
      socket.emit('error', { message: 'Not enough players to start' });
      return;
    }

    this.io.to(lobby.code).emit('game-starting', {
      players: lobby.getPlayers()
    });
  }

  private getLobbyBySocket(socket: Socket): Lobby | undefined {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    return roomId ? this.activeLobbies.get(roomId) : undefined;
  }
}
