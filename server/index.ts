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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// Rate limiting is handled in server/auth.ts (apiRateLimiter applied to /api)

const isProduction = process.env.NODE_ENV === "production";

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
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

import { registerExtendedRoutes } from "./routes_extension";

(async () => {
  // CRITICAL: registerRoutes MUST be called first to initialize passport middleware
  const server = registerRoutes(app);
  // Now register extended routes after auth is set up
  registerExtendedRoutes(app);

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

  if (isProduction) {
    const distPath = path.resolve(__dirname, "../dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("/{*path}", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  const port = isProduction ? 5000 : 3001;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}${isProduction ? " (production)" : ""}`);
  });
})();
