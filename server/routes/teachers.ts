import { Router, Request } from "express";
import { teacherService } from "../services/TeacherService";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const teacherRoutes = Router();

// GET /api/teachers
teacherRoutes.get("/", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const allTeachers = await teacherService.getTeachers(schoolId);
        res.json(allTeachers);
    } catch (error: any) {
        console.error("Get teachers error:", error);
        res.status(500).json({ message: "Failed to fetch teachers: " + error.message });
    }
});

// POST /api/teachers
teacherRoutes.post("/", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const newTeacher = await teacherService.createTeacher(schoolId, req.body, req.user!.id, req.user!.name);
        res.status(201).json(newTeacher);
    } catch (error: any) {
        console.error("Create teacher error:", error);
        res.status(500).json({ message: "Failed to create teacher: " + error.message });
    }
});

// PUT /api/teachers/:id
teacherRoutes.put("/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const teacherId = parseInt(param(req, 'id'));
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

        const updated = await teacherService.updateTeacher(teacherId, schoolId, req.body, req.user!.id, req.user!.name);
        if (!updated) return res.status(404).json({ message: "Teacher not found" });

        res.json(updated);
    } catch (error: any) {
        console.error("Update teacher error:", error);
        res.status(500).json({ message: "Failed to update teacher: " + error.message });
    }
});

// DELETE /api/teachers/:id
teacherRoutes.delete("/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const teacherId = parseInt(param(req, 'id'));
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

        const success = await teacherService.deleteTeacher(teacherId, schoolId, req.user!.id, req.user!.name);
        if (!success) return res.status(404).json({ message: "Teacher not found" });

        res.json({ message: "Teacher deleted successfully" });
    } catch (error: any) {
        console.error("Delete teacher error:", error);
        res.status(500).json({ message: "Failed to delete teacher: " + error.message });
    }
});

// POST /api/teachers/batch
teacherRoutes.post("/batch", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { teachers: newTeachers } = req.body;
        if (!Array.isArray(newTeachers) || newTeachers.length === 0) return res.status(400).json({ message: "No teachers provided" });

        const created = await teacherService.batchImportTeachers(schoolId, newTeachers);
        res.json(created);
    } catch (error: any) {
        console.error("Batch teacher import error:", error);
        res.status(500).json({ message: "Failed to import teachers: " + error.message });
    }
});
