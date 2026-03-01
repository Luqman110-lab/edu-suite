import { db } from '../db';
import {
    medicalRecords, sickbayVisits, sickbayInventory, sickbayInventoryTransactions,
    students, users, userSchools
} from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import {
    InsertMedicalRecord, InsertSickbayVisit, InsertSickbayInventory,
    InsertSickbayInventoryTransaction
} from '../../shared/schema';

export class SickbayService {

    // --- Medical Records ---

    static async getMedicalRecordByStudent(studentId: number) {
        const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.studentId, studentId));
        return record || null;
    }

    static async getMedicalRecordByStaff(userSchoolId: number) {
        const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.userSchoolId, userSchoolId));
        return record || null;
    }

    static async upsertMedicalRecord(data: InsertMedicalRecord) {
        // If studentId is provided, upsert by studentId
        if (data.studentId) {
            const existing = await this.getMedicalRecordByStudent(data.studentId);
            if (existing) {
                data.updatedAt = new Date();
                const [updated] = await db.update(medicalRecords)
                    .set(data)
                    .where(eq(medicalRecords.id, existing.id))
                    .returning();
                return updated;
            }
        } else if (data.userSchoolId) {
            const existing = await this.getMedicalRecordByStaff(data.userSchoolId);
            if (existing) {
                data.updatedAt = new Date();
                const [updated] = await db.update(medicalRecords)
                    .set(data)
                    .where(eq(medicalRecords.id, existing.id))
                    .returning();
                return updated;
            }
        }

        // Otherwise insert new
        const [inserted] = await db.insert(medicalRecords).values(data).returning();
        return inserted;
    }

    // --- Sickbay Visits ---

    static async getVisitsBySchool(schoolId: number, limit = 50) {
        return db.select({
            visit: sickbayVisits,
            studentName: students.name,
            studentAdmissionNumber: students.admissionNumber,
            handledBy: users.name,
        })
            .from(sickbayVisits)
            .leftJoin(students, eq(sickbayVisits.studentId, students.id))
            .leftJoin(users, eq(sickbayVisits.handledByUserId, users.id))
            .where(eq(sickbayVisits.schoolId, schoolId))
            .orderBy(desc(sickbayVisits.visitDate))
            .limit(limit);
    }

    static async getVisitsByPatient(patientId: number, type: 'student' | 'staff') {
        const condition = type === 'student'
            ? eq(sickbayVisits.studentId, patientId)
            : eq(sickbayVisits.userSchoolId, patientId);

        return db.select({
            visit: sickbayVisits,
            handledBy: users.name,
        })
            .from(sickbayVisits)
            .leftJoin(users, eq(sickbayVisits.handledByUserId, users.id))
            .where(condition)
            .orderBy(desc(sickbayVisits.visitDate));
    }

    static async recordVisit(data: InsertSickbayVisit) {
        const [inserted] = await db.insert(sickbayVisits).values(data).returning();
        return inserted;
    }

    static async updateVisitStatus(id: number, status: string, treatmentGiven?: string, medicationPrescribed?: string) {
        const updates: any = { status, updatedAt: new Date() };
        if (treatmentGiven !== undefined) updates.treatmentGiven = treatmentGiven;
        if (medicationPrescribed !== undefined) updates.medicationPrescribed = medicationPrescribed;

        const [updated] = await db.update(sickbayVisits)
            .set(updates)
            .where(eq(sickbayVisits.id, id))
            .returning();
        return updated;
    }

    // --- Inventory Management ---

    static async getInventory(schoolId: number) {
        return db.select().from(sickbayInventory).where(eq(sickbayInventory.schoolId, schoolId)).orderBy(sickbayInventory.itemName);
    }

    static async addInventoryItem(data: InsertSickbayInventory) {
        const [inserted] = await db.insert(sickbayInventory).values(data).returning();
        return inserted;
    }

    static async updateInventoryItem(id: number, data: Partial<InsertSickbayInventory>) {
        data.updatedAt = new Date();
        const [updated] = await db.update(sickbayInventory)
            .set(data)
            .where(eq(sickbayInventory.id, id))
            .returning();
        return updated;
    }

    static async recordInventoryTransaction(data: InsertSickbayInventoryTransaction) {
        // 1. Record transaction
        const [transaction] = await db.insert(sickbayInventoryTransactions).values(data).returning();

        // 2. Adjust inventory count
        const change = data.transactionType === 'restock' ? data.quantity : -Math.abs(data.quantity);

        await db.update(sickbayInventory)
            .set({
                quantityInStock: sql`${sickbayInventory.quantityInStock} + ${change}`,
                updatedAt: new Date()
            })
            .where(eq(sickbayInventory.id, data.inventoryId));

        return transaction;
    }

    static async getInventoryTransactions(schoolId: number, limit = 50) {
        return db.select({
            transaction: sickbayInventoryTransactions,
            item: sickbayInventory.itemName,
            recordedBy: users.name,
        })
            .from(sickbayInventoryTransactions)
            .innerJoin(sickbayInventory, eq(sickbayInventoryTransactions.inventoryId, sickbayInventory.id))
            .leftJoin(users, eq(sickbayInventoryTransactions.recordedByUserId, users.id))
            .where(eq(sickbayInventory.schoolId, schoolId))
            .orderBy(desc(sickbayInventoryTransactions.transactionDate))
            .limit(limit);
    }
}
