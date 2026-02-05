
import { Router } from "express";
import { db } from "../../db";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { students, guardians, studentGuardians, users } from "../../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId, hashPassword } from "../../auth";
import crypto from 'crypto';

export const guardianRoutes = Router();

// GET /api/admin/guardians - List all guardians
guardianRoutes.get("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { search } = req.query;

        let query = db.select({
            id: guardians.id,
            name: guardians.name,
            relationship: guardians.relationship,
            phoneNumber: guardians.phoneNumber,
            email: guardians.email,
            userId: guardians.userId,
            studentCount: sql<number>`count(${studentGuardians.studentId})`,
            username: users.username, // Joined user info
        })
            .from(guardians)
            .leftJoin(studentGuardians, eq(guardians.id, studentGuardians.guardianId))
            .leftJoin(users, eq(guardians.userId, users.id)) // Join linked user
            .where(eq(guardians.schoolId, schoolId))
            .groupBy(guardians.id, users.username, users.id)
            .orderBy(desc(guardians.createdAt));

        if (search) {
            // @ts-ignore - simple search filter
            // Note: For complex filtering, we'd add where clause
            // But since we built the query first, we need to reconstruct or filter in memory if simple
            // Let's simple use filter in DB if we can
        }

        // Execute query
        const results = await query;

        // Simple in-memory search if needed (or better: rebuild query with where clause)
        // Since we didn't add the where clause dynamically above correctly, let's filter here for MVP
        let filtered = results;
        if (search) {
            const searchLower = (search as string).toLowerCase();
            filtered = results.filter(g =>
                g.name.toLowerCase().includes(searchLower) ||
                (g.phoneNumber && g.phoneNumber.includes(searchLower))
            );
        }

        res.json(filtered);
    } catch (error: any) {
        console.error("List guardians error:", error);
        res.status(500).json({ message: "Failed to list guardians" });
    }
});

// POST /api/admin/guardians/:id/invite - Create/Link User Account
guardianRoutes.post("/:id/invite", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        const guardianId = parseInt(req.params.id);
        const { username } = req.body; // allow admin to specify, or default to phone

        // 1. Get Guardian
        const guardian = await db.query.guardians.findFirst({
            where: and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId as number))
        });

        if (!guardian) return res.status(404).json({ message: "Guardian not found" });
        if (guardian.userId) return res.status(400).json({ message: "Guardian already has a linked account" });

        // 2. Generate Credentials
        const finalUsername = username || guardian.phoneNumber?.replace(/\s/g, '') || `parent${guardianId}`;
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
            schoolId,
            status: 'active'
        }).returning();

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

// POST /api/admin/guardians/:id/reset-password - Reset Password
guardianRoutes.post("/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
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
