import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { teacherAppraisals } from '../../shared/schema';
import { TeacherAppraisal } from '../../types';

export class AppraisalService {
    async getAppraisals(schoolId: number, teacherId: number): Promise<TeacherAppraisal[]> {
        const records = await db
            .select()
            .from(teacherAppraisals)
            .where(
                and(
                    eq(teacherAppraisals.schoolId, schoolId),
                    eq(teacherAppraisals.teacherId, teacherId)
                )
            )
            .orderBy(desc(teacherAppraisals.appraisalDate));

        return records.map(r => ({
            ...r,
            appraisalDate: r.appraisalDate.toISOString(),
            status: r.status as TeacherAppraisal['status'],
            createdAt: r.createdAt?.toISOString(),
            updatedAt: r.updatedAt?.toISOString()
        }));
    }

    async createAppraisal(schoolId: number, appraisal: TeacherAppraisal): Promise<TeacherAppraisal> {
        const [record] = await db
            .insert(teacherAppraisals)
            .values({
                schoolId,
                teacherId: appraisal.teacherId,
                appraisalDate: new Date(appraisal.appraisalDate),
                evaluatorId: appraisal.evaluatorId,
                score: appraisal.score,
                feedback: appraisal.feedback,
                areasOfImprovement: appraisal.areasOfImprovement,
                status: appraisal.status || 'Draft',
            })
            .returning();

        return {
            ...record,
            appraisalDate: record.appraisalDate.toISOString(),
            status: record.status as TeacherAppraisal['status'],
            createdAt: record.createdAt?.toISOString(),
            updatedAt: record.updatedAt?.toISOString()
        };
    }

    async updateAppraisal(id: number, schoolId: number, appraisal: Partial<TeacherAppraisal>): Promise<TeacherAppraisal> {
        const updateData: any = { updatedAt: new Date() };
        if (appraisal.appraisalDate) updateData.appraisalDate = new Date(appraisal.appraisalDate);
        if (appraisal.evaluatorId !== undefined) updateData.evaluatorId = appraisal.evaluatorId;
        if (appraisal.score !== undefined) updateData.score = appraisal.score;
        if (appraisal.feedback !== undefined) updateData.feedback = appraisal.feedback;
        if (appraisal.areasOfImprovement !== undefined) updateData.areasOfImprovement = appraisal.areasOfImprovement;
        if (appraisal.status) updateData.status = appraisal.status;

        const [record] = await db
            .update(teacherAppraisals)
            .set(updateData)
            .where(
                and(
                    eq(teacherAppraisals.id, id),
                    eq(teacherAppraisals.schoolId, schoolId)
                )
            )
            .returning();

        if (!record) {
            throw new Error('Appraisal not found');
        }

        return {
            ...record,
            appraisalDate: record.appraisalDate.toISOString(),
            status: record.status as TeacherAppraisal['status'],
            createdAt: record.createdAt?.toISOString(),
            updatedAt: record.updatedAt?.toISOString()
        };
    }

    async deleteAppraisal(id: number, schoolId: number): Promise<void> {
        await db
            .delete(teacherAppraisals)
            .where(
                and(
                    eq(teacherAppraisals.id, id),
                    eq(teacherAppraisals.schoolId, schoolId)
                )
            );
    }
}

export const appraisalService = new AppraisalService();
