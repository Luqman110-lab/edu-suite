import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { teachers, auditLogs } from "../../shared/schema";

export class TeacherService {

    async getTeachers(schoolId: number) {
        return await db.select().from(teachers)
            .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));
    }

    async getTeacherById(id: number, schoolId: number) {
        const result = await db.select().from(teachers)
            .where(and(eq(teachers.id, id), eq(teachers.schoolId, schoolId))).limit(1);
        return result[0];
    }

    async createTeacher(schoolId: number, data: any, userId?: number, userName?: string) {
        // Clean up data before inserting
        const cleanedData = { ...data };

        // Convert empty strings to null for optional schema fields to prevent type errors
        const optionalFields = ['dateOfBirth', 'nationalId', 'religion', 'maritalStatus', 'homeAddress', 'districtOfOrigin', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship', 'teachingRegNumber', 'bankName', 'bankAccountNumber', 'bankBranch', 'nssfNumber', 'tinNumber', 'specialization', 'photoUrl'];
        optionalFields.forEach(field => {
            if (cleanedData[field] === '') {
                cleanedData[field] = null;
            }
        });

        // Ensure JSON arrays are properly formatted arrays and not strings
        if (typeof cleanedData.educationHistory === 'string') {
            try {
                cleanedData.educationHistory = JSON.parse(cleanedData.educationHistory);
            } catch (e) {
                cleanedData.educationHistory = [];
            }
        }

        const newTeacher = await db.insert(teachers).values({ ...cleanedData, schoolId, isActive: true }).returning();

        if (userId && userName) {
            await db.insert(auditLogs).values({
                userId, userName, action: 'create', entityType: 'teacher',
                entityId: newTeacher[0].id, entityName: newTeacher[0].name,
                details: { role: newTeacher[0].roles }, ipAddress: '127.0.0.1'
            });
        }

        return newTeacher[0];
    }

    async updateTeacher(id: number, schoolId: number, data: any, userId?: number, userName?: string) {
        const existing = await this.getTeacherById(id, schoolId);
        if (!existing) return null;

        // Clean up data before updating
        const cleanedData = { ...data };
        const optionalFields = ['dateOfBirth', 'nationalId', 'religion', 'maritalStatus', 'homeAddress', 'districtOfOrigin', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship', 'teachingRegNumber', 'bankName', 'bankAccountNumber', 'bankBranch', 'nssfNumber', 'tinNumber', 'specialization', 'photoUrl'];
        optionalFields.forEach(field => {
            if (cleanedData[field] === '') {
                cleanedData[field] = null;
            }
        });

        if (typeof cleanedData.educationHistory === 'string') {
            try {
                cleanedData.educationHistory = JSON.parse(cleanedData.educationHistory);
            } catch (e) {
                cleanedData.educationHistory = [];
            }
        }

        const updated = await db.update(teachers).set({ ...cleanedData, schoolId })
            .where(eq(teachers.id, id)).returning();

        if (updated.length > 0 && userId && userName) {
            await db.insert(auditLogs).values({
                userId, userName, action: 'update', entityType: 'teacher',
                entityId: id, entityName: updated[0].name,
                details: { changes: Object.keys(data) }, ipAddress: '127.0.0.1'
            });
        }

        return updated[0];
    }

    async deleteTeacher(id: number, schoolId: number, userId?: number, userName?: string) {
        const existing = await this.getTeacherById(id, schoolId);
        if (!existing) return false;

        await db.update(teachers).set({ isActive: false }).where(eq(teachers.id, id));

        if (userId && userName) {
            await db.insert(auditLogs).values({
                userId, userName, action: 'delete', entityType: 'teacher',
                entityId: id, entityName: existing.name,
                details: { type: 'soft_delete' }, ipAddress: '127.0.0.1'
            });
        }

        return true;
    }

    async batchImportTeachers(schoolId: number, teachersData: any[]) {
        const created = await db.insert(teachers).values(teachersData.map((t: any) => ({
            name: t.name, gender: t.gender, phone: t.phone, email: t.email,
            employeeId: t.employeeId, roles: t.roles, assignedClass: t.assignedClass,
            assignedStream: t.assignedStream, subjects: t.subjects, teachingClasses: t.teachingClasses,
            qualifications: t.qualifications, dateJoined: t.dateJoined, initials: t.initials,
            schoolId, isActive: true
        }))).returning();

        return created;
    }
}

export const teacherService = new TeacherService();
