import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocket } from './src/socket/socketManager.js';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ["GET", "POST"],
  credentials: true
}));

const httpServer = createServer(app);

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"]
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
  path: '/socket.io/'
});

// Debug Socket.IO events
io.engine.on("connection_error", (err) => {
  console.log("Connection error details:", {
    code: err.code,
    message: err.message,
    context: err.context,
    type: err.type
  });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Initialize socket handlers
initializeSocket(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 