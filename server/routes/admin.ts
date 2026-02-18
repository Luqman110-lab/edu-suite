import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { z } from "zod";
import {
    users, schools, userSchools, auditLogs, students, teachers, marks,
    insertUserSchema, insertSchoolSchema
} from "../../shared/schema";
import { requireAuth, requireAdmin, requireSuperAdmin, getActiveSchoolId, hashPassword } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const adminRoutes = Router();

// GET /api/settings
adminRoutes.get("/settings", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const school = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
        if (school.length === 0) return res.status(404).json({ message: "School not found" });
        const defaultStreams = { P1: [], P2: [], P3: [], P4: [], P5: [], P6: [], P7: [] };
        const defaultGrading = {
            grades: [
                { grade: "D1", minScore: 90, maxScore: 100, points: 1 }, { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
                { grade: "C3", minScore: 70, maxScore: 79, points: 3 }, { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
                { grade: "C5", minScore: 55, maxScore: 59, points: 5 }, { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
                { grade: "P7", minScore: 45, maxScore: 49, points: 7 }, { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
                { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
            ],
            divisions: [
                { division: "I", minAggregate: 4, maxAggregate: 12 }, { division: "II", minAggregate: 13, maxAggregate: 24 },
                { division: "III", minAggregate: 25, maxAggregate: 28 }, { division: "IV", minAggregate: 29, maxAggregate: 32 },
                { division: "U", minAggregate: 33, maxAggregate: 36 },
            ],
            passingMark: 40,
        };
        const defaultSubjects = {
            lowerPrimary: [
                { name: "English", code: "english", isCompulsory: true }, { name: "Mathematics", code: "maths", isCompulsory: true },
                { name: "Literacy 1", code: "literacy1", isCompulsory: true }, { name: "Literacy 2", code: "literacy2", isCompulsory: true },
            ],
            upperPrimary: [
                { name: "English", code: "english", isCompulsory: true }, { name: "Mathematics", code: "maths", isCompulsory: true },
                { name: "Science", code: "science", isCompulsory: true }, { name: "Social Studies", code: "sst", isCompulsory: true },
            ],
        };
        const defaultReport = {
            headteacherName: "", headteacherTitle: "Headteacher",
            showClassTeacherSignature: true, showHeadteacherSignature: true, showParentSignature: true,
            commentTemplates: ["Excellent performance. Keep it up!", "Good work. Continue improving.", "Fair performance. More effort needed.", "Needs improvement. Work harder next term.", "Poor performance. Requires special attention."],
            conductOptions: ["Excellent", "Very Good", "Good", "Fair", "Needs Improvement"],
        };
        const defaultSecurity = {
            passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true,
            passwordRequireNumbers: true, passwordRequireSpecialChars: false, passwordExpiryDays: 0,
            sessionTimeoutMinutes: 60, maxLoginAttempts: 5, lockoutDurationMinutes: 15,
            require2FA: false, allowedIPAddresses: [], enforceIPWhitelist: false,
        };
        const defaultIdCard = {
            showBloodGroup: true, showDob: true, showEmergencyContact: true,
            customTerms: ["Property of the school", "Carry at all times", "Report loss immediately", "Non-transferable"],
            layout: 'single'
        };
        res.json({
            id: school[0].id, schoolName: school[0].name, addressBox: school[0].addressBox || "",
            contactPhones: school[0].contactPhones || "", email: school[0].email || "",
            motto: school[0].motto || "", regNumber: school[0].regNumber || "",
            centreNumber: school[0].centreNumber || "", primaryColor: school[0].primaryColor || "#7B1113",
            secondaryColor: school[0].secondaryColor || "#1E3A5F", logoBase64: school[0].logoBase64 || "",
            currentTerm: school[0].currentTerm || 1, currentYear: school[0].currentYear || new Date().getFullYear(),
            streams: school[0].streams || defaultStreams, classAliases: school[0].classAliases || {},
            gradingConfig: school[0].gradingConfig || defaultGrading, subjectsConfig: school[0].subjectsConfig || defaultSubjects,
            reportConfig: school[0].reportConfig || defaultReport, securityConfig: school[0].securityConfig || defaultSecurity,
            idCardConfig: school[0].idCardConfig || defaultIdCard,
            nextTermBeginBoarders: school[0].nextTermBeginBoarders || "", nextTermBeginDay: school[0].nextTermBeginDay || "",
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch settings: " + error.message });
    }
});

// PUT /api/settings
adminRoutes.put("/settings", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const body = req.body;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (body.schoolName !== undefined) updateData.name = body.schoolName;
        if (body.name !== undefined) updateData.name = body.name;
        if (body.addressBox !== undefined) updateData.addressBox = body.addressBox;
        if (body.contactPhones !== undefined) updateData.contactPhones = body.contactPhones;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.motto !== undefined) updateData.motto = body.motto;
        if (body.regNumber !== undefined) updateData.regNumber = body.regNumber;
        if (body.centreNumber !== undefined) updateData.centreNumber = body.centreNumber;
        if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
        if (body.secondaryColor !== undefined) updateData.secondaryColor = body.secondaryColor;
        if (body.logoBase64 !== undefined) updateData.logoBase64 = body.logoBase64;
        if (body.currentTerm !== undefined) updateData.currentTerm = body.currentTerm;
        if (body.currentYear !== undefined) updateData.currentYear = body.currentYear;
        if (body.streams !== undefined) updateData.streams = body.streams;
        if (body.classAliases !== undefined) updateData.classAliases = body.classAliases;
        if (body.gradingConfig !== undefined) updateData.gradingConfig = body.gradingConfig;
        if (body.subjectsConfig !== undefined) updateData.subjectsConfig = body.subjectsConfig;
        if (body.reportConfig !== undefined) updateData.reportConfig = body.reportConfig;
        if (body.securityConfig !== undefined) updateData.securityConfig = body.securityConfig;
        if (body.idCardConfig !== undefined) updateData.idCardConfig = body.idCardConfig;
        if (body.nextTermBeginBoarders !== undefined) updateData.nextTermBeginBoarders = body.nextTermBeginBoarders;
        if (body.nextTermBeginDay !== undefined) updateData.nextTermBeginDay = body.nextTermBeginDay;
        const updated = await db.update(schools).set(updateData as typeof schools.$inferInsert).where(eq(schools.id, schoolId)).returning();
        if (updated.length === 0) return res.status(404).json({ message: "School not found" });
        res.json({ message: "Settings updated successfully", school: updated[0] });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update settings: " + error.message });
    }
});

// GET /api/users
adminRoutes.get("/users", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const schoolUsers = await db.select({
            id: users.id, username: users.username, name: users.name, role: userSchools.role,
            email: users.email, phone: users.phone, isSuperAdmin: users.isSuperAdmin, createdAt: users.createdAt
        }).from(users).leftJoin(userSchools, and(eq(userSchools.userId, users.id), eq(userSchools.schoolId, schoolId))).where(eq(userSchools.schoolId, schoolId));
        res.json(schoolUsers);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch users: " + error.message });
    }
});

