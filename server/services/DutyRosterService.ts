import { db } from "../db";
import { dutyRoster } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertDutyRoster, DutyRoster } from "../../shared/schema";

export class DutyRosterService {
    async getDutyRosters(schoolId: number): Promise<DutyRoster[]> {
        return db
            .select()
            .from(dutyRoster)
            .where(eq(dutyRoster.schoolId, schoolId))
            .orderBy(desc(dutyRoster.startDate));
    }

    async getTeacherDutyRosters(schoolId: number, teacherId: number): Promise<DutyRoster[]> {
        return db
            .select()
            .from(dutyRoster)
            .where(
                and(
                    eq(dutyRoster.schoolId, schoolId),
                    eq(dutyRoster.teacherId, teacherId)
                )
            )
            .orderBy(desc(dutyRoster.startDate));
    }

    async createDutyRoster(schoolId: number, data: InsertDutyRoster): Promise<DutyRoster> {
        const [roster] = await db
            .insert(dutyRoster)
            .values({ ...data, schoolId })
            .returning();

        return roster;
    }

    async deleteDutyRoster(id: number, schoolId: number): Promise<void> {
        const [deleted] = await db
            .delete(dutyRoster)
            .where(
                and(
                    eq(dutyRoster.id, id),
                    eq(dutyRoster.schoolId, schoolId)
                )
            )
            .returning();

        if (!deleted) {
            throw new Error(`Duty roster with ID ${id} not found`);
        }
    }
}

export const dutyRosterService = new DutyRosterService();
