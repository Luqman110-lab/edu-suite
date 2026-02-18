import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { z } from "zod";
import {
    dormitories, beds, students, leaveRequests, boardingRollCalls,
    visitorLogs, boardingSettings,
    insertDormitorySchema, insertBedSchema, insertVisitorLogSchema, insertBoardingSettingsSchema
} from "../../shared/schema";
import { requireAuth, requireAdmin, requireStaff, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const boardingRoutes = Router();

// GET /api/boarding-stats
boardingRoutes.get("/boarding-stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const today = new Date().toISOString().split('T')[0];
        const dormsCount = await db.select({ count: sql<number>`count(*)` }).from(dormitories).where(eq(dormitories.schoolId, schoolId));
        const bedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(eq(beds.schoolId, schoolId));
        const occupiedBedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(and(eq(beds.schoolId, schoolId), eq(beds.status, 'occupied')));
        const boardersCount = await db.select({ count: sql<number>`count(*)` }).from(students).where(and(eq(students.schoolId, schoolId), eq(students.boardingStatus, 'boarding')));
        const pendingLeaves = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'pending')));
        const onLeave = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'checked_out')));
        const morningRollCalls = await db.select({ count: sql<number>`count(*)` }).from(boardingRollCalls).where(and(eq(boardingRollCalls.schoolId, schoolId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, 'morning')));
        const eveningRollCalls = await db.select({ count: sql<number>`count(*)` }).from(boardingRollCalls).where(and(eq(boardingRollCalls.schoolId, schoolId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, 'evening')));
        const totalBeds = bedsCount[0]?.count || 0;
        const occupied = occupiedBedsCount[0]?.count || 0;
        res.json({
            totalDorms: dormsCount[0]?.count || 0, dormitories: dormsCount[0]?.count || 0,
            totalRooms: 0, totalBeds: totalBeds, occupiedBeds: occupied,
            availableBeds: totalBeds - occupied, totalBoarders: boardersCount[0]?.count || 0,
            occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
            pendingLeaveRequests: pendingLeaves[0]?.count || 0, studentsOnLeave: onLeave[0]?.count || 0,
            todayRollCalls: { morning: morningRollCalls[0]?.count || 0, evening: eveningRollCalls[0]?.count || 0 }
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch boarding stats: " + error.message });
    }
});

// POST /api/boarding-roll-calls/bulk
boardingRoutes.post("/boarding-roll-calls/bulk", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { records, session } = req.body;
        if (!records || !Array.isArray(records)) return res.status(400).json({ message: "Invalid records format" });
        const today = new Date().toISOString().split('T')[0];
        const newEntries = [];
        for (const record of records) {
            const existing = await db.select().from(boardingRollCalls).where(and(eq(boardingRollCalls.studentId, record.studentId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, session)));
            if (existing.length > 0) {
                const updated = await db.update(boardingRollCalls).set({ status: record.status, dormitoryId: record.dormitoryId, markedById: req.user?.id }).where(eq(boardingRollCalls.id, existing[0].id)).returning();
                newEntries.push(updated[0]);
            } else {
                const created = await db.insert(boardingRollCalls).values({ schoolId, studentId: record.studentId, date: today, session, status: record.status, dormitoryId: record.dormitoryId, markedById: req.user?.id }).returning();
                newEntries.push(created[0]);
            }
        }
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
        const allDorms = await db.select().from(dormitories).where(eq(dormitories.schoolId, schoolId));
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
        const newDorm = await db.insert(dormitories).values({ ...result.data, schoolId }).returning();
        res.json(newDorm[0]);
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
        const updatedDorm = await db.update(dormitories).set(result.data).where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId))).returning();
        if (updatedDorm.length === 0) return res.status(404).json({ message: "Dormitory not found" });
        res.json(updatedDorm[0]);
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
        const deleted = await db.delete(dormitories).where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId))).returning();
        if (deleted.length === 0) return res.status(404).json({ message: "Dormitory not found" });
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
        const conditions: any[] = [eq(beds.schoolId, schoolId)];
        if (req.query.dormitoryId) conditions.push(eq(beds.dormitoryId, parseInt(req.query.dormitoryId as string)));
        const allBeds = await db.select({
            bed: beds, student: { id: students.id, name: students.name, classLevel: students.classLevel }
        }).from(beds).leftJoin(students, eq(beds.currentStudentId, students.id)).where(and(...conditions));
        res.json(allBeds.map(item => ({ ...item.bed, studentName: item.student?.name || null, classLevel: item.student?.classLevel })));
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
        const newBed = await db.insert(beds).values({ ...result.data, schoolId, status: 'vacant' }).returning();
        res.json(newBed[0]);
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
        const { dormitoryId, startNumber, count, type } = result.data;
        const createdBeds: any[] = [];
        let currentNumber = parseInt(String(startNumber));
        if (isNaN(currentNumber)) currentNumber = 1;
        for (let i = 0; i < count; i++) {
            const bedIdentifier = currentNumber.toString();
            if (type === 'single') {
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Single', status: 'vacant' });
            } else if (type === 'double') {
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Bottom', status: 'vacant' });
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Top', status: 'vacant' });
            } else if (type === 'triple') {
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Bottom', status: 'vacant' });
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Middle', status: 'vacant' });
                createdBeds.push({ schoolId, dormitoryId, bedNumber: bedIdentifier, level: 'Top', status: 'vacant' });
            }
            currentNumber++;
        }
        const inserted = createdBeds.length > 0 ? await db.insert(beds).values(createdBeds).returning() : [];
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
        const updatedBed = await db.update(beds).set({ status: 'occupied', currentStudentId: studentId, mattressNumber: mattressNumber || null })
            .where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId))).returning();
        if (updatedBed.length === 0) return res.status(404).json({ message: "Bed not found" });
        if (updatedBed[0]) {
            const dorm = await db.select().from(dormitories).where(eq(dormitories.id, updatedBed[0].dormitoryId)).limit(1);
            if (dorm[0]) {
                // Update the student's houseOrDormitory field with the dorm name
                await db.update(students).set({ houseOrDormitory: dorm[0].name }).where(eq(students.id, studentId));
            }
        }
        res.json(updatedBed[0]);
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
        const bed = await db.select().from(beds).where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId))).limit(1);
        if (bed.length === 0) return res.status(404).json({ message: "Bed not found" });
        if (bed[0].currentStudentId) {
            await db.update(students).set({ houseOrDormitory: null }).where(eq(students.id, bed[0].currentStudentId));
        }
        const updatedBed = await db.update(beds).set({ status: 'vacant', currentStudentId: null, mattressNumber: null }).where(eq(beds.id, bedId)).returning();
        res.json(updatedBed[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to unassign bed: " + error.message });
    }
});