// POST /api/users
adminRoutes.post("/users", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const result = (insertUserSchema as any).omit({ id: true, createdAt: true, updatedAt: true, isSuperAdmin: true, lastLogin: true, resetToken: true, resetTokenExpiry: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const { username, password, name, role, email, phone } = result.data;
        const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existing.length > 0) return res.status(409).json({ message: "Username already exists" });
        const hashedPassword = await hashPassword(password);
        const [newUser] = await db.insert(users).values({ username, password: hashedPassword, name, role: role || "teacher", email: email || null, phone: phone || null, isSuperAdmin: false }).returning();
        await db.insert(userSchools).values({ userId: newUser.id, schoolId, role: role || "teacher", isPrimary: true });
        res.status(201).json({ message: "User created successfully", user: { id: newUser.id, username: newUser.username, name: newUser.name } });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create user: " + error.message });
    }
});

// PUT /api/users/:id
adminRoutes.put("/users/:id", requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        const result = insertUserSchema.partial().safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const { name, role, email, phone } = result.data;
        const updated = await db.update(users).set({ name, role, email, phone }).where(eq(users.id, userId)).returning();
        if (updated.length === 0) return res.status(404).json({ message: "User not found" });
        const schoolId = getActiveSchoolId(req);
        if (schoolId) await db.update(userSchools).set({ role: role as any }).where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));
        res.json({ message: "User updated successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update user: " + error.message });
    }
});

// DELETE /api/users/:id
adminRoutes.delete("/users/:id", requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        await db.delete(userSchools).where(eq(userSchools.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
        res.json({ message: "User deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete user: " + error.message });
    }
});

// POST /api/users/:id/reset-password
adminRoutes.post("/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
        const hashedPassword = await hashPassword(newPassword);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
        res.json({ message: "Password reset successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to reset password: " + error.message });
    }
});

// GET /api/users/:id/schools
adminRoutes.get("/users/:id/schools", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        const assignments = await db.select({
            schoolId: userSchools.schoolId, schoolName: schools.name, schoolCode: schools.code,
            role: userSchools.role, isPrimary: userSchools.isPrimary
        }).from(userSchools).leftJoin(schools, eq(schools.id, userSchools.schoolId)).where(eq(userSchools.userId, userId));
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch user schools: " + error.message });
    }
});

