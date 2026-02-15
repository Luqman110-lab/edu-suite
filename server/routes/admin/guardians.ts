
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
        console.log(`[Inviting Guardian] Start invite for guardianId: ${req.params.id}`);
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) {
            console.log('[Inviting Guardian] No active school selected');
            return res.status(400).json({ message: "No active school selected" });
        }

        const guardianId = parseInt(req.params.id);
        const { username } = req.body;

        console.log(`[Inviting Guardian] SchoolId: ${schoolId}, GuardianId: ${guardianId}`);

        // 1. Get Guardian
        const guardian = await db.query.guardians.findFirst({
            where: and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId))
        });

        if (!guardian) {
            console.log(`[Inviting Guardian] Guardian not found for ID ${guardianId} and School ${schoolId}`);
            return res.status(404).json({ message: "Guardian not found" });
        }

        if (guardian.userId) {
            console.log(`[Inviting Guardian] Guardian already has linked account: ${guardian.userId}`);
            return res.status(400).json({ message: "Guardian already has a linked account" });
        }

        // 2. Generate Credentials
        let finalUsername = username;

        if (!finalUsername) {
            // Robust generation logic
            if (guardian.phone && guardian.phone.trim().length > 0) {
                // Remove spaces and special chars, keep only alphanumeric
                finalUsername = guardian.phone.replace(/[^a-zA-Z0-9]/g, '');
            }

            // If phone processed to empty string or was missing, fallback to ID
            if (!finalUsername || finalUsername.length < 3) {
                finalUsername = `parent${guardianId}`;
            }
        }

        console.log(`[Inviting Guardian] Generating credentials for username: ${finalUsername}`);

        const rawPassword = crypto.randomBytes(4).toString('hex');
        const hashedPassword = await hashPassword(rawPassword);
        console.log('[Inviting Guardian] Password hashed');

        // 3. Create User
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, finalUsername)
        });

        if (existingUser) {
            console.log(`[Inviting Guardian] Username '${finalUsername}' already taken (Check 1)`);
            return res.status(409).json({ message: `Username '${finalUsername}' already taken.` }); // 409 Conflict
        }

        console.log('[Inviting Guardian] Creating user record...');
        let newUser;
        try {
            [newUser] = await db.insert(users).values({
                username: finalUsername,
                password: hashedPassword,
                name: guardian.name,
                role: 'parent',
            }).returning();
        } catch (dbError: any) {
            if (dbError.code === '23505') { // Postgres Unique Violation
                console.log(`[Inviting Guardian] Username '${finalUsername}' collision during insert (Race condition)`);
                return res.status(409).json({ message: `Username '${finalUsername}' already taken.` });
            }
            throw dbError; // Re-throw to main catch
        }

        console.log(`[Inviting Guardian] User created with ID: ${newUser.id}`);

        // 3a. Link user to school
        console.log('[Inviting Guardian] Linking user to school...');
        await db.insert(userSchools).values({
            userId: newUser.id,
            schoolId,
            role: 'parent',
            isPrimary: true
        });

        // 4. Link to Guardian
        console.log('[Inviting Guardian] Updating guardian record...');
        await db.update(guardians)
            .set({ userId: newUser.id })
            .where(eq(guardians.id, guardianId));

        console.log('[Inviting Guardian] Process complete');
        res.json({
            message: "Account created successfully",
            credentials: {
                username: finalUsername,
                password: "Password has been set. Please inform the user."
            }
        });

    } catch (error: any) {
        console.error("Invite guardian error:", error);
        // Log full error object if possible
        if (error instanceof Error) {
            console.error("Stack:", error.stack);
        }
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
                username: "Unchanged",
                password: "Password has been set. Please inform the user."
            }
        });

    } catch (error: any) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
});
