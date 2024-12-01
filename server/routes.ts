import type { Express } from "express";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from './socket/socketManager';

export function registerRoutes(app: Express, httpServer: ReturnType<typeof createServer>) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Initialize Socket.IO manager
  new SocketManager(io);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', socketIO: 'initialized' });
  });
}
