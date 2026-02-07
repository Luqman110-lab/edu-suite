
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { db } = await import("./server/db");
    const { users, userSchools, schools } = await import("./shared/schema");

    console.log("Adding admin user...");
    const username = "admin_rec";
    const password = "Admin123!";

    try {
        // Check if user exists
        const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);

        if (existing.length > 0) {
            console.log("User already exists. Updating password...");
            const hashedPassword = await hashPassword(password);
            await db.update(users).set({ password: hashedPassword }).where(eq(users.username, username));
            console.log("Password updated.");

            // Context: ensure school link exists
            const userSchoolsList = await db.select().from(userSchools).where(eq(userSchools.userId, existing[0].id));
            if (userSchoolsList.length === 0) {
                const allSchools = await db.select().from(schools).limit(1);
                if (allSchools.length > 0) {
                    await db.insert(userSchools).values({
                        userId: existing[0].id,
                        schoolId: allSchools[0].id,
                        role: "admin",
                        isPrimary: true
                    });
                    console.log(`Linked to school: ${allSchools[0].name}`);
                }
            }

        } else {
            console.log("Creating new user...");
            const hashedPassword = await hashPassword(password);
            const [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                name: "Admin Recovery",
                role: "admin",
                isSuperAdmin: true,
                email: "admin_rec@test.com"
            }).returning();

            // Link to default school if exists
            const allSchools = await db.select().from(schools).limit(1);
            if (allSchools.length > 0) {
                await db.insert(userSchools).values({
                    userId: newUser.id,
                    schoolId: allSchools[0].id,
                    role: "admin",
                    isPrimary: true
                });
                console.log(`Linked to school: ${allSchools[0].name}`);
            } else {
                console.log("No schools found to link to.");
                // Create a default school?
                const [newSchool] = await db.insert(schools).values({
                    name: "Default School",
                    code: "DEFAULT"
                }).returning();
                await db.insert(userSchools).values({
                    userId: newUser.id,
                    schoolId: newSchool.id,
                    role: "admin",
                    isPrimary: true
                });
                console.log(`Created and linked to default school`);
            }
            console.log("User created.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

main().catch(console.error);
