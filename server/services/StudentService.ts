import { db } from "../db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import {
    students, promotionHistory, studentYearSnapshots, auditLogs, schools, classStreams
} from "../../shared/schema";

export class StudentService {

    async getStudents(schoolId: number, year?: number) {
        if (year) {
            return await db.select({
                id: students.id,
                name: students.name,
                indexNumber: students.indexNumber,
                classLevel: studentYearSnapshots.classLevel,
                stream: studentYearSnapshots.stream,
                gender: students.gender,
                dateOfBirth: students.dateOfBirth,
                boardingStatus: studentYearSnapshots.boardingStatus,
                parentName: students.parentName,
                parentContact: students.parentContact,
                photoBase64: students.photoBase64,
                isActive: studentYearSnapshots.isActive,
                schoolId: students.schoolId,
            })
                .from(studentYearSnapshots)
                .innerJoin(students, eq(studentYearSnapshots.studentId, students.id))
                .where(and(
                    eq(studentYearSnapshots.schoolId, schoolId),
                    eq(studentYearSnapshots.year, year)
                ))
                .orderBy(students.name);
        }

        return await db.select().from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
            .orderBy(students.name);
    }

    async getStudentById(id: number, schoolId: number) {
        const result = await db.select().from(students)
            .where(and(eq(students.id, id), eq(students.schoolId, schoolId))).limit(1);
        return result[0];
    }

    async createStudent(schoolId: number, userId: number, userName: string, data: any) {
        if (data.classLevel && data.stream && !data.forceCapacityOverride) {
            const streamInfo = await db.query.classStreams.findFirst({
                where: and(
                    eq(classStreams.schoolId, schoolId),
                    eq(classStreams.classLevel, data.classLevel),
                    eq(classStreams.streamName, data.stream)
                )
            });

            if (streamInfo) {
                const currentCount = await db.select({ count: sql<number>`count(*)::int` })
                    .from(students)
                    .where(and(
                        eq(students.schoolId, schoolId),
                        eq(students.classLevel, data.classLevel),
                        eq(students.stream, data.stream),
                        eq(students.isActive, true)
                    ));

                if (currentCount[0].count >= streamInfo.maxCapacity) {
                    throw new Error(`CAPACITY_WARNING: Stream ${data.stream} is at maximum capacity (${streamInfo.maxCapacity}).`);
                }
            }
        }

        const autoIndex = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record: Record<string, unknown> = {
            indexNumber: autoIndex,
            name: data.name,
            classLevel: data.classLevel,
            stream: data.stream,
            gender: data.gender,
            schoolId,
            isActive: true,
        };

        const optionalFields = [
            'paycode', 'parentName', 'parentContact', 'dateOfBirth', 'nationality', 'religion',
            'photoBase64', 'admissionDate', 'admissionNumber', 'previousSchool', 'boardingStatus',
            'houseOrDormitory', 'medicalInfo', 'emergencyContacts', 'specialCases'
        ];

        for (const field of optionalFields) {
            if (data[field] !== undefined) record[field] = data[field];
        }

        // Special handling for emergencyContacts validation if needed
        if (data.emergencyContacts && Array.isArray(data.emergencyContacts) && data.emergencyContacts.some((c: any) => c.name)) {
            record.emergencyContacts = data.emergencyContacts;
        }

        const newStudent = await db.insert(students).values(record as typeof students.$inferInsert).returning();

        await db.insert(auditLogs).values({
            userId, userName, action: 'create', entityType: 'student',
            entityId: newStudent[0].id, entityName: newStudent[0].name,
            details: { indexNumber: newStudent[0].indexNumber, class: newStudent[0].classLevel },
            ipAddress: '127.0.0.1' // In a service method, req object is not available directly
        });

        return newStudent[0];
    }

    async updateStudent(id: number, schoolId: number, userId: number, userName: string, data: any) {
        if (data.classLevel && data.stream && !data.forceCapacityOverride) {
            const streamInfo = await db.query.classStreams.findFirst({
                where: and(
                    eq(classStreams.schoolId, schoolId),
                    eq(classStreams.classLevel, data.classLevel),
                    eq(classStreams.streamName, data.stream)
                )
            });

            if (streamInfo) {
                // Check if student is already in this stream, if so skip count
                const existing = await this.getStudentById(id, schoolId);
                if (!existing || existing.classLevel !== data.classLevel || existing.stream !== data.stream) {
                    const currentCount = await db.select({ count: sql<number>`count(*)::int` })
                        .from(students)
                        .where(and(
                            eq(students.schoolId, schoolId),
                            eq(students.classLevel, data.classLevel),
                            eq(students.stream, data.stream),
                            eq(students.isActive, true)
                        ));

                    if (currentCount[0].count >= streamInfo.maxCapacity) {
                        throw new Error(`CAPACITY_WARNING: Stream ${data.stream} is at maximum capacity (${streamInfo.maxCapacity}).`);
                    }
                }
            }
        }

        const updated = await db.update(students).set({ ...data, schoolId }).where(eq(students.id, id)).returning();

        if (updated.length > 0) {
            await db.insert(auditLogs).values({
                userId, userName, action: 'update', entityType: 'student',
                entityId: id, entityName: updated[0].name,
                details: { changes: Object.keys(data) }, ipAddress: '127.0.0.1'
            });
            return updated[0];
        }
        return null;
    }

