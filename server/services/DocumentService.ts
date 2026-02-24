import { db } from "../db";
import { teacherDocuments } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertTeacherDocument, TeacherDocument } from "../../shared/schema";

export class DocumentService {
    async getDocuments(schoolId: number): Promise<TeacherDocument[]> {
        return db
            .select()
            .from(teacherDocuments)
            .where(eq(teacherDocuments.schoolId, schoolId))
            .orderBy(desc(teacherDocuments.uploadedAt));
    }

    async getTeacherDocuments(schoolId: number, teacherId: number): Promise<TeacherDocument[]> {
        return db
            .select()
            .from(teacherDocuments)
            .where(
                and(
                    eq(teacherDocuments.schoolId, schoolId),
                    eq(teacherDocuments.teacherId, teacherId)
                )
            )
            .orderBy(desc(teacherDocuments.uploadedAt));
    }

    async createDocument(schoolId: number, data: InsertTeacherDocument): Promise<TeacherDocument> {
        const [doc] = await db
            .insert(teacherDocuments)
            .values({ ...data, schoolId })
            .returning();

        return doc;
    }

    async deleteDocument(id: number, schoolId: number): Promise<void> {
        const [deleted] = await db
            .delete(teacherDocuments)
            .where(
                and(
                    eq(teacherDocuments.id, id),
                    eq(teacherDocuments.schoolId, schoolId)
                )
            )
            .returning();

        if (!deleted) {
            throw new Error(`Document with ID ${id} not found`);
        }
    }
}

export const documentService = new DocumentService();
