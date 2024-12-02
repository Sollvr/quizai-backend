import { handleCreateLobby, handleJoinLobby } from './lobbyHandlers.js';
import { handleStartGame, handleSubmitAnswer } from './gameHandlers.js';

const lobbies = new Map();

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Lobby Events
    socket.on('create-lobby', (data) => handleCreateLobby(socket, io, lobbies, data));
    socket.on('join-lobby', (data) => handleJoinLobby(socket, io, lobbies, data));
    
    // Game Events
    socket.on('start-game', (code) => handleStartGame(socket, io, lobbies, code));
    socket.on('submit-answer', (data) => handleSubmitAnswer(socket, io, lobbies, data));

    socket.on('disconnect', () => {
      // Find and handle player disconnection from any lobby
      for (const [code, instance] of lobbies.entries()) {
        const isLobby = instance.hasOwnProperty('status') && instance.status === 'waiting';
        const isGame = instance.hasOwnProperty('status') && instance.status === 'in_progress';
        
        if (instance.players && instance.players.has(socket.id)) {
          if (isLobby) {
            // Handle lobby disconnection
            if (instance.hostId === socket.id) {
              console.log('Host disconnected:', socket.id, 'Reason:', socket.disconnected ? 'client disconnect' : 'server disconnect');
              io.to(code).emit('lobby-closed', { message: 'Host has disconnected' });
              lobbies.delete(code);
            } else {
              console.log('Player disconnected:', socket.id, 'Reason:', socket.disconnected ? 'client disconnect' : 'server disconnect');
              instance.removePlayer(socket.id);
              io.to(code).emit('player-left', {
                players: Array.from(instance.players.values())
              });
            }
          } else if (isGame) {
            // Handle game disconnection
            const playerData = instance.players.get(socket.id);
            console.log(`${playerData.username} disconnected: ${socket.disconnected ? 'io client disconnect' : 'io server disconnect'}`);
            
            // Mark player as disconnected but don't remove them
            if (playerData) {
              playerData.connected = false;
            }

            // Notify other players
            io.to(code).emit('player-disconnected', {
              playerId: socket.id,
              username: playerData ? playerData.username : 'Unknown',
              players: Array.from(instance.players.values())
            });
          }
          break;
        }
      }
    });
  });
} 