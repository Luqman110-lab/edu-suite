import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth } from "./auth";


import { setupPublicRoutes } from "./publicRoutes";

// Domain route modules
import { studentRoutes } from "./routes/students";        // absolute paths: /students, /students/:id
import { dashboardRoutes } from "./routes/dashboard";     // relative paths: /stats, /revenue-trends
import { teacherRoutes } from "./routes/teachers";        // relative paths: /, /:id
import { feesRoutes } from "./routes/fees";               // absolute paths: /fee-structures, /invoices
import { expensesRoutes } from "./routes/expenses";       // relative paths: /, /categories
import { attendanceRoutes } from "./routes/attendance";   // absolute paths: /gate-attendance, /attendance-settings
import { boardingRoutes } from "./routes/boarding";       // absolute paths: /boarding-stats, /dormitories, /visitor-logs
import { adminRoutes } from "./routes/admin";             // absolute paths: /settings, /users, /schools
import { notificationsRoutes } from "./routes/notifications"; // absolute paths: /notifications/subscribe, /events, /program-items
import { academicRoutes } from "./routes/academic";       // absolute paths: /test-sessions
import { biometricRoutes } from "./routes/biometrics";   // absolute paths: /face-embeddings
import { conversationRoutes } from "./routes/conversations"; // absolute paths: /conversations, /messaging/users, /upload
import { archiveRoutes } from "./routes/archive";         // absolute paths: /archive/years, /archive/students
import { accountingRoutes } from "./routes/accounting";
import { classesRoutes } from "./routes/classes";
import hrRoutes from "./routes/hr";              // absolute paths: /leave, /duty-roster
import p7Routes from "./routes/p7";
import { marksRoutes } from "./routes/marks";
import { teacherAttendanceRoutes } from "./routes/teacher-attendance";

export function registerRoutes(app: Express): Server {
    // Setup authentication routes (login, logout, session, etc.)
    setupAuth(app);

    // Setup public routes (no authentication required)
    setupPublicRoutes(app);

    // ── Domain route modules ──────────────────────────────────────────────────
    app.use("/api", studentRoutes);
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/api/teachers", teacherRoutes);
    app.use("/api", feesRoutes);
    app.use("/api/expenses", expensesRoutes);
    app.use("/api", attendanceRoutes);
    app.use("/api", boardingRoutes);
    app.use("/api", adminRoutes);
    app.use("/api", notificationsRoutes);
    app.use("/api", academicRoutes);
    app.use("/api", biometricRoutes);
    app.use("/api", conversationRoutes);
    app.use("/api", archiveRoutes);
    app.use("/api/accounting", accountingRoutes);
    app.use("/api", classesRoutes);
    app.use("/api/hr", requireAuth, hrRoutes);
    app.use("/api", requireAuth, p7Routes);
    app.use("/api", requireAuth, marksRoutes);
    app.use("/api", requireAuth, teacherAttendanceRoutes);
    // ─────────────────────────────────────────────────────────────────────────



    // Health check endpoint
    app.get("/api/health", (_req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    const httpServer = createServer(app);
    return httpServer;
}