    async deleteStudent(id: number, schoolId: number, userId: number, userName: string) {
        const existing = await this.getStudentById(id, schoolId);
        if (!existing) return false;

        await db.update(students).set({ isActive: false }).where(eq(students.id, id));

        await db.insert(auditLogs).values({
            userId, userName, action: 'delete', entityType: 'student',
            entityId: id, entityName: existing.name,
            details: { type: 'soft_delete' }, ipAddress: '127.0.0.1'
        });

        return true;
    }

    async batchDeleteStudents(schoolId: number, ids: number[], userId: number, userName: string) {
        await db.update(students).set({ isActive: false })
            .where(and(eq(students.schoolId, schoolId), inArray(students.id, ids)));

        await db.insert(auditLogs).values({
            userId, userName, action: 'delete_batch', entityType: 'student',
            entityId: 0, entityName: 'Batch Students',
            details: { count: ids.length, ids }, ipAddress: '127.0.0.1'
        });
    }

    async batchImportStudents(schoolId: number, studentsData: any[]) {
        const created = await db.insert(students).values(studentsData.map((s: any) => {
            const autoIndex = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const record: Record<string, unknown> = {
                indexNumber: s.indexNumber || autoIndex,
                name: s.name, classLevel: s.classLevel, stream: s.stream,
                gender: s.gender, isActive: true, schoolId,
            };
            const optionalFields = [
                'paycode', 'parentName', 'parentContact', 'dateOfBirth', 'nationality', 'religion',
                'photoBase64', 'admissionDate', 'admissionNumber', 'previousSchool', 'boardingStatus',
                'houseOrDormitory', 'medicalInfo', 'emergencyContacts', 'specialCases'
            ];
            for (const field of optionalFields) {
                if (s[field] !== undefined) record[field] = s[field];
            }
            return record as typeof students.$inferInsert;
        })).onConflictDoNothing().returning();

        return created;
    }

    async promoteStudents(schoolId: number, studentIds: number[], targetStream: string, promotedBy: number) {
        const activeStudents = await db.select().from(students)
            .where(and(inArray(students.id, studentIds), eq(students.schoolId, schoolId)));

        let promotedCount = 0, graduatedCount = 0, skippedCount = 0;
        const classMap: Record<string, string> = {
            'Baby': 'Middle', 'Middle': 'Top', 'Top': 'P1',
            'P1': 'P2', 'P2': 'P3', 'P3': 'P4', 'P4': 'P5', 'P5': 'P6', 'P6': 'P7',
            'P7': 'Alumni'
        };

        for (const student of activeStudents) {
            const currentClass = student.classLevel;
            const nextClass = classMap[currentClass];
            if (!nextClass) { skippedCount++; continue; }

            const isGraduating = currentClass === 'P7';
            const updates: any = { classLevel: nextClass, stream: targetStream || student.stream };
            if (isGraduating) { graduatedCount++; } else { promotedCount++; }

            await db.update(students).set(updates).where(eq(students.id, student.id));
            await db.insert(promotionHistory).values({
                schoolId, studentId: student.id, fromClass: currentClass, toClass: nextClass,
                fromStream: student.stream, toStream: updates.stream,
                academicYear: new Date().getFullYear(), term: 1, promotedBy
            });
        }

        return { promotedCount, graduatedCount, skippedCount };
    }

    async searchStudents(schoolId: number, query: string, filters: { classLevel?: string, stream?: string, boardingStatus?: string, sortBy?: string, sortOrder?: string }) {
        const conditions: any[] = [eq(students.schoolId, schoolId), eq(students.isActive, true)];

        if (query && query.length > 0) conditions.push(sql`LOWER(${students.name}) LIKE ${`%${query.toLowerCase()}%`}`);
        if (filters.classLevel) conditions.push(eq(students.classLevel, filters.classLevel));
        if (filters.stream) conditions.push(sql`LOWER(${students.stream}) = ${filters.stream.toLowerCase()}`);
        if (filters.boardingStatus) conditions.push(sql`LOWER(${students.boardingStatus}) = ${filters.boardingStatus.toLowerCase()}`);

        const sortBy = filters.sortBy || 'name';
        const sortOrder = filters.sortOrder || 'asc';
        let orderByClause: any;

        switch (sortBy) {
            case 'classLevel': orderByClause = sortOrder === 'desc' ? desc(students.classLevel) : asc(students.classLevel); break;
            case 'stream': orderByClause = sortOrder === 'desc' ? desc(students.stream) : asc(students.stream); break;
            case 'boardingStatus': orderByClause = sortOrder === 'desc' ? desc(students.boardingStatus) : asc(students.boardingStatus); break;
            default: orderByClause = sortOrder === 'desc' ? desc(students.name) : asc(students.name);
        }

        return await db.select().from(students).where(and(...conditions)).orderBy(orderByClause).limit(50);
    }

    async verifyStudent(id: number) {
        const studentData = await db.select({ student: students, schoolName: schools.name })
            .from(students).leftJoin(schools, eq(students.schoolId, schools.id))
            .where(eq(students.id, id)).limit(1);

        if (!studentData.length) return null;

        const { student, schoolName } = studentData[0];
        return {
            valid: true,
            student: {
                name: student.name, photoBase64: student.photoBase64,
                classLevel: student.classLevel, stream: student.stream,
                schoolName: schoolName || "Unknown School",
                status: (student as any).isActive ? "Active" : "Inactive",
                indexNumber: student.indexNumber
            }
        };
    }
}

export const studentService = new StudentService();
