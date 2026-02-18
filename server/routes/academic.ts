import { Router } from "express";
import { academicService } from "../services/AcademicService";
import { requireAuth, getActiveSchoolId } from "../auth";

export const academicRoutes = Router();

// --- Test Sessions ---

// GET /api/test-sessions
academicRoutes.get("/test-sessions", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const sessions = await academicService.getTestSessions(schoolId);
        res.json(sessions);
    } catch (error: any) {
        console.error("Get test sessions error:", error);
        res.status(500).json({ message: "Failed to fetch test sessions" });
    }
});

// POST /api/test-sessions
academicRoutes.post("/test-sessions", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const newSession = await academicService.createTestSession(schoolId, req.body);
        res.status(201).json(newSession);
    } catch (error: any) {
        console.error("Create test session error:", error);
        res.status(500).json({ message: "Failed to create test session: " + error.message });
    }
});

// PUT /api/test-sessions/:id
academicRoutes.put("/test-sessions/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(req.params.id as string);

        const updated = await academicService.updateTestSession(id, schoolId, req.body);
        res.json(updated);
    } catch (error: any) {
        if (error.message === "Test session not found") return res.status(404).json({ message: error.message });
        console.error("Update test session error:", error);
        res.status(500).json({ message: "Failed to update test session" });
    }
});

// DELETE /api/test-sessions/:id
academicRoutes.delete("/test-sessions/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(req.params.id as string);

        const success = await academicService.deleteTestSession(id, schoolId);
        res.json({ message: "Test session deleted" });
    } catch (error: any) {
        if (error.message === "Test session not found") return res.status(404).json({ message: error.message });
        console.error("Delete test session error:", error);
        res.status(500).json({ message: "Failed to delete test session" });
    }
});

// --- Test Scores ---

// GET /api/test-scores/:sessionId
academicRoutes.get("/test-scores/:sessionId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const sessionId = parseInt(req.params.sessionId as string);

        const scores = await academicService.getTestScores(sessionId, schoolId);
        res.json(scores);
    } catch (error: any) {
        if (error.message === "Test session not found") return res.status(404).json({ message: error.message });
        console.error("Get test scores error:", error);
        res.status(500).json({ message: "Failed to fetch test scores" });
    }
});

// POST /api/test-scores/batch
academicRoutes.post("/test-scores/batch", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { scores } = req.body;
        if (!Array.isArray(scores)) return res.status(400).json({ message: "Invalid scores data" });

        const savedScores = await academicService.batchSaveTestScores(schoolId, scores);
        res.json(savedScores);
    } catch (error: any) {
        console.error("Batch save scores error:", error);
        res.status(500).json({ message: "Failed to save scores: " + error.message });
    }
});
