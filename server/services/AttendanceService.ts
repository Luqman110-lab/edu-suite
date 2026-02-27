import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { gateAttendance, students, schools } from "../../shared/schema";

const SETTINGS_DEFAULTS = {
    schoolStartTime: "08:00", lateThresholdMinutes: 15, schoolEndTime: "16:00",
};

export class AttendanceService {

    async getGateAttendance(schoolId: number, date: string) {
        return await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, date)));
    }

    /** Read attendance settings from school record, with defaults fallback */
    private async getSettings(schoolId: number) {
        const [school] = await db.select({ attendanceSettings: schools.attendanceSettings })
            .from(schools).where(eq(schools.id, schoolId)).limit(1);
        return { ...SETTINGS_DEFAULTS, ...(school?.attendanceSettings || {}) };
    }

    /** Add minutes to a "HH:MM" string */
    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(":").map(Number);
        const total = h * 60 + m + minutes;
        return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }

    /** G4: Stub for notifying guardians via SMS/Push when attendance events occur */
    private async notifyGuardian(student: any, eventType: 'check-in' | 'check-out' | 'absent', time: string) {
        if (!student.parentContact) return; // No contact info to notify

        const messages = {
            'check-in': `has arrived at school at ${time}.`,
            'check-out': `has left school at ${time}.`,
            'absent': `has been marked absent for today (${time}).`,
        };

        // In a real implementation, this would call an SMS provider (e.g., Twilio) or push notification service
        console.log(`[SMS STUB] To ${student.parentContact} (${student.parentName || 'Guardian'}): Your child ${student.name} ${messages[eventType]}`);
    }

    async checkIn(schoolId: number, studentId: number, method: string = 'manual') {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);

        if (existing.length > 0) throw new Error("Student already checked in today");

        // Calculate late status from DB settings
        const settings = await this.getSettings(schoolId);
        const lateThreshold = this.addMinutes(settings.schoolStartTime, settings.lateThresholdMinutes);
        const status = currentTime > lateThreshold ? 'late' : 'present';

        const newRecord = await db.insert(gateAttendance).values({
            studentId, schoolId, date: today, checkInTime: currentTime, checkInMethod: method, status
        }).returning();

        // G4: Notify Parent
        const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
        if (student) {
            await this.notifyGuardian(student, 'check-in', currentTime);
        }

        return { ...newRecord[0], checkInTime: currentTime, status };
    }

    async checkOut(schoolId: number, studentId: number, method: string = 'manual') {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

        const existing = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.studentId, studentId), eq(gateAttendance.date, today), eq(gateAttendance.schoolId, schoolId))).limit(1);

        if (existing.length === 0) throw new Error("Student not checked in today");

        // Detect left_early if checkout is before school end time
        const settings = await this.getSettings(schoolId);
        const leftEarly = currentTime < settings.schoolEndTime;

        const updateData: Record<string, any> = { checkOutTime: currentTime, checkOutMethod: method };
        if (leftEarly) {
            updateData.status = 'left_early';
        }

        const updated = await db.update(gateAttendance)
            .set(updateData)
            .where(eq(gateAttendance.id, existing[0].id)).returning();

        // G4: Notify Parent
        const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
        if (student) {
            await this.notifyGuardian(student, 'check-out', currentTime);
        }

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

            // G4: Notify Parent
            await this.notifyGuardian(student, 'absent', targetDate);

            markedCount++;
        }
        return markedCount;
    }

    /** G5: Get attendance summary grouped by class level */
    async getAttendanceSummaryByClass(schoolId: number, date: string) {
        const allStudents = await db.select({
            id: students.id,
            classLevel: students.classLevel,
            stream: students.stream,
        }).from(students).where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

        const records = await db.select().from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, date)));

        const recordMap = new Map(records.map(r => [r.studentId, r]));

        // Group by classLevel
        const classMap: Record<string, { total: number; present: number; late: number; absent: number; leftEarly: number }> = {};

        for (const student of allStudents) {
            const classKey = student.classLevel || 'Unknown';
            if (!classMap[classKey]) classMap[classKey] = { total: 0, present: 0, late: 0, absent: 0, leftEarly: 0 };

            classMap[classKey].total++;
            const record = recordMap.get(student.id);
            if (!record) {
                classMap[classKey].absent++;
            } else if (record.status === 'present') {
                classMap[classKey].present++;
            } else if (record.status === 'late') {
                classMap[classKey].late++;
            } else if (record.status === 'left_early') {
                classMap[classKey].leftEarly++;
            } else if (record.status === 'absent') {
                classMap[classKey].absent++;
            }
        }

        return Object.entries(classMap)
            .map(([classLevel, stats]) => ({ classLevel, ...stats }))
            .sort((a, b) => a.classLevel.localeCompare(b.classLevel));
    }

    /** G6: Generate QR code data for student gate scanning */
    async getStudentQRData(schoolId: number, studentId: number) {
        const [student] = await db.select({
            id: students.id,
            name: students.name,
            classLevel: students.classLevel,
            indexNumber: students.indexNumber,
        }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

        if (!student) throw new Error("Student not found");

        return {
            type: 'gate_attendance',
            studentId: student.id,
            name: student.name,
            classLevel: student.classLevel,
            indexNumber: student.indexNumber,
        };
    }

    /** G3: Auto mark-absent at scheduled time — returns count for logging/notification */
    async scheduleAutoAbsent(schoolId: number) {
        const today = new Date().toISOString().split('T')[0];
        const markedCount = await this.markAbsent(schoolId, today);
        return {
            date: today,
            markedAbsent: markedCount,
            scheduledAt: new Date().toISOString(),
        };
    }
}

export const attendanceService = new AttendanceService();

