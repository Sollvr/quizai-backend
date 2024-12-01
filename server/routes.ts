import type { Express } from "express";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from './socket/socketManager';

export function registerRoutes(app: Express, httpServer: ReturnType<typeof createServer>) {
  console.log('Registering routes...');
  // Initialize Socket.IO before routes
  const io = new Server(httpServer, {
    path: '/socket.io/',  // Added trailing slash
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true,
    pingTimeout: 60000
  });

  // Debug logging for Socket.IO events
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  // Enable debug mode for Socket.IO
  io.engine.on('connection', (socket) => {
    console.log('New connection:', socket.id);
  });

  // Initialize Socket.IO manager
  new SocketManager(io);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      socketIO: 'initialized',
      connections: io.engine.clientsCount
    });
  });
}
