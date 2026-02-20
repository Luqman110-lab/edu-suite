import { Router, Request } from "express";
import { boardingService } from "../services/BoardingService";
import { requireAuth, requireAdmin, requireStaff, getActiveSchoolId } from "../auth";
import { insertDormitorySchema, insertBedSchema, insertVisitorLogSchema, insertBoardingSettingsSchema, beds, dormitories } from "../../shared/schema";
import { z } from "zod";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const boardingRoutes = Router();

// GET /api/students/:id/bed — get the current bed assignment for a student
boardingRoutes.get("/students/:id/bed", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

        const result = await db
            .select({ bed: beds, dormitory: dormitories })
            .from(beds)
            .leftJoin(dormitories, eq(beds.dormitoryId, dormitories.id))
            .where(and(eq(beds.schoolId, schoolId), eq(beds.currentStudentId, studentId)))
            .limit(1);

        res.json(result[0] || null);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch student bed: " + error.message });
    }
});


// GET /api/boarding-stats
boardingRoutes.get("/boarding-stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const stats = await boardingService.getBoardingStats(schoolId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch boarding stats: " + error.message });
    }
});


// POST /api/boarding-roll-calls/bulk
boardingRoutes.post("/boarding-roll-calls/bulk", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { records } = req.body;
        if (!records || !Array.isArray(records)) return res.status(400).json({ message: "Invalid records format" });

        const newEntries = await boardingService.submitBulkRollCall(schoolId, req.user!.id, req.body);
        res.json(newEntries);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to submit bulk roll call: " + error.message });
    }
});

// GET /api/dormitories
boardingRoutes.get("/dormitories", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const allDorms = await boardingService.getDormitories(schoolId);
        res.json(allDorms);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch dormitories: " + error.message });
    }
});

// POST /api/dormitories
boardingRoutes.post("/dormitories", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const result = (insertDormitorySchema as any).omit({ id: true, schoolId: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const newDorm = await boardingService.createDormitory(schoolId, result.data);
        res.json(newDorm);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create dormitory: " + error.message });
    }
});

// PUT /api/dormitories/:id
boardingRoutes.put("/dormitories/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        const result = (insertDormitorySchema as any).omit({ id: true, schoolId: true }).partial().safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const updatedDorm = await boardingService.updateDormitory(id, schoolId, result.data);
        if (!updatedDorm) return res.status(404).json({ message: "Dormitory not found" });
        res.json(updatedDorm);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update dormitory: " + error.message });
    }
});

// DELETE /api/dormitories/:id
boardingRoutes.delete("/dormitories/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));

        const success = await boardingService.deleteDormitory(id, schoolId);
        if (!success) return res.status(404).json({ message: "Dormitory not found" });
        res.json({ message: "Dormitory deleted" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete dormitory: " + error.message });
    }
});

// GET /api/beds
boardingRoutes.get("/beds", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const dormitoryId = req.query.dormitoryId ? parseInt(req.query.dormitoryId as string) : undefined;

        const allBeds = await boardingService.getBeds(schoolId, dormitoryId);
        res.json(allBeds);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch beds: " + error.message });
    }
});

// POST /api/beds
boardingRoutes.post("/beds", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const result = (insertBedSchema as any).omit({ id: true, schoolId: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const newBed = await boardingService.createBed(schoolId, result.data);
        res.json(newBed);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create bed: " + error.message });
    }
});

// POST /api/beds/bulk
boardingRoutes.post("/beds/bulk", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const bulkBedSchema = z.object({
            dormitoryId: z.number(), startNumber: z.union([z.string(), z.number()]),
            count: z.number().int().positive(), type: z.enum(['single', 'double', 'triple'])
        });
        const result = bulkBedSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const inserted = await boardingService.bulkCreateBeds(schoolId, result.data);
        res.json(inserted);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to bulk create beds: " + error.message });
    }
});

// POST /api/beds/:id/assign
boardingRoutes.post("/beds/:id/assign", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const bedId = parseInt(param(req, 'id'));
        const { studentId, mattressNumber } = req.body;
        if (!studentId) return res.status(400).json({ message: "Student ID required" });

        const updatedBed = await boardingService.assignBed(bedId, schoolId, studentId, mattressNumber);
        if (!updatedBed) return res.status(404).json({ message: "Bed not found" });

        res.json(updatedBed);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to assign bed: " + error.message });
    }
});

// POST /api/beds/:id/unassign
boardingRoutes.post("/beds/:id/unassign", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const bedId = parseInt(param(req, 'id'));

        const updatedBed = await boardingService.unassignBed(bedId, schoolId);
        if (!updatedBed) return res.status(404).json({ message: "Bed not found" });

        res.json(updatedBed);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to unassign bed: " + error.message });
    }
});

