import { Router } from "express";
import { ClassService } from "../services/ClassService";
import { requireAuth, getActiveSchoolId } from "../auth";

export const classesRoutes = Router();

// ==========================================
// STREAM MANAGEMENT
// ==========================================

// Get all streams for a school
classesRoutes.get("/streams", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const streams = await ClassService.getStreams(schoolId);
        res.json(streams);
    } catch (error: any) {
        console.error("Error fetching streams:", error);
        res.status(500).json({ message: error.message || "Failed to fetch streams" });
    }
});

// Create a new stream
classesRoutes.post("/streams", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const { classLevel, streamName, maxCapacity } = req.body;

        if (!classLevel || !streamName) {
            return res.status(400).json({ message: "classLevel and streamName are required" });
        }

        const newStream = await ClassService.createStream(
            schoolId,
            classLevel,
            streamName,
            maxCapacity ? Number(maxCapacity) : 60
        );

        res.status(201).json(newStream);
    } catch (error: any) {
        console.error("Error creating stream:", error);
        res.status(500).json({ message: error.message || "Failed to create stream" });
    }
});

// Update stream capacity
classesRoutes.put("/streams/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const id = parseInt(req.params.id);
        const { maxCapacity } = req.body;

        if (isNaN(id) || maxCapacity === undefined) {
            return res.status(400).json({ message: "Valid ID and maxCapacity are required" });
        }

        const updated = await ClassService.updateStreamCapacity(id, schoolId, Number(maxCapacity));
        res.json(updated);
    } catch (error: any) {
        console.error("Error updating stream:", error);
        res.status(500).json({ message: error.message || "Failed to update stream" });
    }
});

// Delete a stream
classesRoutes.delete("/streams/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Valid ID is required" });
        }

        await ClassService.deleteStream(id, schoolId);
        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting stream:", error);
        res.status(500).json({ message: error.message || "Failed to delete stream" });
    }
});

// ==========================================
// TEACHER ASSIGNMENTS
// ==========================================

// Get teacher assignments
classesRoutes.get("/class-assignments", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const { term, year } = req.query;
        if (!term || !year) {
            return res.status(400).json({ message: "term and year are required query parameters" });
        }

        const assignments = await ClassService.getAssignments(
            schoolId,
            Number(term),
            Number(year)
        );

        res.json(assignments);
    } catch (error: any) {
        console.error("Error fetching assignments:", error);
        res.status(500).json({ message: error.message || "Failed to fetch assignments" });
    }
});

// Assign class teacher
classesRoutes.post("/class-assignments", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const { teacherId, classLevel, stream, term, year } = req.body;

        if (!teacherId || !classLevel || !stream || !term || !year) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const assignment = await ClassService.assignClassTeacher(
            schoolId,
            Number(teacherId),
            classLevel,
            stream,
            Number(term),
            Number(year)
        );

        res.status(201).json(assignment);
    } catch (error: any) {
        console.error("Error creating assignment:", error);
        res.status(500).json({ message: error.message || "Failed to create assignment" });
    }
});

// Assign subject teacher
classesRoutes.post("/class-assignments/subject", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const { teacherId, classLevel, stream, subject, term, year } = req.body;

        if (!teacherId || !classLevel || !stream || !subject || !term || !year) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const assignment = await ClassService.assignSubjectTeacher(
            schoolId,
            Number(teacherId),
            classLevel,
            stream,
            subject,
            Number(term),
            Number(year)
        );

        res.status(201).json(assignment);
    } catch (error: any) {
        console.error("Error creating subject assignment:", error);
        res.status(500).json({ message: error.message || "Failed to create subject assignment" });
    }
});

// Remove teacher assignment
classesRoutes.delete("/class-assignments/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Valid ID is required" });
        }

        await ClassService.removeAssignment(id, schoolId);
        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting assignment:", error);
        res.status(500).json({ message: error.message || "Failed to delete assignment" });
    }
});

// ==========================================
// CLASS OVERVIEW (FEATURE 5)
// ==========================================

// Get class overview statistics
classesRoutes.get("/:classLevel/:stream/stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ message: "No active school selected" });
        }

        const { classLevel, stream } = req.params;
        const { term, year } = req.query;

        if (!classLevel || !stream || !term || !year) {
            return res.status(400).json({ message: "classLevel, stream, term, and year are required" });
        }

        const stats = await ClassService.getClassStats(
            schoolId,
            classLevel,
            stream,
            Number(term),
            Number(year)
        );

        res.json(stats);
    } catch (error: any) {
        console.error("Error fetching class stats:", error);
        res.status(500).json({ message: error.message || "Failed to fetch class stats" });
    }
});