// POST /api/users/:id/schools
adminRoutes.post("/users/:id/schools", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        const { schoolId, role, isPrimary } = req.body;
        const existing = await db.select().from(userSchools).where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId))).limit(1);
        if (existing.length > 0) {
            await db.update(userSchools).set({ role, isPrimary: isPrimary || false }).where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));
        } else {
            await db.insert(userSchools).values({ userId, schoolId, role, isPrimary: isPrimary || false });
        }
        res.json({ message: "User assigned to school successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to assign user: " + error.message });
    }
});

// DELETE /api/users/:id/schools/:schoolId
adminRoutes.delete("/users/:id/schools/:schoolId", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        const schoolId = parseInt(param(req, 'schoolId'));
        await db.delete(userSchools).where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));
        res.json({ message: "User removed from school successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to remove user: " + error.message });
    }
});

// GET /api/activity-logs
adminRoutes.get("/activity-logs", requireAdmin, async (_req, res) => {
    res.json([]);
});

// GET /api/all-data
adminRoutes.get("/all-data", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const schoolData = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
        const studentsData = await db.select().from(students).where(eq(students.schoolId, schoolId));
        const teachersData = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId));
        const marksData = await db.select().from(marks).where(eq(marks.schoolId, schoolId));
        res.json({ school: schoolData[0] || null, students: studentsData, teachers: teachersData, marks: marksData, exportDate: new Date().toISOString() });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to export data: " + error.message });
    }
});

// GET /api/admin/schools
adminRoutes.get("/admin/schools", requireSuperAdmin, async (_req, res) => {
    try {
        const allSchools = await db.select().from(schools).orderBy(desc(schools.createdAt));
        res.json(allSchools);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch schools: " + error.message });
    }
});

// GET /api/admin/stats
adminRoutes.get("/admin/stats", requireSuperAdmin, async (req, res) => {
    try {
        const [schoolCount] = await db.select({ count: sql<number>`count(*)` }).from(schools);
        const [activeSchoolCount] = await db.select({ count: sql<number>`count(*)` }).from(schools).where(eq(schools.isActive, true));
        const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.isActive, true));
        const [teacherCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers);
        let recentLogins: any[] = [];
        try {
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            recentLogins = await db.select({ id: auditLogs.id, userName: auditLogs.userName, action: auditLogs.action, entityType: auditLogs.entityType, entityName: auditLogs.entityName, createdAt: auditLogs.createdAt })
                .from(auditLogs).where(gt(auditLogs.createdAt, sevenDaysAgo)).orderBy(desc(auditLogs.createdAt)).limit(20);
        } catch (e) { /* audit_logs table may not exist */ }
        res.json({ totalSchools: Number(schoolCount.count), activeSchools: Number(activeSchoolCount.count), totalUsers: Number(userCount.count), totalStudents: Number(studentCount.count), totalTeachers: Number(teacherCount.count), recentActivity: recentLogins });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch stats: " + error.message });
    }
});

// GET /api/admin/users
adminRoutes.get("/admin/users", requireSuperAdmin, async (_req, res) => {
    try {
        const allUsers = await db.select({ id: users.id, username: users.username, name: users.name, role: users.role, email: users.email, phone: users.phone, isSuperAdmin: users.isSuperAdmin, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
        const usersWithSchools = await Promise.all(allUsers.map(async (user) => {
            const schoolAssignments = await db.select({ schoolId: userSchools.schoolId, schoolName: schools.name, role: userSchools.role, isPrimary: userSchools.isPrimary }).from(userSchools).leftJoin(schools, eq(schools.id, userSchools.schoolId)).where(eq(userSchools.userId, user.id));
            return { ...user, schools: schoolAssignments, schoolCount: schoolAssignments.length };
        }));
        res.json(usersWithSchools);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch users: " + error.message });
    }
});

// POST /api/admin/users
adminRoutes.post("/admin/users", requireSuperAdmin, async (req, res) => {
    try {
        const schema = insertUserSchema.extend({ schoolId: z.union([z.string(), z.number()]).optional(), role: z.string().optional(), isSuperAdmin: z.boolean().optional() });
        const result = schema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const { username, password, name, role, isSuperAdmin, schoolId } = result.data as any;
        const [existing] = await db.select().from(users).where(eq(users.username, username));
        if (existing) return res.status(400).json({ message: "Username already exists" });
        const hashedPassword = await hashPassword(password);
        const [newUser] = await db.insert(users).values({ username, password: hashedPassword, name, role: role || 'teacher', isSuperAdmin: isSuperAdmin || false }).returning();
        if (schoolId) {
            const sid = typeof schoolId === 'string' ? parseInt(schoolId) : schoolId;
            const schoolDef = await db.select().from(schools).where(eq(schools.id, sid));
            if (schoolDef[0]) await db.insert(userSchools).values({ userId: newUser.id, schoolId: sid, role: role === 'admin' ? 'admin' : 'teacher', isPrimary: true });
        }
        res.json(newUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/admin/users/:id
adminRoutes.put("/admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
        const { name, email, phone, role, isSuperAdmin } = req.body;
        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = role;
        if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;
        const updated = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
        if (updated.length === 0) return res.status(404).json({ message: "User not found" });
        try {
            await db.insert(auditLogs).values({ userId: req.user?.id, userName: req.user?.name, action: 'update', entityType: 'user', entityId: userId, entityName: updated[0].name, details: { changes: updateData }, ipAddress: req.ip });
        } catch (e) { /* audit_logs table may not exist */ }
        const { password, ...userWithoutPassword } = updated[0];
        res.json(userWithoutPassword);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update user: " + error.message });
    }
});

// DELETE /api/admin/users/:id
adminRoutes.delete("/admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
        if (userId === req.user?.id) return res.status(400).json({ message: "Cannot delete your own account" });
        const [userToDelete] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!userToDelete) return res.status(404).json({ message: "User not found" });
        await db.delete(users).where(eq(users.id, userId));
        try {
            await db.insert(auditLogs).values({ userId: req.user?.id, userName: req.user?.name, action: 'delete', entityType: 'user', entityId: userId, entityName: userToDelete.name, ipAddress: req.ip });
        } catch (e) { /* audit_logs table may not exist */ }
        res.json({ message: "User deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete user: " + error.message });
    }
});

// POST /api/admin/users/:id/reset-password
adminRoutes.post("/admin/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(param(req, 'id'));
        if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
        const hashedPassword = await hashPassword(newPassword);
        const updated = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).returning();
        if (updated.length === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Password reset successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to reset password: " + error.message });
    }
});

