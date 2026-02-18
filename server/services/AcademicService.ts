import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { testSessions, testScores } from "../../shared/schema";

export class AcademicService {

    async getTestSessions(schoolId: number) {
        return await db.select().from(testSessions)
            .where(and(eq(testSessions.schoolId, schoolId), eq(testSessions.isActive, true)))
            .orderBy(desc(testSessions.testDate));
    }

    async createTestSession(schoolId: number, data: any) {
        const { name, testType, classLevel, stream, term, year, testDate, maxMarks } = data;

        const [newSession] = await db.insert(testSessions).values({
            schoolId,
            name,
            testType,
            classLevel,
            stream: stream || null,
            term: parseInt(term),
            year: parseInt(year),
            testDate,
            maxMarks,
            isActive: true
        }).returning();

        return newSession;
    }

    async updateTestSession(id: number, schoolId: number, data: any) {
        // Verify ownership
        const existing = await db.select().from(testSessions)
            .where(and(eq(testSessions.id, id), eq(testSessions.schoolId, schoolId)))
            .limit(1);

        if (!existing.length) throw new Error("Test session not found");

        const { name, testType, classLevel, stream, term, year, testDate, maxMarks, isActive } = data;
        const safeUpdate: Record<string, any> = {};
        if (name !== undefined) safeUpdate.name = name;
        if (testType !== undefined) safeUpdate.testType = testType;
        if (classLevel !== undefined) safeUpdate.classLevel = classLevel;
        if (stream !== undefined) safeUpdate.stream = stream;
        if (term !== undefined) safeUpdate.term = term;
        if (year !== undefined) safeUpdate.year = year;
        if (testDate !== undefined) safeUpdate.testDate = testDate;
        if (maxMarks !== undefined) safeUpdate.maxMarks = maxMarks;
        if (isActive !== undefined) safeUpdate.isActive = isActive;

        const [updated] = await db.update(testSessions)
            .set(safeUpdate)
            .where(eq(testSessions.id, id))
            .returning();

        return updated;
    }

    async deleteTestSession(id: number, schoolId: number) {
        const existing = await db.select().from(testSessions)
            .where(and(eq(testSessions.id, id), eq(testSessions.schoolId, schoolId)))
            .limit(1);

        if (!existing.length) throw new Error("Test session not found");

        await db.update(testSessions)
            .set({ isActive: false })
            .where(eq(testSessions.id, id));

        return true;
    }

    async getTestScores(sessionId: number, schoolId: number) {
        // Verify the session belongs to the active school
        const session = await db.select().from(testSessions)
            .where(and(eq(testSessions.id, sessionId), eq(testSessions.schoolId, schoolId)))
            .limit(1);

        if (!session.length) throw new Error("Test session not found");

        return await db.select().from(testScores)
            .where(eq(testScores.testSessionId, sessionId));
    }

    async batchSaveTestScores(schoolId: number, scores: any[]) {
        const savedScores = [];

        for (const score of scores) {
            const { testSessionId, studentId, rawMarks, convertedMarks, aggregate, division } = score;

            // Check if exists
            const existing = await db.select().from(testScores)
                .where(and(
                    eq(testScores.testSessionId, testSessionId),
                    eq(testScores.studentId, studentId)
                ))
                .limit(1);

            if (existing.length > 0) {
                // Update
                const [updated] = await db.update(testScores)
                    .set({
                        rawMarks,
                        convertedMarks,
                        aggregate,
                        division
                    })
                    .where(eq(testScores.id, existing[0].id))
                    .returning();
                savedScores.push(updated);
            } else {
                // Insert
                const [inserted] = await db.insert(testScores).values({
                    schoolId,
                    testSessionId,
                    studentId,
                    rawMarks,
                    convertedMarks,
                    aggregate,
                    division
                }).returning();
                savedScores.push(inserted);
            }
        }
        return savedScores;
    }
}

export const academicService = new AcademicService();
