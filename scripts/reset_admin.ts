
import 'dotenv/config';
import { db } from "../server/db";
import { users, userSchools, schools } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function main() {
    console.log("Starting Admin Recovery...");
    try {
        const password = await hashPassword("Admin123!");

        // Check if recovery user exists
        const [existing] = await db.select().from(users).where(eq(users.username, "admin_rec"));

        if (existing) {
            console.log("User 'admin_rec' found. Updating password...");
            await db.update(users).set({ password }).where(eq(users.id, existing.id));
            console.log("Password updated.");

            // Ensure school link exists and is ACTIVE
            let [school] = await db.select().from(schools).limit(1);
            if (!school) {
                console.log("No schools found. Creating Default School...");
                [school] = await db.insert(schools).values({
                    name: "Default School",
                    code: "DEFAULT",
                    isActive: true
                }).returning();
            } else {
                if (!school.isActive) {
                    console.log(`School ${school.id} is inactive. Activating...`);
                    [school] = await db.update(schools).set({ isActive: true }).where(eq(schools.id, school.id)).returning();
                }
            }

            const [link] = await db.select().from(userSchools).where(and(eq(userSchools.userId, existing.id), eq(userSchools.schoolId, school.id)));
            if (!link) {
                console.log("Linking user to school...");
                try {
                    await db.insert(userSchools).values({
                        userId: existing.id,
                        schoolId: school.id,
                        role: 'admin',
                        isPrimary: true,
                        isActive: true
                    }).onConflictDoNothing();
                    console.log("Link created.");
                } catch (err: any) {
                    console.log("Link creation skipped (conflict or error):", err.message);
                }
            } else {
                console.log("User already linked to school.");
            }
        } else {
            console.log("Creating new 'admin_rec' user...");
            const [user] = await db.insert(users).values({
                username: "admin_rec",
                password,
                name: "Recovery Admin",
                role: "admin",
                isSuperAdmin: true,
                createdAt: new Date(),
                phone: "0000000000",
                email: "admin@recovery.local"
            }).returning();

            console.log(`User created with ID: ${user.id}`);

            // Ensure school link exists and is ACTIVE
            let [school] = await db.select().from(schools).limit(1);
            if (!school) {
                console.log("No schools found. Creating Default School...");
                [school] = await db.insert(schools).values({
                    name: "Default School",
                    code: "DEFAULT",
                    isActive: true
                }).returning();
            } else {
                if (!school.isActive) {
                    console.log(`School ${school.id} is inactive. Activating...`);
                    [school] = await db.update(schools).set({ isActive: true }).where(eq(schools.id, school.id)).returning();
                }
            }
            console.log(`Using School ID: ${school.id}`);

            // Link user to school
            await db.insert(userSchools).values({
                userId: user.id,
                schoolId: school.id,
                role: 'admin',
                isPrimary: true,
                isActive: true
            });
            console.log("User linked to school.");
        }
        console.log("Recovery Complete. Login with: admin_rec / Admin123!");
        process.exit(0);
    } catch (e) {
        console.error("Recovery Failed:", e);
        process.exit(1);
    }
}

main();
