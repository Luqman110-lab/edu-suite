import { Router } from "express";
import { marksService } from "../services/MarksService";
import { requireAuth, getActiveSchoolId } from "../auth";

export const marksRoutes = Router();

// GET /api/marks
marksRoutes.get("/marks", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const yearParam = req.query.year as string;
        const year = yearParam ? parseInt(yearParam) : undefined;

        const results = await marksService.getMarks(schoolId, year);
        res.json(results);
    } catch (error: any) {
        console.error("Get marks error:", error);
        res.status(500).json({ message: "Failed to fetch marks" });
    }
});

// POST /api/marks
marksRoutes.post("/marks", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const saved = await marksService.saveMark(schoolId, req.body);
        res.status(201).json(saved);
    } catch (error: any) {
        console.error("Save mark error:", error);
        res.status(500).json({ message: "Failed to save mark: " + error.message });
    }
});

// POST /api/marks/batch
marksRoutes.post("/marks/batch", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { marks } = req.body;
        if (!Array.isArray(marks)) return res.status(400).json({ message: "Invalid marks array" });

        const saved = await marksService.saveMarksBatch(schoolId, marks);
        res.status(201).json(saved);
    } catch (error: any) {
        console.error("Batch save marks error:", error);
        res.status(500).json({ message: "Failed to batch save marks: " + error.message });
    }
});

// DELETE /api/marks/batch
marksRoutes.delete("/marks/batch", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { studentIds, term, year, type } = req.body;
        if (!Array.isArray(studentIds) || term == null || year == null || type == null) {
            return res.status(400).json({ message: "Missing generic required parameters" });
        }

        const result = await marksService.deleteMarksBatch(schoolId, studentIds, parseInt(term as string), parseInt(year as string), type);
        res.json({ ...result, requested: studentIds.length, message: `Successfully deleted ${result.deleted} marks records` });
    } catch (error: any) {
        console.error("Delete marks error:", error);
        res.status(500).json({ message: "Failed to delete marks: " + error.message });
    }
});
