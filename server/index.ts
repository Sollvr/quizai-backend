import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

const app = express();
const httpServer = createServer(app);

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS middleware for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Use the already created httpServer instance
  console.log('Setting up routes...');
  registerRoutes(app, httpServer);

  // Set up Vite middleware after routes in development
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log WebSocket related errors separately
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
      log(`WebSocket Error: ${err.code} - ${message}`);
    } else {
      log(`Error: ${message}`);
    }

    res.status(status).json({ message });
  });

  // WebSocket specific error handling
  httpServer.on('error', (err: Error) => {
    log(`WebSocket Server Error: ${err.message}`);
  });

  // Add explicit upgrade handling for WebSocket connections
  httpServer.on('upgrade', (request, socket, head) => {
    log('WebSocket upgrade requested');
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  
  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(PORT, "0.0.0.0", () => {
        log(`Server running on port ${PORT}`);
        resolve();
      });

      httpServer.on('error', (err) => {
        log(`Failed to start server: ${err.message}`);
        reject(err);
      });

      // Handle process termination
      process.on('SIGTERM', () => {
        log('SIGTERM received. Shutting down gracefully...');
        httpServer.close(() => {
          log('Server closed');
          process.exit(0);
        });
      });
    });
  } catch (err) {
    log(`Critical error starting server: ${err}`);
    process.exit(1);
  }
})();
