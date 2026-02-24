import { db } from "../db";
import { teacherContracts } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertTeacherContract, TeacherContract } from "../../shared/schema";

export class ContractService {
    async getContracts(schoolId: number): Promise<TeacherContract[]> {
        return db
            .select()
            .from(teacherContracts)
            .where(eq(teacherContracts.schoolId, schoolId))
            .orderBy(desc(teacherContracts.createdAt));
    }

    async getTeacherContracts(schoolId: number, teacherId: number): Promise<TeacherContract[]> {
        return db
            .select()
            .from(teacherContracts)
            .where(
                and(
                    eq(teacherContracts.schoolId, schoolId),
                    eq(teacherContracts.teacherId, teacherId)
                )
            )
            .orderBy(desc(teacherContracts.createdAt));
    }

    async createContract(schoolId: number, data: InsertTeacherContract): Promise<TeacherContract> {
        const [contract] = await db
            .insert(teacherContracts)
            .values({ ...data, schoolId })
            .returning();

        return contract;
    }

    async updateContractStatus(
        id: number,
        schoolId: number,
        status: 'Active' | 'Expired' | 'Terminated'
    ): Promise<TeacherContract> {
        const [updated] = await db
            .update(teacherContracts)
            .set({ status, updatedAt: new Date() })
            .where(
                and(
                    eq(teacherContracts.id, id),
                    eq(teacherContracts.schoolId, schoolId)
                )
            )
            .returning();

        if (!updated) {
            throw new Error(`Contract with ID ${id} not found`);
        }

        return updated;
    }
}

export const contractService = new ContractService();
