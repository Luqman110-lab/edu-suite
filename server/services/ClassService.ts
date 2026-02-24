import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { teacherAssignments, classStreams, teachers, students, marks, gateAttendance } from "../../shared/schema";

export class ClassService {
    // ==========================================
    // STREAM MANAGEMENT (FEATURE 3)
    // ==========================================

    static async getStreams(schoolId: number) {
        return await db.select().from(classStreams).where(eq(classStreams.schoolId, schoolId)).orderBy(classStreams.sortOrder);
    }

    static async createStream(schoolId: number, classLevel: string, streamName: string, maxCapacity: number = 60) {
        const existing = await db.query.classStreams.findFirst({
            where: and(
                eq(classStreams.schoolId, schoolId),
                eq(classStreams.classLevel, classLevel),
                eq(classStreams.streamName, streamName)
            )
        });

        if (existing) {
            throw new Error(`Stream ${streamName} already exists in class ${classLevel}`);
        }

        const [newStream] = await db.insert(classStreams).values({
            schoolId,
            classLevel,
            streamName,
            maxCapacity,
            sortOrder: 0
        }).returning();

        return newStream;
    }

    static async updateStreamCapacity(id: number, schoolId: number, maxCapacity: number) {
        const [updated] = await db.update(classStreams)
            .set({ maxCapacity })
            .where(and(eq(classStreams.id, id), eq(classStreams.schoolId, schoolId)))
            .returning();

        if (!updated) {
            throw new Error("Stream not found or unauthorized");
        }

        return updated;
    }

    static async deleteStream(id: number, schoolId: number) {
        const [deleted] = await db.delete(classStreams)
            .where(and(eq(classStreams.id, id), eq(classStreams.schoolId, schoolId)))
            .returning();

        if (!deleted) {
            throw new Error("Stream not found or unauthorized");
        }

        return deleted;
    }

    // ==========================================
    // TEACHER ASSIGNMENTS (FEATURE 1 & 2)
    // ==========================================

    static async getAssignments(schoolId: number, term: number, year: number) {
        return await db.select({
            assignment: teacherAssignments,
            teacher: {
                id: teachers.id,
                name: teachers.name,
            }
        })
            .from(teacherAssignments)
            .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
            .where(
                and(
                    eq(teacherAssignments.schoolId, schoolId),
                    eq(teacherAssignments.term, term),
                    eq(teacherAssignments.year, year),
                    eq(teacherAssignments.isActive, true)
                )
            );
    }

    static async assignClassTeacher(schoolId: number, teacherId: number, classLevel: string, stream: string, term: number, year: number) {
        // Check if there is already a class teacher
        const existing = await db.query.teacherAssignments.findFirst({
            where: and(
                eq(teacherAssignments.schoolId, schoolId),
                eq(teacherAssignments.classLevel, classLevel),
                eq(teacherAssignments.stream, stream),
                eq(teacherAssignments.role, "class_teacher"),
                eq(teacherAssignments.term, term),
                eq(teacherAssignments.year, year)
            )
        });

        if (existing) {
            // Update existing
            const [updated] = await db.update(teacherAssignments)
                .set({ teacherId })
                .where(eq(teacherAssignments.id, existing.id))
                .returning();
            return updated;
        }

        // Insert new
        const [newAssignment] = await db.insert(teacherAssignments).values({
            schoolId,
            teacherId,
            classLevel,
            stream,
            subject: null,
            role: "class_teacher",
            term,
            year,
            isActive: true
        }).returning();

        return newAssignment;
    }

