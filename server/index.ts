import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Trust proxy is handled in server/auth.ts setupAuth()

app.use(helmet({
  contentSecurityPolicy: false, // Disable default CSP to allow inline scripts/styles if needed
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));

// Serve Uploads - IMPORTANT: Allow access to uploaded files
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Rate limiting is handled in server/auth.ts

const isProduction = process.env.NODE_ENV === "production";

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// CRITICAL: registerRoutes MUST be called first to initialize passport middleware
const server = registerRoutes(app);

// Initialize WebSocket Server (ONLY if not on Vercel)
// Vercel Serverless doesn't support long-running WS connections
if (!process.env.VERCEL) {
  import("./websocket").then(({ setupWebSocket }) => {
    setupWebSocket(server);
  }).catch(err => console.error("Failed to load websocket:", err));
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  console.error("Error:", err);

  let message = "Internal Server Error";

  if (status < 500) {
    message = err.message || message;
  } else if (!isProduction) {
    message = err.message || message;
  }

  res.status(status).json({ message });
});

// Only start listening if this file is run directly (not imported)
import { realpathSync } from 'fs';

const isMainModule = () => {
  try {
    const currentPath = fileURLToPath(import.meta.url);
    // process.argv[1] is the file path executed by node
    const executedPath = process.argv[1];
    return currentPath === executedPath ||
      currentPath === realpathSync(executedPath);
  } catch (e) {
    return false;
  }
};

if (isMainModule()) {
  if (isProduction) {
    // In Docker, WORKDIR is /app. dist is at /app/dist.
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Checking for dist at: ${distPath}`);

    if (fs.existsSync(distPath)) {
      console.log(`Serving static files from ${distPath}`);
      app.use(express.static(distPath));
      // Fallback for SPA
      app.use((_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.error(`Dist directory not found at ${distPath}. CWD: ${process.cwd()}`);
    }
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : (isProduction ? 5000 : 3001);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}${isProduction ? " (production)" : ""}`);
  });
}

export default app;
