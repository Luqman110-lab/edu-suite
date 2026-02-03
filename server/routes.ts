import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

import { registerExtendedRoutes } from "./routes_extension";
import { setupPublicRoutes } from "./publicRoutes";

export function registerRoutes(app: Express): Server {
    // Setup authentication routes (login, logout, session, etc.)
    setupAuth(app);

    // Setup public routes (no authentication required)
    setupPublicRoutes(app);

    // Register extended routes (API endpoints)
    registerExtendedRoutes(app);

    // Health check endpoint
    app.get("/api/health", (_req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    const httpServer = createServer(app);
    return httpServer;
}
