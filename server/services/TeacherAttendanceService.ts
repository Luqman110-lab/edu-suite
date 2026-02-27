import { db } from "../db";
import { teacherAttendance, schools } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const SETTINGS_DEFAULTS = {
    schoolStartTime: "08:00",
    lateThresholdMinutes: 15,
    schoolEndTime: "16:00",
};

/** Read attendance settings from the school record, with defaults fallback */
async function getAttendanceSettings(schoolId: number) {
    const [school] = await db.select({ attendanceSettings: schools.attendanceSettings })
        .from(schools).where(eq(schools.id, schoolId)).limit(1);
    return { ...SETTINGS_DEFAULTS, ...(school?.attendanceSettings || {}) };
}

/** Add minutes to a "HH:MM" string and return "HH:MM" */
function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export class TeacherAttendanceService {
    /**
     * Get all teacher attendance records for a school on a specific date.
     */
    async getAttendance(schoolId: number, date: string) {
        return db
            .select()
            .from(teacherAttendance)
            .where(
                and(
                    eq(teacherAttendance.schoolId, schoolId),
                    eq(teacherAttendance.date, date)
                )
            );
    }

    /**
     * Check in a teacher. Calculates late status based on settings.
     */
    async checkIn(
        schoolId: number,
        teacherId: number,
        method: string = "manual",
        locationData?: {
            latitude?: number;
            longitude?: number;
            accuracy?: number;
            distance?: number;
        }
    ) {
        const today = new Date().toISOString().split("T")[0];
        const currentTime = new Date()
            .toTimeString()
            .split(" ")[0]
            .slice(0, 5);

        // Check for existing record
        const existing = await db
            .select()
            .from(teacherAttendance)
            .where(
                and(
                    eq(teacherAttendance.schoolId, schoolId),
                    eq(teacherAttendance.teacherId, teacherId),
                    eq(teacherAttendance.date, today)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            throw new Error("Teacher already checked in today");
        }

        // Calculate late status from settings
        const settings = await getAttendanceSettings(schoolId);
        const lateThreshold = addMinutes(
            settings.schoolStartTime,
            settings.lateThresholdMinutes
        );
        const status = currentTime > lateThreshold ? "late" : "present";

        const [record] = await db
            .insert(teacherAttendance)
            .values({
                schoolId,
                teacherId,
                date: today,
                checkInTime: currentTime,
                checkInMethod: method,
                status,
                checkInLatitude: locationData?.latitude ?? null,
                checkInLongitude: locationData?.longitude ?? null,
                checkInAccuracy: locationData?.accuracy ?? null,
                checkInDistance: locationData?.distance ?? null,
            })
            .returning();

        return record;
    }

    /**
     * Check out a teacher. Sets left_early status if before school end time.
     */
    async checkOut(
        schoolId: number,
        teacherId: number,
        method: string = "manual"
    ) {
        const today = new Date().toISOString().split("T")[0];
        const currentTime = new Date()
            .toTimeString()
            .split(" ")[0]
            .slice(0, 5);

        const existing = await db
            .select()
            .from(teacherAttendance)
            .where(
                and(
                    eq(teacherAttendance.schoolId, schoolId),
                    eq(teacherAttendance.teacherId, teacherId),
                    eq(teacherAttendance.date, today)
                )
            )
            .limit(1);

        if (existing.length === 0) {
            throw new Error("Teacher not checked in today");
        }

        // Determine if leaving early
        const settings = await getAttendanceSettings(schoolId);
        const leftEarly = currentTime < settings.schoolEndTime;

        const updateData: Record<string, any> = {
            checkOutTime: currentTime,
            checkOutMethod: method,
        };

        // Only override status to left_early if they weren't on_leave
        if (leftEarly && existing[0].status !== "on_leave") {
            updateData.status = "left_early";
        }

        const [updated] = await db
            .update(teacherAttendance)
            .set(updateData)
            .where(eq(teacherAttendance.id, existing[0].id))
            .returning();

        return updated;
    }

    /**
     * Mark a teacher as on leave for a specific date.
     */
    async markLeave(
        schoolId: number,
        teacherId: number,
        date: string,
        leaveType: string,
        notes?: string
    ) {
        // Check for existing record on this date
        const existing = await db
            .select()
            .from(teacherAttendance)
            .where(
                and(
                    eq(teacherAttendance.schoolId, schoolId),
                    eq(teacherAttendance.teacherId, teacherId),
                    eq(teacherAttendance.date, date)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            // Update existing record to on_leave
            const [updated] = await db
                .update(teacherAttendance)
                .set({
                    status: "on_leave",
                    leaveType,
                    notes: notes || null,
                })
                .where(eq(teacherAttendance.id, existing[0].id))
                .returning();
            return updated;
        }

        // Insert new on_leave record
        const [record] = await db
            .insert(teacherAttendance)
            .values({
                schoolId,
                teacherId,
                date,
                status: "on_leave",
                leaveType,
                notes: notes || null,
            })
            .returning();

        return record;
    }
}

export const teacherAttendanceService = new TeacherAttendanceService();
