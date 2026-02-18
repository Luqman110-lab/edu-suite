import { Router } from "express";
import { dashboardService } from "../services/DashboardService";
import { requireAuth, getActiveSchoolId } from "../auth";

export const dashboardRoutes = Router();

// GET /api/dashboard/stats
dashboardRoutes.get("/stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const stats = await dashboardService.getStats(schoolId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/revenue-trends
dashboardRoutes.get("/revenue-trends", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const trends = await dashboardService.getRevenueTrends(schoolId);
        res.json(trends);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
});

// GET /api/dashboard/demographics
dashboardRoutes.get("/demographics", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const demographics = await dashboardService.getDemographics(schoolId);
        res.json(demographics);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/academic-performance
dashboardRoutes.get("/academic-performance", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const performance = await dashboardService.getAcademicPerformance(schoolId);
        res.json(performance);
    } catch (error: any) {
        console.error("Academic performance error:", error);
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/upcoming-events
dashboardRoutes.get("/upcoming-events", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const events = await dashboardService.getUpcomingEvents(schoolId);
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});