// GET /api/admin/audit-logs
adminRoutes.get("/admin/audit-logs", requireSuperAdmin, async (req, res) => {
    try {
        const { action, entityType, limit = '50', offset = '0' } = req.query;
        try {
            let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
            const conditions = [];
            if (action && typeof action === 'string') conditions.push(eq(auditLogs.action, action));
            if (entityType && typeof entityType === 'string') conditions.push(eq(auditLogs.entityType, entityType));
            if (conditions.length > 0) query = query.where(and(...conditions)) as any;
            const logs = await query.limit(parseInt(limit as string)).offset(parseInt(offset as string));
            const [totalCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
            res.json({ logs, total: Number(totalCount.count), limit: parseInt(limit as string), offset: parseInt(offset as string) });
        } catch (tableError) {
            res.json({ logs: [], total: 0, limit: parseInt(limit as string), offset: parseInt(offset as string) });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch audit logs: " + error.message });
    }
});

// GET /api/schools
adminRoutes.get("/schools", requireAuth, async (req, res) => {
    try {
        const allSchools = await db.select().from(schools).where(eq(schools.isActive, true)).orderBy(desc(schools.createdAt));
        res.json(allSchools);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/schools/:id
adminRoutes.get("/schools/:id", requireAuth, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const [school] = await db.select().from(schools).where(eq(schools.id, id));
        if (!school) return res.status(404).json({ message: "School not found" });
        res.json(school);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/schools
adminRoutes.post("/schools", requireAdmin, async (req, res) => {
    try {
        if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
        const result = (insertSchoolSchema as any).omit({ id: true, createdAt: true, updatedAt: true, isActive: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const [newSchool] = await db.insert(schools).values({ ...result.data, isActive: true }).returning();
        await db.insert(auditLogs).values({ userId: (req.user as any).id, userName: (req.user as any).username, action: 'create_school', entityType: 'school', entityId: newSchool.id, entityName: newSchool.name, details: { name: newSchool.name, code: newSchool.code } });
        res.json(newSchool);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/schools/:id
adminRoutes.put("/schools/:id", requireAdmin, async (req, res) => {
    try {
        if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
        const id = parseInt(param(req, 'id'));
        const result = (insertSchoolSchema as any).partial().safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const [updated] = await db.update(schools).set({ ...result.data, updatedAt: new Date() }).where(eq(schools.id, id)).returning();
        if (!updated) return res.status(404).json({ message: "School not found" });
        await db.insert(auditLogs).values({ userId: (req.user as any).id, userName: (req.user as any).username, action: 'update_school', entityType: 'school', entityId: updated.id, entityName: updated.name, details: { changes: req.body } });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/schools/:id
adminRoutes.delete("/admin/schools/:id", requireSuperAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        const school = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
        if (school.length === 0) return res.status(404).json({ message: "School not found" });
        if (school[0].code === "DEFAULT") return res.status(400).json({ message: "Cannot delete the default school" });
        const [updated] = await db.update(schools).set({ isActive: false }).where(eq(schools.id, id)).returning();
        await db.insert(auditLogs).values({ userId: (req.user as any).id, userName: (req.user as any).username, action: 'deactivate_school', entityType: 'school', entityId: school[0].id, entityName: school[0].name });
        res.json({ message: "School deactivated successfully", school: updated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});
