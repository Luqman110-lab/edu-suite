import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import {
    students, promotionHistory, studentYearSnapshots, auditLogs,
    insertStudentSchema
} from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

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

        if (yearParam) {
            const year = parseInt(yearParam);
            const snapshots = await db.select({
                id: students.id,
                name: students.name,
                indexNumber: students.indexNumber,
                classLevel: studentYearSnapshots.classLevel,
                stream: studentYearSnapshots.stream,
                gender: students.gender,
                dateOfBirth: students.dateOfBirth,
                boardingStatus: studentYearSnapshots.boardingStatus,
                parentName: students.parentName,
                parentContact: students.parentContact,
                photoBase64: students.photoBase64,
                isActive: studentYearSnapshots.isActive,
                schoolId: students.schoolId,
            })
                .from(studentYearSnapshots)
                .innerJoin(students, eq(studentYearSnapshots.studentId, students.id))
                .where(and(
                    eq(studentYearSnapshots.schoolId, schoolId),
                    eq(studentYearSnapshots.year, year)
                ))
                .orderBy(students.name);
            return res.json(snapshots);
        }

        const allStudents = await db.select().from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
            .orderBy(students.name);
        res.json(allStudents);
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

        const autoIndex = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record: Record<string, unknown> = {
            indexNumber: autoIndex,
            name: body.name,
            classLevel: body.classLevel,
            stream: body.stream,
            gender: body.gender,
            schoolId,
            isActive: true,
        };

        if (body.paycode) record.paycode = body.paycode;
        if (body.parentName) record.parentName = body.parentName;
        if (body.parentContact) record.parentContact = body.parentContact;
        if (body.dateOfBirth) record.dateOfBirth = body.dateOfBirth;
        if (body.nationality) record.nationality = body.nationality;
        if (body.religion) record.religion = body.religion;
        if (body.photoBase64) record.photoBase64 = body.photoBase64;
        if (body.admissionDate) record.admissionDate = body.admissionDate;
        if (body.admissionNumber) record.admissionNumber = body.admissionNumber;
        if (body.previousSchool) record.previousSchool = body.previousSchool;
        if (body.boardingStatus) record.boardingStatus = body.boardingStatus;
        if (body.houseOrDormitory) record.houseOrDormitory = body.houseOrDormitory;
        if (body.medicalInfo && Object.keys(body.medicalInfo).length > 0) record.medicalInfo = body.medicalInfo;
        if (body.emergencyContacts && Array.isArray(body.emergencyContacts) && body.emergencyContacts.some((c: any) => c.name)) record.emergencyContacts = body.emergencyContacts;
        if (body.specialCases) record.specialCases = body.specialCases;

        const newStudent = await db.insert(students).values(record as typeof students.$inferInsert).returning();

        await db.insert(auditLogs).values({
            userId, userName, action: 'create', entityType: 'student',
            entityId: newStudent[0].id, entityName: newStudent[0].name,
            details: { indexNumber: newStudent[0].indexNumber, class: newStudent[0].classLevel },
            ipAddress: req.ip
        });

        res.status(201).json(newStudent[0]);
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

        const existing = await db.select().from(students)
            .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (existing.length === 0) return res.status(404).json({ message: "Student not found" });

        const validationSchema = (insertStudentSchema as any).omit({ id: true, schoolId: true, createdAt: true, updatedAt: true });
        const parseResult = validationSchema.partial().safeParse(req.body);
        if (!parseResult.success) return res.status(400).json({ message: "Invalid update data: " + parseResult.error.message });

        const data = parseResult.data;
        const updated = await db.update(students).set({ ...data, schoolId }).where(eq(students.id, studentId)).returning();

        await db.insert(auditLogs).values({
            userId, userName, action: 'update', entityType: 'student',
            entityId: studentId, entityName: updated[0].name,
            details: { changes: Object.keys(data) }, ipAddress: req.ip
        });

        res.json(updated[0]);
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

        const existing = await db.select().from(students)
            .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (existing.length === 0) return res.status(404).json({ message: "Student not found" });

        await db.update(students).set({ isActive: false }).where(eq(students.id, studentId));

        await db.insert(auditLogs).values({
            userId, userName, action: 'delete', entityType: 'student',
            entityId: studentId, entityName: existing[0].name,
            details: { type: 'soft_delete' }, ipAddress: req.ip
        });

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

        await db.update(students).set({ isActive: false })
            .where(and(eq(students.schoolId, schoolId), inArray(students.id, ids)));

        await db.insert(auditLogs).values({
            userId, userName, action: 'delete_batch', entityType: 'student',
            entityId: 0, entityName: 'Batch Students',
            details: { count: ids.length, ids }, ipAddress: req.ip
        });

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

        const created = await db.insert(students).values(newStudents.map((s: any) => {
            const autoIndex = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const record: Record<string, unknown> = {
                indexNumber: s.indexNumber || autoIndex,
                name: s.name, classLevel: s.classLevel, stream: s.stream,
                gender: s.gender, isActive: true, schoolId,
            };
            if (s.paycode) record.paycode = s.paycode;
            if (s.parentName) record.parentName = s.parentName;
            if (s.parentContact) record.parentContact = s.parentContact;
            if (s.dateOfBirth) record.dateOfBirth = s.dateOfBirth;
            if (s.nationality) record.nationality = s.nationality;
            if (s.religion) record.religion = s.religion;
            if (s.photoBase64) record.photoBase64 = s.photoBase64;
            if (s.admissionDate) record.admissionDate = s.admissionDate;
            if (s.admissionNumber) record.admissionNumber = s.admissionNumber;
            if (s.previousSchool) record.previousSchool = s.previousSchool;
            if (s.boardingStatus) record.boardingStatus = s.boardingStatus;
            if (s.houseOrDormitory) record.houseOrDormitory = s.houseOrDormitory;
            if (s.medicalInfo) record.medicalInfo = s.medicalInfo;
            if (s.emergencyContacts) record.emergencyContacts = s.emergencyContacts;
            if (s.specialCases) record.specialCases = s.specialCases;
            return record as typeof students.$inferInsert;
        })).onConflictDoNothing().returning();

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

        const activeStudents = await db.select().from(students)
            .where(and(inArray(students.id, studentIds), eq(students.schoolId, schoolId)));

        let promotedCount = 0, graduatedCount = 0, skippedCount = 0;
        const classMap: Record<string, string> = {
            'Baby': 'Middle', 'Middle': 'Top', 'Top': 'P1',
            'P1': 'P2', 'P2': 'P3', 'P3': 'P4', 'P4': 'P5', 'P5': 'P6', 'P6': 'P7',
            'P7': 'Alumni'
        };

        for (const student of activeStudents) {
            const currentClass = student.classLevel;
            const nextClass = classMap[currentClass];
            if (!nextClass) { skippedCount++; continue; }

            const isGraduating = currentClass === 'P7';
            const updates: any = { classLevel: nextClass, stream: targetStream || student.stream };
            if (isGraduating) { graduatedCount++; } else { promotedCount++; }

            await db.update(students).set(updates).where(eq(students.id, student.id));
            await db.insert(promotionHistory).values({
                schoolId, studentId: student.id, fromClass: currentClass, toClass: nextClass,
                fromStream: student.stream, toStream: updates.stream,
                academicYear: new Date().getFullYear(), term: 1, promotedBy: req.user!.id
            });
        }

        res.json({ promotedCount, graduatedCount, skippedCount, message: `Successfully processed ${studentIds.length} students.` });
    } catch (error: any) {
        console.error("Promotion error:", error);
        res.status(500).json({ message: "Failed to promote students: " + error.message });
    }
});

