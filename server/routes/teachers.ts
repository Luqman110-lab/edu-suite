import { Router, Request } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { teachers } from "../../shared/schema";
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

        const allTeachers = await db.select().from(teachers)
            .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));
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

        const newTeacher = await db.insert(teachers).values({ ...req.body, schoolId, isActive: true }).returning();
        res.status(201).json(newTeacher[0]);
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

        const existing = await db.select().from(teachers)
            .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId))).limit(1);
        if (existing.length === 0) return res.status(404).json({ message: "Teacher not found" });

        const updated = await db.update(teachers).set({ ...req.body, schoolId })
            .where(eq(teachers.id, teacherId)).returning();
        res.json(updated[0]);
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

        const existing = await db.select().from(teachers)
            .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId))).limit(1);
        if (existing.length === 0) return res.status(404).json({ message: "Teacher not found" });

        await db.update(teachers).set({ isActive: false }).where(eq(teachers.id, teacherId));
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

        const created = await db.insert(teachers).values(newTeachers.map((t: any) => ({
            name: t.name, gender: t.gender, phone: t.phone, email: t.email,
            employeeId: t.employeeId, roles: t.roles, assignedClass: t.assignedClass,
            assignedStream: t.assignedStream, subjects: t.subjects, teachingClasses: t.teachingClasses,
            qualifications: t.qualifications, dateJoined: t.dateJoined, initials: t.initials,
            schoolId, isActive: true
        }))).returning();

        res.json(created);
    } catch (error: any) {
        console.error("Batch teacher import error:", error);
        res.status(500).json({ message: "Failed to import teachers: " + error.message });
    }
});
