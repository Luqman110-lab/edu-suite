import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
    dormitories, beds, students, leaveRequests, boardingRollCalls,
    visitorLogs, boardingSettings
} from "../../shared/schema";

export class BoardingService {

    // Boarding Stats
    async getBoardingStats(schoolId: number) {
        const today = new Date().toISOString().split('T')[0];

        const dormsCount = await db.select({ count: sql<number>`count(*)` }).from(dormitories).where(eq(dormitories.schoolId, schoolId));
        const bedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(eq(beds.schoolId, schoolId));
        const occupiedBedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(and(eq(beds.schoolId, schoolId), eq(beds.status, 'occupied')));

        // Only count active students with boarding status = boarding
        const boardersCount = await db.select({ count: sql<number>`count(*)` })
            .from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.boardingStatus, 'boarding'), eq(students.isActive, true)));

        const pendingLeaves = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'pending')));
        const onLeave = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'checked_out')));

        // Count students marked as "present" in today's roll calls
        const morningRollCalls = await db.select({ count: sql<number>`count(*)` })
            .from(boardingRollCalls)
            .where(and(eq(boardingRollCalls.schoolId, schoolId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, 'morning'), eq(boardingRollCalls.status, 'present')));
        const eveningRollCalls = await db.select({ count: sql<number>`count(*)` })
            .from(boardingRollCalls)
            .where(and(eq(boardingRollCalls.schoolId, schoolId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, 'evening'), eq(boardingRollCalls.status, 'present')));

        // Parse all counts — PostgreSQL count() returns strings, not JS numbers
        const totalDorms = parseInt(String(dormsCount[0]?.count ?? 0), 10);
        const totalBeds = parseInt(String(bedsCount[0]?.count ?? 0), 10);
        const occupied = parseInt(String(occupiedBedsCount[0]?.count ?? 0), 10);
        const totalBoarders = parseInt(String(boardersCount[0]?.count ?? 0), 10);
        const pending = parseInt(String(pendingLeaves[0]?.count ?? 0), 10);
        const studOnLeave = parseInt(String(onLeave[0]?.count ?? 0), 10);
        const morning = parseInt(String(morningRollCalls[0]?.count ?? 0), 10);
        const evening = parseInt(String(eveningRollCalls[0]?.count ?? 0), 10);

        return {
            totalDorms, dormitories: totalDorms,
            totalRooms: 0,
            totalBeds,
            occupiedBeds: occupied,
            availableBeds: totalBeds - occupied,
            totalBoarders,
            occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
            pendingLeaveRequests: pending,
            studentsOnLeave: studOnLeave,
            todayRollCalls: { morning, evening },
        };
    }


    // Roll Calls
    async submitBulkRollCall(schoolId: number, userId: number, data: any) {
        const { records, session } = data;
        const today = new Date().toISOString().split('T')[0];
        const newEntries = [];

        for (const record of records) {
            const existing = await db.select().from(boardingRollCalls).where(and(eq(boardingRollCalls.studentId, record.studentId), eq(boardingRollCalls.date, today), eq(boardingRollCalls.session, session)));
            if (existing.length > 0) {
                const updated = await db.update(boardingRollCalls).set({ status: record.status, dormitoryId: record.dormitoryId, markedById: userId }).where(eq(boardingRollCalls.id, existing[0].id)).returning();
                newEntries.push(updated[0]);
            } else {
                const created = await db.insert(boardingRollCalls).values({ schoolId, studentId: record.studentId, date: today, session, status: record.status, dormitoryId: record.dormitoryId, markedById: userId }).returning();
                newEntries.push(created[0]);
            }
        }
        return newEntries;
    }

    // Dormitories
    async getDormitories(schoolId: number) {
        return await db.select().from(dormitories).where(eq(dormitories.schoolId, schoolId));
    }

    async createDormitory(schoolId: number, data: any) {
        const newDorm = await db.insert(dormitories).values({ ...data, schoolId }).returning();
        return newDorm[0];
    }

    async updateDormitory(id: number, schoolId: number, data: any) {
        const updatedDorm = await db.update(dormitories).set(data).where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId))).returning();
        return updatedDorm[0];
    }

    async deleteDormitory(id: number, schoolId: number) {
        const deleted = await db.delete(dormitories).where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId))).returning();
        return deleted.length > 0;
    }

    // Beds
    async getBeds(schoolId: number, dormitoryId?: number) {
        const conditions: any[] = [eq(beds.schoolId, schoolId)];
        if (dormitoryId) conditions.push(eq(beds.dormitoryId, dormitoryId));

        const allBeds = await db.select({
            bed: beds, student: { id: students.id, name: students.name, classLevel: students.classLevel }
        }).from(beds).leftJoin(students, eq(beds.currentStudentId, students.id)).where(and(...conditions));

        return allBeds.map(item => ({ ...item.bed, studentName: item.student?.name || null, classLevel: item.student?.classLevel }));
    }

    async createBed(schoolId: number, data: any) {
        const newBed = await db.insert(beds).values({ ...data, schoolId, status: 'vacant' }).returning();
        return newBed[0];
    }

    async bulkCreateBeds(schoolId: number, data: any) {
        const { dormitoryId, startNumber, count, type } = data;
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

        if (createdBeds.length > 0) {
            return await db.insert(beds).values(createdBeds).returning();
        }
        return [];
    }

    async assignBed(bedId: number, schoolId: number, studentId: number, mattressNumber?: string) {
        const updatedBed = await db.update(beds).set({ status: 'occupied', currentStudentId: studentId, mattressNumber: mattressNumber || null })
            .where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId))).returning();

        if (updatedBed.length === 0) return null;

        const dorm = await db.select().from(dormitories).where(eq(dormitories.id, updatedBed[0].dormitoryId)).limit(1);
        if (dorm[0]) {
            await db.update(students).set({ houseOrDormitory: dorm[0].name }).where(eq(students.id, studentId));
        }
        return updatedBed[0];
    }

    async unassignBed(bedId: number, schoolId: number) {
        const bed = await db.select().from(beds).where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId))).limit(1);
        if (bed.length === 0) return null;

        if (bed[0].currentStudentId) {
            await db.update(students).set({ houseOrDormitory: null }).where(eq(students.id, bed[0].currentStudentId));
        }

        const updatedBed = await db.update(beds).set({ status: 'vacant', currentStudentId: null, mattressNumber: null }).where(eq(beds.id, bedId)).returning();
        return updatedBed[0];
    }

    // Leave Requests
    async getLeaveRequests(schoolId: number, status?: string) {
        const conditions: any[] = [eq(leaveRequests.schoolId, schoolId)];
        if (status) conditions.push(eq(leaveRequests.status, status));

        return await db.query.leaveRequests.findMany({
            where: and(...conditions),
            with: { student: { columns: { id: true, name: true, classLevel: true, stream: true } } },
            orderBy: [desc(leaveRequests.createdAt)]
        });
    }

    async createLeaveRequest(schoolId: number, userId: number | undefined, data: any) {
        const { studentId, reason, startDate, endDate, guardianName, guardianPhone, leaveType } = data;

        const studentCheck = await db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) throw new Error("Student does not belong to the active school");

        const newRequest = await db.insert(leaveRequests).values({
            schoolId, studentId, reason, startDate, endDate,
            guardianName: guardianName || 'Parent/Guardian',
            guardianPhone: guardianPhone || '',
            leaveType: leaveType || 'weekend',
            status: 'pending', requestedById: userId
        }).returning();
        return newRequest[0];
    }

    async updateLeaveRequestStatus(id: number, schoolId: number, userId: number, status: string) {
        const updateData: any = { status, approvedById: userId, approvedAt: new Date() };
        if (status === 'checked_out') {
            updateData.checkOutTime = new Date().toLocaleTimeString();
            delete updateData.approvedById;
            delete updateData.approvedAt;
        } else if (status === 'returned') {
            updateData.checkInTime = new Date().toLocaleTimeString();
            delete updateData.approvedById;
            delete updateData.approvedAt;
        }

        const updated = await db.update(leaveRequests).set(updateData)
            .where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).returning();
        return updated[0];
    }

    // Visitor Logs
    async getVisitorLogs(schoolId: number) {
        const logs = await db.select({
            log: visitorLogs,
            studentName: students.name,
            className: students.classLevel
        })
            .from(visitorLogs)
            .leftJoin(students, eq(visitorLogs.studentId, students.id))
            .where(eq(visitorLogs.schoolId, schoolId))
            .orderBy(desc(visitorLogs.visitDate));

        return logs.map(l => ({ ...l.log, studentName: l.studentName, className: l.className }));
    }

    async createVisitorLog(schoolId: number, userId: number | undefined, data: any) {
        const logData = {
            ...data,
            checkInTime: data.checkInTime || new Date().toLocaleTimeString(),
            schoolId,
            registeredById: userId
        };
        const newLog = await db.insert(visitorLogs).values(logData).returning();
        return newLog[0];
    }

    async checkoutVisitor(id: number, checkOutTime?: string) {
        const updated = await db.update(visitorLogs)
            .set({ checkOutTime: checkOutTime || new Date().toLocaleTimeString() })
            .where(eq(visitorLogs.id, id))
            .returning();
        return updated[0];
    }

    async deleteVisitorLog(id: number) {
        await db.delete(visitorLogs).where(eq(visitorLogs.id, id));
        return true;
    }

    // Boarding Settings
    async getBoardingSettings(schoolId: number) {
        const settings = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);
        return settings[0] || {};
    }

    async updateBoardingSettings(schoolId: number, data: any) {
        const existing = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

        if (existing.length > 0) {
            const updated = await db.update(boardingSettings)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(boardingSettings.id, existing[0].id))
                .returning();
            return updated[0];
        } else {
            const created = await db.insert(boardingSettings)
                .values({ ...data, schoolId })
                .returning();
            return created[0];
        }
    }
}

export const boardingService = new BoardingService();
