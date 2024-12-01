import type { Express } from "express";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from './socket/socketManager';

export function registerRoutes(app: Express, httpServer: ReturnType<typeof createServer>) {
  console.log('Registering routes...');
  // Initialize Socket.IO before routes
  const io = new Server(httpServer, {
    path: '/socket.io',  // Remove trailing slash
    transports: ['polling', 'websocket'],  // Try polling first
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Add more detailed connection logging
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', {
      type: err.type,
      message: err.message,
      context: err.context,
      req: err.req ? {
        url: err.req.url,
        headers: err.req.headers,
        method: err.req.method,
      } : null
    });
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
