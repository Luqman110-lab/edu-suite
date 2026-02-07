
import { Router } from "express";
import { db } from "../../db";
import { eq, and, sql, desc, ilike, inArray } from "drizzle-orm";
import { students, guardians, studentGuardians, users, userSchools } from "../../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId, hashPassword } from "../../auth";
import crypto from 'crypto';

export const guardianRoutes = Router();

// GET /api/guardians - List all guardians
guardianRoutes.get("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { search, studentId } = req.query;

        let conditions = [eq(guardians.schoolId, schoolId)];

        if (studentId) {
            conditions.push(
                inArray(
                    guardians.id,
                    db.select({ guardianId: studentGuardians.guardianId })
                        .from(studentGuardians)
                        .where(eq(studentGuardians.studentId, parseInt(studentId as string)))
                )
            );
        }

        let query = db.select({
            id: guardians.id,
            name: guardians.name,
            relationship: guardians.relationship,
            phoneNumber: guardians.phone,
            email: guardians.email,
            userId: guardians.userId,
            studentCount: sql<number>`(SELECT COUNT(*) FROM ${studentGuardians} WHERE ${studentGuardians.guardianId} = ${guardians.id})`.mapWith(Number),
            username: users.username,
        })
            .from(guardians)
            .leftJoin(users, eq(guardians.userId, users.id))
            .where(and(...conditions))
            .orderBy(desc(guardians.createdAt));

        let results = await query;

        // Simple in-memory search if needed
        if (search) {
            const searchLower = (search as string).toLowerCase();
            results = results.filter(g =>
                g.name.toLowerCase().includes(searchLower) ||
                (g.phoneNumber && g.phoneNumber.includes(searchLower))
            );
        }

        res.json(results);
    } catch (error: any) {
        console.error("List guardians error:", error);
        res.status(500).json({ message: "Failed to list guardians" });
    }
});

// POST /api/guardians - Create new guardian
guardianRoutes.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        // Accept phone or phoneNumber, prioritizing phoneNumber if both exist (though unlikely)
        const { name, relationship, phoneNumber, phone, email, studentId } = req.body;
        const finalPhone = phoneNumber || phone;

        if (!name || !relationship) {
            return res.status(400).json({ message: "Name and relationship are required" });
        }

        if (!finalPhone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // 1. Create Guardian
        const [guardian] = await db.insert(guardians).values({
            schoolId,
            name,
            relationship,
            phone: finalPhone,
            email,
        }).returning();

        // 2. Link to Student (if provided)
        if (studentId) {
            await db.insert(studentGuardians).values({
                studentId: parseInt(String(studentId)),
                guardianId: guardian.id
            });
        }

        res.json(guardian);
    } catch (error: any) {
        console.error("Create guardian error:", error);
        res.status(500).json({ message: "Failed to create guardian: " + error.message });
    }
});

// POST /api/guardians/:id/students - Link guardian to student
guardianRoutes.post("/:id/students", requireAuth, requireAdmin, async (req, res) => {
    try {
        const guardianId = parseInt(req.params.id);
        const { studentId, relationship } = req.body;

        if (!studentId || !relationship) {
            return res.status(400).json({ message: "Student ID and relationship are required" });
        }

        // Check if link already exists
        const existing = await db.query.studentGuardians.findFirst({
            where: and(
                eq(studentGuardians.guardianId, guardianId),
                eq(studentGuardians.studentId, parseInt(String(studentId)))
            )
        });

        if (existing) {
            return res.status(400).json({ message: "Guardian is already linked to this student" });
        }

        await db.insert(studentGuardians).values({
            guardianId,
            studentId: parseInt(String(studentId))
        });

        res.json({ message: "Guardian linked successfully" });
    } catch (error: any) {
        console.error("Link guardian error:", error);
        res.status(500).json({ message: "Failed to link guardian: " + error.message });
    }
});

// DELETE /api/guardians/:id/students/:studentId - Unlink guardian
guardianRoutes.delete("/:id/students/:studentId", requireAuth, requireAdmin, async (req, res) => {
    try {
        const guardianId = parseInt(req.params.id);
        const studentId = parseInt(req.params.studentId);

        await db.delete(studentGuardians)
            .where(and(
                eq(studentGuardians.guardianId, guardianId),
                eq(studentGuardians.studentId, studentId)
            ));

        res.json({ message: "Guardian unlinked successfully" });
    } catch (error: any) {
        console.error("Unlink guardian error:", error);
        res.status(500).json({ message: "Failed to unlink guardian: " + error.message });
    }
});

// GET /api/guardians/:id/students - Get linked students
guardianRoutes.get("/:id/students", requireAuth, requireAdmin, async (req, res) => {
    try {
        const guardianId = parseInt(req.params.id);

        const linkedStudents = await db.select({
            id: students.id,
            name: students.name,
            classLevel: students.classLevel,
            stream: students.stream,
            relationship: guardians.relationship
        })
            .from(students)
            .innerJoin(studentGuardians, eq(students.id, studentGuardians.studentId))
            .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
            .where(eq(studentGuardians.guardianId, guardianId));

        res.json(linkedStudents);
    } catch (error: any) {
        console.error("Get guardian students error:", error);
        res.status(500).json({ message: "Failed to fetch linked students" });
    }
});


// POST /api/guardians/:id/invite - Create/Link User Account
guardianRoutes.post("/:id/invite", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const guardianId = parseInt(req.params.id);
        const { username } = req.body; // allow admin to specify, or default to phone

        // 1. Get Guardian
        const guardian = await db.query.guardians.findFirst({
            where: and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId as number))
        });

        if (!guardian) return res.status(404).json({ message: "Guardian not found" });
        if (guardian.userId) return res.status(400).json({ message: "Guardian already has a linked account" });

        // 2. Generate Credentials
        const finalUsername = username || (guardian.phone ? guardian.phone.replace(/\s/g, '') : `parent${guardianId}`);
        const rawPassword = crypto.randomBytes(4).toString('hex'); // 8 char random hex
        const hashedPassword = await hashPassword(rawPassword);

        // 3. Create User
        // Check if username exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, finalUsername)
        });
        if (existingUser) return res.status(400).json({ message: `Username '${finalUsername}' already taken.` });

        const [newUser] = await db.insert(users).values({
            username: finalUsername,
            password: hashedPassword,
            name: guardian.name,
            role: 'parent',
        }).returning();

        // 3a. Link user to school
        await db.insert(userSchools).values({
            userId: newUser.id,
            schoolId,
            role: 'parent',
            isPrimary: true
        });

        // 4. Link to Guardian
        await db.update(guardians)
            .set({ userId: newUser.id })
            .where(eq(guardians.id, guardianId));

        res.json({
            message: "Account created successfully",
            credentials: {
                username: finalUsername,
                password: rawPassword
            }
        });

    } catch (error: any) {
        console.error("Invite guardian error:", error);
        res.status(500).json({ message: "Failed to invite guardian: " + error.message });
    }
});

// POST /api/guardians/:id/reset-password - Reset Password
guardianRoutes.post("/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const guardianId = parseInt(req.params.id);

        const guardian = await db.query.guardians.findFirst({
            where: and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId as number))
        });

        if (!guardian || !guardian.userId) return res.status(404).json({ message: "Guardian account not found" });

        const rawPassword = crypto.randomBytes(4).toString('hex');
        const hashedPassword = await hashPassword(rawPassword);

        await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, guardian.userId));

        res.json({
            message: "Password reset successfully",
            credentials: {
                username: "Unchanged", // We'd need to fetch user to show it, or just say it's same
                password: rawPassword
            }
        });

    } catch (error: any) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
});