// GET /api/leave-requests
boardingRoutes.get("/leave-requests", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { status } = req.query;
        const conditions: any[] = [eq(leaveRequests.schoolId, schoolId)];
        if (status && typeof status === 'string') conditions.push(eq(leaveRequests.status, status));
        const requests = await db.query.leaveRequests.findMany({
            where: and(...conditions),
            with: { student: { columns: { id: true, name: true, classLevel: true, stream: true } } },
            orderBy: [desc(leaveRequests.createdAt)]
        });
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
        const { studentId, reason, startDate, endDate, guardianName, guardianPhone, leaveType } = req.body;
        if (!studentId || !reason || !startDate || !endDate) return res.status(400).json({ message: "studentId, reason, startDate, and endDate are required" });
        const studentCheck = await db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) return res.status(403).json({ message: "Student does not belong to the active school" });
        const newRequest = await db.insert(leaveRequests).values({
            schoolId, studentId, reason, startDate, endDate,
            guardianName: guardianName || 'Parent/Guardian',
            guardianPhone: guardianPhone || '',
            leaveType: leaveType || 'weekend',
            status: 'pending', requestedById: req.user?.id
        }).returning();
        res.json(newRequest[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create leave request: " + error.message });
    }
});

// PUT /api/leave-requests/:id/approve
boardingRoutes.put("/leave-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        const updated = await db.update(leaveRequests).set({ status: 'approved', approvedById: req.user?.id, approvedAt: new Date() })
            .where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated[0]);
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
        const updated = await db.update(leaveRequests).set({ status: 'rejected', approvedById: req.user?.id, approvedAt: new Date() })
            .where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated[0]);
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
        const updated = await db.update(leaveRequests).set({ status: 'checked_out', checkOutTime: new Date().toLocaleTimeString() })
            .where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated[0]);
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
        const updated = await db.update(leaveRequests).set({ status: 'returned', checkInTime: new Date().toLocaleTimeString() })
            .where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Leave request not found" });
        res.json(updated[0]);
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

        const logs = await db.select({
            log: visitorLogs,
            studentName: students.name,
            className: students.classLevel
        })
            .from(visitorLogs)
            .leftJoin(students, eq(visitorLogs.studentId, students.id))
            .where(eq(visitorLogs.schoolId, schoolId))
            .orderBy(desc(visitorLogs.visitDate));

        const flattened = logs.map(l => ({ ...l.log, studentName: l.studentName, className: l.className }));
        res.json(flattened);
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

        const data = {
            ...result.data,
            checkInTime: req.body.checkInTime || new Date().toLocaleTimeString(),
            schoolId,
            registeredById: req.user?.id
        };
        const newLog = await db.insert(visitorLogs).values(data).returning();
        res.json(newLog[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create visitor log: " + error.message });
    }
});

// PUT /api/visitor-logs/:id/checkout
boardingRoutes.put("/visitor-logs/:id/checkout", requireAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        const { checkOutTime } = req.body;

        const updated = await db.update(visitorLogs)
            .set({ checkOutTime: checkOutTime || new Date().toLocaleTimeString() })
            .where(eq(visitorLogs.id, id))
            .returning();

        res.json(updated[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to checkout visitor: " + error.message });
    }
});

// DELETE /api/visitor-logs/:id
boardingRoutes.delete("/visitor-logs/:id", requireAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        await db.delete(visitorLogs).where(eq(visitorLogs.id, id));
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

        const settings = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

        if (settings.length === 0) {
            return res.json({});
        }
        res.json(settings[0]);
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

        const existing = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

        if (existing.length > 0) {
            const updated = await db.update(boardingSettings)
                .set({ ...result.data, updatedAt: new Date() })
                .where(eq(boardingSettings.id, existing[0].id))
                .returning();
            res.json(updated[0]);
        } else {
            const created = await db.insert(boardingSettings)
                .values({ ...result.data, schoolId })
                .returning();
            res.json(created[0]);
        }
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update boarding settings: " + error.message });
    }
});
