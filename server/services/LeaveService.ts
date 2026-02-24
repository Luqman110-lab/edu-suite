import { db } from "../db";
import { staffLeave } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertStaffLeave, StaffLeave } from "../../shared/schema";

export class LeaveService {
  async getLeaveRequests(schoolId: number): Promise<StaffLeave[]> {
    return db
      .select()
      .from(staffLeave)
      .where(eq(staffLeave.schoolId, schoolId))
      .orderBy(desc(staffLeave.createdAt));
  }

  async getTeacherLeaveRequests(schoolId: number, teacherId: number): Promise<StaffLeave[]> {
    return db
      .select()
      .from(staffLeave)
      .where(
        and(
          eq(staffLeave.schoolId, schoolId),
          eq(staffLeave.teacherId, teacherId)
        )
      )
      .orderBy(desc(staffLeave.createdAt));
  }

  async createLeaveRequest(schoolId: number, data: InsertStaffLeave): Promise<StaffLeave> {
    const [request] = await db
      .insert(staffLeave)
      .values({ ...data, schoolId })
      .returning();

    return request;
  }

  async updateLeaveStatus(
    id: number,
    status: 'Approved' | 'Rejected',
    approvedBy: number
  ): Promise<StaffLeave> {
    const [updated] = await db
      .update(staffLeave)
      .set({ status, approvedBy })
      .where(eq(staffLeave.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Leave request with ID ${id} not found`);
    }

    return updated;
  }
}

export const leaveService = new LeaveService();
