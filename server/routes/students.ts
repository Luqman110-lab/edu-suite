import { Router, Request } from "express";
import { studentService } from "../services/StudentService";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";
import { insertStudentSchema } from "../../shared/schema";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
function queryStr(req: Request, key: string): string {
    const val = req.query[key];
    if (Array.isArray(val)) return String(val[0]);
    return val ? String(val) : '';
}

export const studentRoutes = Router();

// GET /api/students
studentRoutes.get("/students", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const yearParam = queryStr(req, 'year');
        const year = yearParam ? parseInt(yearParam) : undefined;

        const results = await studentService.getStudents(schoolId, year);
        res.json(results);
    } catch (error: any) {
        console.error("Get students error:", error);
        res.status(500).json({ message: "Failed to fetch students: " + (error.cause?.message || error.message) });
    }
});

// POST /api/students
studentRoutes.post("/students", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const userId = req.user!.id;
        const userName = req.user!.name;
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const body = req.body;
        if (body.name == null || body.classLevel == null || body.stream == null || body.gender == null) {
            return res.status(400).json({ message: "Missing required fields: name, classLevel, stream, gender" });
        }

        const newStudent = await studentService.createStudent(schoolId, userId, userName, body);
        res.status(201).json(newStudent);
    } catch (error: any) {
        console.error("Create student error:", error);
        const pgMessage = error.cause?.message || error.detail || '';
        res.status(500).json({ message: pgMessage ? `Failed to create student: ${pgMessage}` : `Failed to create student: ${error.message}` });
    }
});

// PUT /api/students/:id
studentRoutes.put("/students/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const userId = req.user!.id;
        const userName = req.user!.name;
        const studentId = parseInt(param(req, 'id'));
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

        const validationSchema = (insertStudentSchema as any).omit({ id: true, schoolId: true, createdAt: true, updatedAt: true });
        const parseResult = validationSchema.partial().safeParse(req.body);
        if (!parseResult.success) return res.status(400).json({ message: "Invalid update data: " + parseResult.error.message });

        const updated = await studentService.updateStudent(studentId, schoolId, userId, userName, parseResult.data);
        if (!updated) return res.status(404).json({ message: "Student not found" });

        res.json(updated);
    } catch (error: any) {
        console.error("Update student error:", error);
        res.status(500).json({ message: "Failed to update student: " + error.message });
    }
});

// DELETE /api/students/:id
studentRoutes.delete("/students/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const userId = req.user!.id;
        const userName = req.user!.name;
        const studentId = parseInt(param(req, 'id'));
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

        const success = await studentService.deleteStudent(studentId, schoolId, userId, userName);
        if (!success) return res.status(404).json({ message: "Student not found" });

        res.json({ message: "Student deleted successfully" });
    } catch (error: any) {
        console.error("Delete student error:", error);
        res.status(500).json({ message: "Failed to delete student: " + error.message });
    }
});

// DELETE /api/students (batch)
studentRoutes.delete("/students", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const userId = req.user!.id;
        const userName = req.user!.name;
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "No student IDs provided" });

        await studentService.batchDeleteStudents(schoolId, ids, userId, userName);
        res.json({ message: "Students deleted successfully" });
    } catch (error: any) {
        console.error("Batch delete students error:", error);
        res.status(500).json({ message: "Failed to delete students: " + error.message });
    }
});

// POST /api/students/batch
studentRoutes.post("/students/batch", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { students: newStudents } = req.body;
        if (!Array.isArray(newStudents) || newStudents.length === 0) return res.status(400).json({ message: "No students provided" });

        const created = await studentService.batchImportStudents(schoolId, newStudents);
        res.json(created);
    } catch (error: any) {
        console.error("Batch import error:", error);
        res.status(500).json({ message: "Failed to import students: " + error.message });
    }
});

// POST /api/students/promote
studentRoutes.post("/students/promote", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { studentIds, targetStream } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) return res.status(400).json({ message: "No students selected for promotion" });

        const io = (req as any).io; // If needed, although not used in service directly
        const result = await studentService.promoteStudents(schoolId, studentIds, targetStream, req.user!.id);

        res.json({ ...result, message: `Successfully processed ${studentIds.length} students.` });
    } catch (error: any) {
        console.error("Promotion error:", error);
        res.status(500).json({ message: "Failed to promote students: " + error.message });
    }
});

// GET /api/students/search
studentRoutes.get("/students/search", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const query = req.query.q as string;
        const filters = {
            classLevel: req.query.classLevel as string,
            stream: req.query.stream as string,
            boardingStatus: req.query.boardingStatus as string,
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as string
        };

        const hasFilters = filters.classLevel || filters.stream || filters.boardingStatus;
        if (!hasFilters && (!query || query.length < 2)) return res.json([]);

        const results = await studentService.searchStudents(schoolId, query, filters);
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: "Search failed: " + error.message });
    }
});

// GET /api/public/verify-student/:id
studentRoutes.get("/public/verify-student/:id", async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        if (isNaN(id)) return res.status(400).json({ valid: false, message: "Invalid ID" });

        const result = await studentService.verifyStudent(id);
        if (!result) return res.json({ valid: false, message: "Student not found" });

        res.json(result);
    } catch (error: any) {
        console.error("Verification error:", error);
        res.status(500).json({ valid: false, message: "Verification failed" });
    }
});
