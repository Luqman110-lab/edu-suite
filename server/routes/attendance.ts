import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { gateAttendance, students, teacherAttendance, studentFeeOverrides } from "../../shared/schema";
import { requireAuth, requireAdmin, requireStaff, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const attendanceRoutes = Router();

// GET /api/gate-attendance
attendanceRoutes.get("/gate-attendance", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const date = req.query.date as string || new Date().toISOString().split('T')[0];
        const records = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, date)));
        res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch gate attendance: " + error.message });
    }
});

// POST /api/gate-attendance/check-in
attendanceRoutes.post("/gate-attendance/check-in", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, method } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);
        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);
        if (existing.length > 0) return res.status(400).json({ message: "Student already checked in today" });
        const lateTime = "08:00";
        const status = currentTime > lateTime ? 'late' : 'present';
        const newRecord = await db.insert(gateAttendance).values({
            studentId, schoolId, date: today, checkInTime: currentTime, checkInMethod: method || 'manual', status
        }).returning();
        res.json({ ...newRecord[0], checkInTime: currentTime, status });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to check in: " + error.message });
    }
});

// POST /api/gate-attendance/check-out
attendanceRoutes.post("/gate-attendance/check-out", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, method } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);
        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);
        if (existing.length === 0) return res.status(400).json({ message: "Student not checked in today" });
        const updated = await db.update(gateAttendance)
            .set({ checkOutTime: currentTime, checkOutMethod: method || 'manual' })
            .where(eq(gateAttendance.id, existing[0].id)).returning();
        res.json({ ...updated[0], checkOutTime: currentTime });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to check out: " + error.message });
    }
});

// POST /api/gate-attendance/mark-absent
attendanceRoutes.post("/gate-attendance/mark-absent", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const allStudents = await db.select().from(students).where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));
        const existingRecords = await db.select().from(gateAttendance).where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, targetDate)));
        const checkedInIds = new Set(existingRecords.map(r => r.studentId));
        const absentStudents = allStudents.filter(s => !checkedInIds.has(s.id));
        let markedCount = 0;
        for (const student of absentStudents) {
            await db.insert(gateAttendance).values({ studentId: student.id, schoolId, date: targetDate, status: 'absent' });
            markedCount++;
        }
        res.json({ marked: markedCount });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to mark absent: " + error.message });
    }
});

// GET /api/attendance-settings
attendanceRoutes.get("/attendance-settings", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        res.json({
            schoolStartTime: "08:00", lateThresholdMinutes: 15, gateCloseTime: "08:30",
            schoolEndTime: "16:00", enableFaceRecognition: false, enableQrScanning: true,
            requireFaceForGate: false, faceConfidenceThreshold: 0.6
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch attendance settings: " + error.message });
    }
});

// GET /api/student-fee-overrides/:studentId
attendanceRoutes.get("/student-fee-overrides/:studentId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(param(req, 'studentId'));
        const overrides = await db.select().from(studentFeeOverrides)
            .where(and(eq(studentFeeOverrides.studentId, studentId), eq(studentFeeOverrides.schoolId, schoolId), eq(studentFeeOverrides.isActive, true)));
        res.json(overrides);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch overrides: " + error.message });
    }
});

// POST /api/student-fee-overrides
attendanceRoutes.post("/student-fee-overrides", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, feeType, customAmount, term, year, reason } = req.body;
        const amount = Number(customAmount);
        if (isNaN(amount) || amount < 0) return res.status(400).json({ message: "customAmount must be a non-negative number" });
        if (!feeType) return res.status(400).json({ message: "feeType is required" });
        if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });
        const existing = await db.select().from(studentFeeOverrides)
            .where(and(eq(studentFeeOverrides.studentId, studentId), eq(studentFeeOverrides.feeType, feeType), eq(studentFeeOverrides.term, term), eq(studentFeeOverrides.year, year), eq(studentFeeOverrides.schoolId, schoolId))).limit(1);
        if (existing.length > 0) {
            const updated = await db.update(studentFeeOverrides).set({ customAmount, reason, updatedAt: new Date() }).where(eq(studentFeeOverrides.id, existing[0].id)).returning();
            return res.json(updated[0]);
        }
        const newOverride = await db.insert(studentFeeOverrides).values({ schoolId, studentId, feeType, customAmount, term, year, reason, createdBy: req.user?.id }).returning();
        res.json(newOverride[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to save override: " + error.message });
    }
});

// DELETE /api/student-fee-overrides/:id
attendanceRoutes.delete("/student-fee-overrides/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        if (isNaN(id)) return res.status(400).json({ message: "Invalid override ID" });
        const updated = await db.update(studentFeeOverrides).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(studentFeeOverrides.id, id), eq(studentFeeOverrides.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Override not found" });
        res.json({ message: "Override removed" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to remove override" });
    }
});