    static async assignSubjectTeacher(schoolId: number, teacherId: number, classLevel: string, stream: string, subject: string, term: number, year: number) {
        // Check if there is already a teacher for this specific subject
        const existing = await db.query.teacherAssignments.findFirst({
            where: and(
                eq(teacherAssignments.schoolId, schoolId),
                eq(teacherAssignments.classLevel, classLevel),
                eq(teacherAssignments.stream, stream),
                eq(teacherAssignments.subject, subject),
                eq(teacherAssignments.role, "subject_teacher"),
                eq(teacherAssignments.term, term),
                eq(teacherAssignments.year, year)
            )
        });

        if (existing) {
            // Update existing
            const [updated] = await db.update(teacherAssignments)
                .set({ teacherId })
                .where(eq(teacherAssignments.id, existing.id))
                .returning();
            return updated;
        }

        // Insert new
        const [newAssignment] = await db.insert(teacherAssignments).values({
            schoolId,
            teacherId,
            classLevel,
            stream,
            subject,
            role: "subject_teacher",
            term,
            year,
            isActive: true
        }).returning();

        return newAssignment;
    }

    static async removeAssignment(id: number, schoolId: number) {
        const [deleted] = await db.delete(teacherAssignments)
            .where(and(eq(teacherAssignments.id, id), eq(teacherAssignments.schoolId, schoolId)))
            .returning();

        if (!deleted) {
            throw new Error("Assignment not found or unauthorized");
        }

        return deleted;
    }

    // ==========================================
    // CLASS OVERVIEW (FEATURE 5)
    // ==========================================

    static async getClassStats(schoolId: number, classLevel: string, stream: string, term: number, year: number) {
        // 1. Enrollment stats
        const allStudents = await db.select({
            gender: students.gender
        }).from(students).where(
            and(
                eq(students.schoolId, schoolId),
                eq(students.classLevel, classLevel),
                eq(students.stream, stream),
                eq(students.isActive, true)
            )
        );

        const totalStudents = allStudents.length;
        const boys = allStudents.filter(s => s.gender === 'M').length;
        const girls = allStudents.filter(s => s.gender === 'F').length;

        // 2. Academic Performance (Average per subject for this class)
        const classMarks = await db.select({
            marks: marks.marks
        }).from(marks).where(
            and(
                eq(marks.schoolId, schoolId),
                eq(marks.classLevel, classLevel),
                eq(marks.stream, stream),
                eq(marks.term, term),
                eq(marks.year, year)
            )
        );

        const subjects = ['english', 'maths', 'science', 'sst', 'literacy1', 'literacy2'];
        const totals: Record<string, { sum: number, count: number }> = {};
        subjects.forEach(sub => totals[sub] = { sum: 0, count: 0 });

        classMarks.forEach(record => {
            const m = record.marks as any;
            if (m) {
                subjects.forEach(sub => {
                    const val = m[sub];
                    if (typeof val === 'number') {
                        totals[sub].sum += val;
                        totals[sub].count++;
                    }
                });
            }
        });

        const academicAverages = subjects.map(sub => ({
            subject: sub.charAt(0).toUpperCase() + sub.slice(1),
            average: totals[sub].count > 0 ? Math.round(totals[sub].sum / totals[sub].count) : 0
        })).filter(d => d.count > 0 || d.average > 0);

        // 3. Today's Attendance
        const today = new Date().toISOString().split('T')[0];
        // We need student IDs to check attendance
        const studentIds = await db.select({ id: students.id }).from(students).where(
            and(
                eq(students.schoolId, schoolId),
                eq(students.classLevel, classLevel),
                eq(students.stream, stream),
                eq(students.isActive, true)
            )
        );

        let presentCount = 0;
        if (studentIds.length > 0) {
            const ids = studentIds.map(s => s.id);
            // Since Drizzle 'inArray' can be tricky, let's fetch all attendance for the school today and filter
            const todayAttendance = await db.select({
                studentId: gateAttendance.studentId,
                status: gateAttendance.status
            }).from(gateAttendance).where(
                and(
                    eq(gateAttendance.schoolId, schoolId),
                    eq(gateAttendance.date, today)
                )
            );

            presentCount = todayAttendance.filter(a => ids.includes(a.studentId) && a.status === 'present').length;
        }

        const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        return {
            enrollment: {
                total: totalStudents,
                boys,
                girls
            },
            academic: academicAverages,
            attendance: {
                presentToday: presentCount,
                absentToday: totalStudents - presentCount,
                rate: attendanceRate
            }
        };
    }
}
