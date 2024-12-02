import type { Express } from "express";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from './socket/socketManager';

export function registerRoutes(app: Express, httpServer: ReturnType<typeof createServer>) {
  console.log('Registering routes...');
  // Initialize Socket.IO before routes
  const io = new Server(httpServer, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    allowEIO3: true,
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Add more detailed connection logging
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
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
