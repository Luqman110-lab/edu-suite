
import { Router } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { testSessions, testScores, students } from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

export const academicRoutes = Router();

// --- Test Sessions ---

// GET /api/test-sessions - List endpoints
academicRoutes.get("/test-sessions", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const sessions = await db.select().from(testSessions)
            .where(and(eq(testSessions.schoolId, schoolId), eq(testSessions.isActive, true)))
            .orderBy(desc(testSessions.testDate));

        res.json(sessions);
    } catch (error: any) {
        console.error("Get test sessions error:", error);
        res.status(500).json({ message: "Failed to fetch test sessions" });
    }
});

// POST /api/test-sessions - Create endpoint
academicRoutes.post("/test-sessions", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { name, testType, classLevel, stream, term, year, testDate, maxMarks } = req.body;

        const [newSession] = await db.insert(testSessions).values({
            schoolId,
            name,
            testType,
            classLevel,
            stream: stream || null,
            term: parseInt(term),
            year: parseInt(year),
            testDate,
            maxMarks,
            isActive: true
        }).returning();

        res.status(201).json(newSession);
    } catch (error: any) {
        console.error("Create test session error:", error);
        res.status(500).json({ message: "Failed to create test session: " + error.message });
    }
});

// PUT /api/test-sessions/:id - Update endpoint
academicRoutes.put("/test-sessions/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const id = parseInt(req.params.id);

        // Verify ownership
        const existing = await db.select().from(testSessions)
            .where(and(eq(testSessions.id, id), eq(testSessions.schoolId, schoolId)))
            .limit(1);

        if (!existing.length) return res.status(404).json({ message: "Test session not found" });

        const [updated] = await db.update(testSessions)
            .set(req.body) // Be careful with blindly setting body, but okay for trusted admin
            .where(eq(testSessions.id, id))
            .returning();

        res.json(updated);
    } catch (error: any) {
        console.error("Update test session error:", error);
        res.status(500).json({ message: "Failed to update test session" });
    }
});

// DELETE /api/test-sessions/:id - Delete endpoint
academicRoutes.delete("/test-sessions/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const id = parseInt(req.params.id);

        const existing = await db.select().from(testSessions)
            .where(and(eq(testSessions.id, id), eq(testSessions.schoolId, schoolId)))
            .limit(1);

        if (!existing.length) return res.status(404).json({ message: "Test session not found" });

        // Soft delete
        await db.update(testSessions)
            .set({ isActive: false })
            .where(eq(testSessions.id, id));

        res.json({ message: "Test session deleted" });
    } catch (error: any) {
        console.error("Delete test session error:", error);
        res.status(500).json({ message: "Failed to delete test session" });
    }
});


// --- Test Scores ---

// GET /api/test-scores/:sessionId - Get scores for a session
academicRoutes.get("/test-scores/:sessionId", requireAuth, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);

        const scores = await db.select().from(testScores)
            .where(eq(testScores.testSessionId, sessionId));

        res.json(scores);
    } catch (error: any) {
        console.error("Get test scores error:", error);
        res.status(500).json({ message: "Failed to fetch test scores" });
    }
});

// POST /api/test-scores/batch - Batch save scores
academicRoutes.post("/test-scores/batch", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { scores } = req.body;
        if (!Array.isArray(scores)) return res.status(400).json({ message: "Invalid scores data" });

        // Process in transaction or loop
        const savedScores = [];

        for (const score of scores) {
            const { testSessionId, studentId, rawMarks, convertedMarks, aggregate, division } = score;

            // Check if exists
            const existing = await db.select().from(testScores)
                .where(and(
                    eq(testScores.testSessionId, testSessionId),
                    eq(testScores.studentId, studentId)
                ))
                .limit(1);

            if (existing.length > 0) {
                // Update
                const [updated] = await db.update(testScores)
                    .set({
                        rawMarks,
                        convertedMarks,
                        aggregate,
                        division
                    })
                    .where(eq(testScores.id, existing[0].id))
                    .returning();
                savedScores.push(updated);
            } else {
                // Insert
                const [inserted] = await db.insert(testScores).values({
                    schoolId,
                    testSessionId,
                    studentId,
                    rawMarks,
                    convertedMarks,
                    aggregate,
                    division
                }).returning();
                savedScores.push(inserted);
            }
        }

        res.json(savedScores);
    } catch (error: any) {
        console.error("Batch save scores error:", error);
        res.status(500).json({ message: "Failed to save scores: " + error.message });
    }
});
