# Replit Agent Instructions: Quiz Game Backend

## PROJECT SETUP

```bash
# Initialize new Node.js project
npm init -y

# Required dependencies
npm install express socket.io @socket.io/redis-adapter redis cors dotenv
```

## CORE STRUCTURE
```
/quiz-backend
├── .env
├── server.js
├── /src
│   ├── /socket
│   │   ├── socketManager.js
│   │   ├── gameHandlers.js
│   │   └── lobbyHandlers.js
│   ├── /models
│   │   ├── Lobby.js
│   │   └── Game.js
│   └── /utils
│       ├── codeGenerator.js
│       └── scoreCalculator.js
```

## SERVER IMPLEMENTATION

### 1. Basic Server Setup (server.js)
```javascript
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Redis = require('redis');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Socket Manager (src/socket/socketManager.js)
```javascript
const lobbies = new Map();

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Lobby Events
    socket.on('create-lobby', handleCreateLobby);
    socket.on('join-lobby', handleJoinLobby);
    socket.on('start-game', handleStartGame);
    socket.on('leave-lobby', handleLeaveLobby);

    // Game Events
    socket.on('submit-answer', handleSubmitAnswer);
    socket.on('disconnect', handleDisconnect);
  });
}
```

### 3. Game Logic (src/models/Game.js)
```javascript
class Game {
  constructor(settings) {
    this.mode = settings.gameMode;
    this.timeLimit = settings.timeLimit;
    this.currentQuestion = 0;
    this.scores = new Map();
    this.status = 'waiting';
    this.startTime = null;
  }

  calculateScore(timeElapsed) {
    const halfTime = this.timeLimit / 2;
    if (timeElapsed <= halfTime) {
      return 100 - ((timeElapsed / halfTime) * 50);
    }
    return 50;
  }
}
```

## REQUIRED ENVIRONMENT VARIABLES
```
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_URL=your-redis-url
```

## IMPLEMENTATION REQUIREMENTS

### 1. Lobby Management
- Generate unique 6-digit codes
- Handle player joins/leaves
- Maintain lobby state
- Handle host disconnection

### 2. Game State Management
- Track current questions
- Calculate scores
- Handle time limits
- Manage player progress

### 3. Real-time Communication
- Broadcast score updates
- Sync question progression
- Handle disconnections
- Manage game completion

### 4. Error Handling
- Invalid lobby codes
- Full lobbies
- Duplicate usernames
- Connection issues

## SCALING CONSIDERATIONS
1. Implement Redis for state management
2. Add request rate limiting
3. Implement proper error logging
4. Add monitoring endpoints