// DELETE /api/beds/:id
boardingRoutes.delete("/beds/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const bedId = parseInt(param(req, 'id'));

        await boardingService.deleteBed(bedId, schoolId);
        res.json({ message: "Bed deleted successfully" });
    } catch (error: any) {
        res.status(error.message.includes("occupied") ? 400 : 500).json({ message: "Failed to delete bed: " + error.message });
    }
});

// POST /api/beds/bulk-delete
boardingRoutes.post("/beds/bulk-delete", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const bulkDeleteSchema = z.object({
            bedIds: z.array(z.number())
        });

        const result = bulkDeleteSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const deletedCount = await boardingService.bulkDeleteBeds(schoolId, result.data.bedIds);
        res.json({ deletedCount });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to bulk delete beds: " + error.message });
    }
});

// GET /api/leave-requests
boardingRoutes.get("/leave-requests", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { status } = req.query;

        const requests = await boardingService.getLeaveRequests(schoolId, status as string);
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch leave requests: " + error.message });
    }
});

// POST /api/leave-requests
boardingRoutes.post("/leave-requests", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, reason, startDate, endDate } = req.body;
        if (!studentId || !reason || !startDate || !endDate) return res.status(400).json({ message: "studentId, reason, startDate, and endDate are required" });

        const newRequest = await boardingService.createLeaveRequest(schoolId, req.user?.id, req.body);
        res.json(newRequest);
    } catch (error: any) {
        if (error.message === "Student does not belong to the active school") return res.status(403).json({ message: error.message });
        res.status(500).json({ message: "Failed to create leave request: " + error.message });
    }
});

// PUT /api/leave-requests/:id/approve
boardingRoutes.put("/leave-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));

        const updated = await boardingService.updateLeaveRequestStatus(id, schoolId, req.user!.id, 'approved');
        if (!updated) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to approve leave request: " + error.message });
    }
});

// PUT /api/leave-requests/:id/reject
boardingRoutes.put("/leave-requests/:id/reject", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));

        const updated = await boardingService.updateLeaveRequestStatus(id, schoolId, req.user!.id, 'rejected');
        if (!updated) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to reject leave request: " + error.message });
    }
});

// PUT /api/leave-requests/:id/checkout
boardingRoutes.put("/leave-requests/:id/checkout", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));

        const updated = await boardingService.updateLeaveRequestStatus(id, schoolId, req.user!.id, 'checked_out');
        if (!updated) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to check out: " + error.message });
    }
});

// PUT /api/leave-requests/:id/return
boardingRoutes.put("/leave-requests/:id/return", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));

        const updated = await boardingService.updateLeaveRequestStatus(id, schoolId, req.user!.id, 'returned');
        if (!updated) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to mark return: " + error.message });
    }
});

// ==================== VISITOR LOGS ====================

// GET /api/visitor-logs
boardingRoutes.get("/visitor-logs", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const logs = await boardingService.getVisitorLogs(schoolId);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch visitor logs: " + error.message });
    }
});

// POST /api/visitor-logs
boardingRoutes.post("/visitor-logs", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const result = (insertVisitorLogSchema as any).omit({ id: true, schoolId: true, checkOutTime: true, registeredById: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const newLog = await boardingService.createVisitorLog(schoolId, req.user?.id, result.data);
        res.json(newLog);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create visitor log: " + error.message });
    }
});

// PUT /api/visitor-logs/:id/checkout
boardingRoutes.put("/visitor-logs/:id/checkout", requireAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        const { checkOutTime } = req.body;

        const updated = await boardingService.checkoutVisitor(id, checkOutTime);
        if (!updated) return res.status(404).json({ message: "Visitor log not found" });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to checkout visitor: " + error.message });
    }
});

// DELETE /api/visitor-logs/:id
boardingRoutes.delete("/visitor-logs/:id", requireAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        await boardingService.deleteVisitorLog(id);
        res.json({ message: "Visitor log deleted" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete visitor log: " + error.message });
    }
});

// ==================== BOARDING SETTINGS ====================

// GET /api/boarding-settings
boardingRoutes.get("/boarding-settings", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const settings = await boardingService.getBoardingSettings(schoolId);
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch boarding settings: " + error.message });
    }
});

// PUT /api/boarding-settings
boardingRoutes.put("/boarding-settings", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const result = (insertBoardingSettingsSchema as any).omit({ id: true, schoolId: true, updatedAt: true }).partial().safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });

        const updated = await boardingService.updateBoardingSettings(schoolId, result.data);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update boarding settings: " + error.message });
    }
});
