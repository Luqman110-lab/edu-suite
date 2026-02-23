import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { teacherAssignments, classStreams, teachers } from "../../shared/schema";

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
}
