import { Router, Request } from "express";
import { attendanceService } from "../services/AttendanceService";
import { feeService } from "../services/FeeService";
import { requireAuth, requireAdmin, requireStaff, getActiveSchoolId } from "../auth";
import { db } from "../db";
import { schools } from "../../shared/schema";
import { eq } from "drizzle-orm";

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

        const records = await attendanceService.getGateAttendance(schoolId, date);
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

        const result = await attendanceService.checkIn(schoolId, studentId, method);
        res.json(result);
    } catch (error: any) {
        if (error.message === "Student already checked in today") return res.status(400).json({ message: error.message });
        res.status(500).json({ message: "Failed to check in: " + error.message });
    }
});

// POST /api/gate-attendance/check-out
attendanceRoutes.post("/gate-attendance/check-out", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, method } = req.body;

        const result = await attendanceService.checkOut(schoolId, studentId, method);
        res.json(result);
    } catch (error: any) {
        if (error.message === "Student not checked in today") return res.status(400).json({ message: error.message });
        res.status(500).json({ message: "Failed to check out: " + error.message });
    }
});

// POST /api/gate-attendance/mark-absent
attendanceRoutes.post("/gate-attendance/mark-absent", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const markedCount = await attendanceService.markAbsent(schoolId, req.body.date);
        res.json({ marked: markedCount });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to mark absent: " + error.message });
    }
});

// GET /api/gate-attendance/summary-by-class — G5: Attendance summary grouped by class
attendanceRoutes.get("/gate-attendance/summary-by-class", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const date = req.query.date as string || new Date().toISOString().split('T')[0];

        const summary = await attendanceService.getAttendanceSummaryByClass(schoolId, date);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch class summary: " + error.message });
    }
});

// GET /api/gate-attendance/qr/:studentId — G6: Student QR code data for gate scanning
attendanceRoutes.get("/gate-attendance/qr/:studentId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(param(req, 'studentId'));
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

        const qrData = await attendanceService.getStudentQRData(schoolId, studentId);
        res.json(qrData);
    } catch (error: any) {
        if (error.message === "Student not found") return res.status(404).json({ message: error.message });
        res.status(500).json({ message: "Failed to generate QR data: " + error.message });
    }
});

// POST /api/gate-attendance/auto-absent — G3: Auto mark-absent scheduler trigger
attendanceRoutes.post("/gate-attendance/auto-absent", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const result = await attendanceService.scheduleAutoAbsent(schoolId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to auto mark absent: " + error.message });
    }
});

// GET /api/attendance-settings
attendanceRoutes.get("/attendance-settings", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const [school] = await db.select({ attendanceSettings: schools.attendanceSettings })
            .from(schools).where(eq(schools.id, schoolId)).limit(1);

        // Merge DB values with defaults so new keys always have fallback values
        const defaults = {
            schoolStartTime: "08:00", lateThresholdMinutes: 15, gateCloseTime: "08:30",
            schoolEndTime: "16:00", enableFaceRecognition: false, enableQrScanning: true,
            requireFaceForGate: false, requireFaceForTeachers: false, faceConfidenceThreshold: 0.6,
            enableGeofencing: false, schoolLatitude: null, schoolLongitude: null,
            geofenceRadiusMeters: 100, periodsPerDay: 8, periodDurationMinutes: 40,
        };

        res.json({ ...defaults, ...(school?.attendanceSettings || {}) });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch attendance settings: " + error.message });
    }
});

// POST /api/attendance-settings  (save)
attendanceRoutes.post("/attendance-settings", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const settingsPayload = req.body;
        await db.update(schools)
            .set({ attendanceSettings: settingsPayload, updatedAt: new Date() })
            .where(eq(schools.id, schoolId));

        res.json({ message: "Attendance settings saved" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to save attendance settings: " + error.message });
    }
});

// GET /api/student-fee-overrides/:studentId
attendanceRoutes.get("/student-fee-overrides/:studentId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(param(req, 'studentId'));

        const overrides = await feeService.getStudentFeeOverrides(studentId, schoolId);
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
        const { feeType, customAmount, year } = req.body;
        const amount = Number(customAmount);

        if (isNaN(amount) || amount < 0) return res.status(400).json({ message: "customAmount must be a non-negative number" });
        if (!feeType) return res.status(400).json({ message: "feeType is required" });
        if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });

        const result = await feeService.createStudentFeeOverride(schoolId, req.user?.id, req.body);
        res.json(result);
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

        const success = await feeService.deleteStudentFeeOverride(id, schoolId);
        if (!success) return res.status(404).json({ message: "Override not found" });

        res.json({ message: "Override removed" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to remove override" });
    }
});
