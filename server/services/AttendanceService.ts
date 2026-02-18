import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { gateAttendance, students } from "../../shared/schema";

export class AttendanceService {

    async getGateAttendance(schoolId: number, date: string) {
        return await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, date)));
    }

    async checkIn(schoolId: number, studentId: number, method: string = 'manual') {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);

        if (existing.length > 0) throw new Error("Student already checked in today");

        const lateTime = "08:00";
        const status = currentTime > lateTime ? 'late' : 'present';

        const newRecord = await db.insert(gateAttendance).values({
            studentId, schoolId, date: today, checkInTime: currentTime, checkInMethod: method, status
        }).returning();

        return { ...newRecord[0], checkInTime: currentTime, status };
    }

    async checkOut(schoolId: number, studentId: number, method: string = 'manual') {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);

        if (existing.length === 0) throw new Error("Student not checked in today");

        const updated = await db.update(gateAttendance)
            .set({ checkOutTime: currentTime, checkOutMethod: method })
            .where(eq(gateAttendance.id, existing[0].id)).returning();

        return { ...updated[0], checkOutTime: currentTime };
    }

    async markAbsent(schoolId: number, date?: string) {
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
        return markedCount;
    }
}

export const attendanceService = new AttendanceService();
