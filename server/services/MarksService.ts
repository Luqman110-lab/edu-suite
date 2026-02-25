import { db } from "../db";
import { marks, InsertMark } from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export class MarksService {
    async getMarks(schoolId: number, year?: number) {
        let query = db.select().from(marks).where(eq(marks.schoolId, schoolId));
        if (year) {
            query = query.where(eq(marks.year, year)) as any;
        }
        return await query;
    }

    async saveMark(schoolId: number, data: Omit<InsertMark, 'id' | 'schoolId' | 'createdAt'>) {
        const [saved] = await db.insert(marks).values({
            ...data,
            schoolId
        }).onConflictDoUpdate({
            target: [marks.studentId, marks.term, marks.year, marks.type],
            set: {
                marks: data.marks,
                aggregate: data.aggregate,
                division: data.division,
                comment: data.comment,
                status: data.status
            }
        }).returning();
        return saved;
    }

    async saveMarksBatch(schoolId: number, data: Omit<InsertMark, 'id' | 'schoolId' | 'createdAt'>[]) {
        if (!data.length) return [];

        const valuesToInsert = data.map(m => ({ ...m, schoolId }));

        // Upsert all marks using targeted EXCLUDED syntax to avoid wiping identifiers
        const saved = await db.insert(marks).values(valuesToInsert).onConflictDoUpdate({
            target: [marks.studentId, marks.term, marks.year, marks.type],
            set: {
                marks: sql`EXCLUDED.marks`,
                aggregate: sql`EXCLUDED.aggregate`,
                division: sql`EXCLUDED.division`,
                comment: sql`EXCLUDED.comment`,
                status: sql`EXCLUDED.status`
            }
        }).returning();

        return saved;
    }

    async deleteMarksBatch(schoolId: number, studentIds: number[], term: number, year: number, type: string) {
        if (!studentIds.length) return { deleted: 0 };
        const result = await db.delete(marks)
            .where(and(
                eq(marks.schoolId, schoolId),
                inArray(marks.studentId, studentIds),
                eq(marks.term, term),
                eq(marks.year, year),
                eq(marks.type, type)
            )).returning();
        return { deleted: result.length };
    }
}

export const marksService = new MarksService();
