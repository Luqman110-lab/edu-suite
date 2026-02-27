import { Router } from "express";
import { teacherAttendanceService } from "../services/TeacherAttendanceService";
import { requireAuth, requireStaff, getActiveSchoolId } from "../auth";

export const teacherAttendanceRoutes = Router();

// GET /api/teacher-attendance?date=YYYY-MM-DD
teacherAttendanceRoutes.get("/teacher-attendance", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
        const records = await teacherAttendanceService.getAttendance(schoolId, date);
        res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch teacher attendance: " + error.message });
    }
});

// POST /api/teacher-attendance/check-in
teacherAttendanceRoutes.post("/teacher-attendance/check-in", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { teacherId, method, latitude, longitude, accuracy, distance } = req.body;
        if (!teacherId) return res.status(400).json({ message: "teacherId is required" });

        const locationData = latitude != null ? { latitude, longitude, accuracy, distance } : undefined;
        const result = await teacherAttendanceService.checkIn(schoolId, teacherId, method, locationData);
        res.json(result);
    } catch (error: any) {
        if (error.message === "Teacher already checked in today") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to check in: " + error.message });
    }
});

// POST /api/teacher-attendance/check-out
teacherAttendanceRoutes.post("/teacher-attendance/check-out", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { teacherId, method } = req.body;
        if (!teacherId) return res.status(400).json({ message: "teacherId is required" });

        const result = await teacherAttendanceService.checkOut(schoolId, teacherId, method);
        res.json(result);
    } catch (error: any) {
        if (error.message === "Teacher not checked in today") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to check out: " + error.message });
    }
});

// POST /api/teacher-attendance/mark-leave
teacherAttendanceRoutes.post("/teacher-attendance/mark-leave", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { teacherId, date, leaveType, notes } = req.body;
        if (!teacherId || !date || !leaveType) {
            return res.status(400).json({ message: "teacherId, date, and leaveType are required" });
        }

        const result = await teacherAttendanceService.markLeave(schoolId, teacherId, date, leaveType, notes);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to mark leave: " + error.message });
    }
});
