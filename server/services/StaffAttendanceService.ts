import { db } from "../db";
import { staffAttendance } from "../../shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import type { InsertStaffAttendance, StaffAttendance } from "../../shared/schema";

export class StaffAttendanceService {
    async getAttendanceByDate(schoolId: number, dateString: string): Promise<StaffAttendance[]> {
        const startOfDay = new Date(dateString);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateString);
        endOfDay.setHours(23, 59, 59, 999);

        return db
            .select()
            .from(staffAttendance)
            .where(
                and(
                    eq(staffAttendance.schoolId, schoolId),
                    gte(staffAttendance.date, startOfDay),
                    lte(staffAttendance.date, endOfDay)
                )
            )
            .orderBy(desc(staffAttendance.createdAt));
    }

    async getTeacherAttendanceStats(schoolId: number, teacherId: number, fromDate: Date, toDate: Date): Promise<StaffAttendance[]> {
        return db
            .select()
            .from(staffAttendance)
            .where(
                and(
                    eq(staffAttendance.schoolId, schoolId),
                    eq(staffAttendance.teacherId, teacherId),
                    gte(staffAttendance.date, fromDate),
                    lte(staffAttendance.date, toDate)
                )
            )
            .orderBy(desc(staffAttendance.date));
    }

    async recordAttendance(schoolId: number, data: InsertStaffAttendance): Promise<StaffAttendance> {
        // Check if attendance already exists for this teacher on this date
        const startOfDay = new Date(data.date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(data.date);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await db
            .select()
            .from(staffAttendance)
            .where(
                and(
                    eq(staffAttendance.schoolId, schoolId),
                    eq(staffAttendance.teacherId, data.teacherId),
                    gte(staffAttendance.date, startOfDay),
                    lte(staffAttendance.date, endOfDay)
                )
            );

        if (existing.length > 0) {
            // Update existing record
            const [updated] = await db
                .update(staffAttendance)
                .set(data)
                .where(eq(staffAttendance.id, existing[0].id))
                .returning();
            return updated;
        }

        // Insert new record
        const [attendance] = await db
            .insert(staffAttendance)
            .values({ ...data, schoolId })
            .returning();

        return attendance;
    }
}

export const staffAttendanceService = new StaffAttendanceService();
