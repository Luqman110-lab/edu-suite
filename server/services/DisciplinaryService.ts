import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { teacherDisciplinaryRecords } from '../../shared/schema';
import { TeacherDisciplinaryRecord } from '../../types';

export class DisciplinaryService {
    async getRecords(schoolId: number, teacherId: number): Promise<TeacherDisciplinaryRecord[]> {
        const records = await db
            .select()
            .from(teacherDisciplinaryRecords)
            .where(
                and(
                    eq(teacherDisciplinaryRecords.schoolId, schoolId),
                    eq(teacherDisciplinaryRecords.teacherId, teacherId)
                )
            )
            .orderBy(desc(teacherDisciplinaryRecords.incidentDate));

        return records.map(r => ({
            ...r,
            incidentDate: r.incidentDate.toISOString(),
            actionTaken: r.actionTaken as TeacherDisciplinaryRecord['actionTaken'],
            status: r.status as TeacherDisciplinaryRecord['status'],
            createdAt: r.createdAt?.toISOString(),
            updatedAt: r.updatedAt?.toISOString()
        }));
    }

    async createRecord(schoolId: number, recordData: TeacherDisciplinaryRecord): Promise<TeacherDisciplinaryRecord> {
        const [record] = await db
            .insert(teacherDisciplinaryRecords)
            .values({
                schoolId,
                teacherId: recordData.teacherId,
                incidentDate: new Date(recordData.incidentDate),
                incidentDescription: recordData.incidentDescription,
                actionTaken: recordData.actionTaken,
                status: recordData.status || 'Open',
                reportedBy: recordData.reportedBy,
            })
            .returning();

        return {
            ...record,
            incidentDate: record.incidentDate.toISOString(),
            actionTaken: record.actionTaken as TeacherDisciplinaryRecord['actionTaken'],
            status: record.status as TeacherDisciplinaryRecord['status'],
            createdAt: record.createdAt?.toISOString(),
            updatedAt: record.updatedAt?.toISOString()
        };
    }

    async updateRecord(id: number, schoolId: number, updateData: Partial<TeacherDisciplinaryRecord>): Promise<TeacherDisciplinaryRecord> {
        const updates: any = { updatedAt: new Date() };
        if (updateData.incidentDate) updates.incidentDate = new Date(updateData.incidentDate);
        if (updateData.incidentDescription) updates.incidentDescription = updateData.incidentDescription;
        if (updateData.actionTaken) updates.actionTaken = updateData.actionTaken;
        if (updateData.status) updates.status = updateData.status;
        if (updateData.reportedBy !== undefined) updates.reportedBy = updateData.reportedBy;

        const [record] = await db
            .update(teacherDisciplinaryRecords)
            .set(updates)
            .where(
                and(
                    eq(teacherDisciplinaryRecords.id, id),
                    eq(teacherDisciplinaryRecords.schoolId, schoolId)
                )
            )
            .returning();

        if (!record) {
            throw new Error('Disciplinary record not found');
        }

        return {
            ...record,
            incidentDate: record.incidentDate.toISOString(),
            actionTaken: record.actionTaken as TeacherDisciplinaryRecord['actionTaken'],
            status: record.status as TeacherDisciplinaryRecord['status'],
            createdAt: record.createdAt?.toISOString(),
            updatedAt: record.updatedAt?.toISOString()
        };
    }

    async deleteRecord(id: number, schoolId: number): Promise<void> {
        await db
            .delete(teacherDisciplinaryRecords)
            .where(
                and(
                    eq(teacherDisciplinaryRecords.id, id),
                    eq(teacherDisciplinaryRecords.schoolId, schoolId)
                )
            );
    }
}

export const disciplinaryService = new DisciplinaryService();