// GET /api/students/search
studentRoutes.get("/students/search", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const query = req.query.q as string;
        const classLevel = req.query.classLevel as string;
        const stream = req.query.stream as string;
        const boardingStatus = req.query.boardingStatus as string;

        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const hasFilters = classLevel || stream || boardingStatus;
        if (!hasFilters && (!query || query.length < 2)) return res.json([]);

        const conditions: any[] = [eq(students.schoolId, schoolId), eq(students.isActive, true)];
        if (query && query.length > 0) conditions.push(sql`LOWER(${students.name}) LIKE ${`%${query.toLowerCase()}%`}`);
        if (classLevel) conditions.push(eq(students.classLevel, classLevel));
        if (stream) conditions.push(sql`LOWER(${students.stream}) = ${stream.toLowerCase()}`);
        if (boardingStatus) conditions.push(sql`LOWER(${students.boardingStatus}) = ${boardingStatus.toLowerCase()}`);

        const sortBy = req.query.sortBy as string || 'name';
        const sortOrder = req.query.sortOrder as string || 'asc';
        let orderByClause: any;
        switch (sortBy) {
            case 'classLevel': orderByClause = sortOrder === 'desc' ? desc(students.classLevel) : asc(students.classLevel); break;
            case 'stream': orderByClause = sortOrder === 'desc' ? desc(students.stream) : asc(students.stream); break;
            case 'boardingStatus': orderByClause = sortOrder === 'desc' ? desc(students.boardingStatus) : asc(students.boardingStatus); break;
            default: orderByClause = sortOrder === 'desc' ? desc(students.name) : asc(students.name);
        }

        const results = await db.select().from(students).where(and(...conditions)).orderBy(orderByClause).limit(50);
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

        const { schools } = await import("../../shared/schema");
        const studentData = await db.select({ student: students, schoolName: schools.name })
            .from(students).leftJoin(schools, eq(students.schoolId, schools.id))
            .where(eq(students.id, id)).limit(1);

        if (!studentData.length) return res.json({ valid: false, message: "Student not found" });

        const { student, schoolName } = studentData[0];
        res.json({
            valid: true,
            student: {
                name: student.name, photoBase64: student.photoBase64,
                classLevel: student.classLevel, stream: student.stream,
                schoolName: schoolName || "Unknown School",
                status: (student as any).isActive ? "Active" : "Inactive",
                indexNumber: student.indexNumber
            }
        });
    } catch (error: any) {
        console.error("Verification error:", error);
        res.status(500).json({ valid: false, message: "Verification failed" });
    }
});
