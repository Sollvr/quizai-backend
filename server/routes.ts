import type { Express } from "express";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from './socket/socketManager';

export function registerRoutes(app: Express, httpServer: ReturnType<typeof createServer>) {
  // Initialize Socket.IO before routes
  const io = new Server(httpServer, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    },
    pingTimeout: 20000,
    pingInterval: 25000
  });

  // Debug logging for Socket.IO events
  io.engine.on('connection_error', (err) => {
    console.log('Socket.IO connection error:', {
      type: err.type,
      message: err.message,
      context: err.context
    });
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
