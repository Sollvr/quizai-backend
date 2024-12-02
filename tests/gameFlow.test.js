import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const ENDPOINT = `http://localhost:${process.env.PORT || 5000}`;

function createSocketClient(username) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to connect ${username} to ${ENDPOINT}`);
    
    const socket = io(ENDPOINT, {
      transports: ['polling', 'websocket'],
      withCredentials: false,
      forceNew: true,
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      path: '/socket.io/',
      extraHeaders: {
        'User-Agent': 'SocketIOTestClient'
      }
    });

    let timeoutId = setTimeout(() => {
      socket.close();
      reject(new Error(`Connection timeout for ${username}`));
    }, 10000);

    socket.on('connect_error', (error) => {
      console.error(`Connection error for ${username}:`, error.message, error);
    });

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      console.log(`${username} connected with ID: ${socket.id}`);
      resolve(socket);
    });

    socket.on('disconnect', (reason) => {
      console.log(`${username} disconnected:`, reason);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${username}:`, error);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`${username} attempting to reconnect... (attempt ${attemptNumber})`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`${username} reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_error', (error) => {
      console.error(`Reconnection error for ${username}:`, error);
    });

    socket.on('reconnect_failed', () => {
      console.error(`${username} failed to reconnect after all attempts`);
    });
  });
}

async function testGameFlow() {
  try {
    // Create host socket
    const hostSocket = await createSocketClient('Host');
    
    // Create lobby with correct data types
    const lobbySettings = {
      username: 'Host',
      maxPlayers: 2,
      gameMode: 'synchronized',
      timeLimit: 30,
      questionCount: 2,
      topic: 'JavaScript'
    };

    console.log('Creating lobby with settings:', lobbySettings);

    // Host creates lobby
    hostSocket.emit('create-lobby', lobbySettings);
    
    const lobbyCode = await new Promise((resolve, reject) => {
      hostSocket.once('lobby-created', (data) => {
        console.log('Lobby created:', data.code);
        resolve(data.code);
      });

      hostSocket.once('error', (error) => {
        console.error('Error creating lobby:', error);
        reject(error);
      });

      // Add timeout
      setTimeout(() => reject(new Error('Timeout waiting for lobby creation')), 5000);
    });

    // Create player socket
    const playerSocket = await createSocketClient('Player1');
    
    // Player joins lobby
    playerSocket.emit('join-lobby', {
      code: lobbyCode,
      username: 'Player1'
    });

    // Wait for player to join
    await new Promise(resolve => {
      playerSocket.once('lobby-joined', (data) => {
        console.log('Player joined lobby');
        resolve();
      });
    });

    // Host starts game
    hostSocket.emit('start-game', lobbyCode);

    // Handle game events for both players
    [hostSocket, playerSocket].forEach(socket => {
      socket.on('game-started', (data) => {
        console.log('Game started, first question:', data.question);
        
        // Simulate answering after 2 seconds
        setTimeout(() => {
          socket.emit('submit-answer', {
            code: lobbyCode,
            answer: data.question.options[0] // Just pick first option
          });
        }, 2000);
      });

      socket.on('answer-result', (result) => {
        console.log('Answer result:', result);
      });

      socket.on('round-complete', (data) => {
        console.log('Round complete:', data);
      });

      socket.on('next-question', (data) => {
        console.log('Next question:', data);
        
        // Simulate answering next question
        setTimeout(() => {
          socket.emit('submit-answer', {
            code: lobbyCode,
            answer: data.question.options[0]
          });
        }, 2000);
      });

      socket.on('game-complete', (data) => {
        console.log('Game complete! Final leaderboard:', data.finalLeaderboard);
        socket.disconnect();
      });

      socket.on('error', (error) => {
        console.error('Error:', error.message);
      });
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
console.log('Starting game flow test...');
testGameFlow(); 