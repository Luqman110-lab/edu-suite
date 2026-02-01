
import { db } from "../server/db";
import { users, schools, userSchools } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function seed() {
    console.log("Seeding database...");

    try {
        // 1. Create School
        const schoolCode = "BROADWAY";
        let [school] = await db.select().from(schools).where(eq(schools.code, schoolCode));

        if (!school) {
            console.log("Creating school...");
            [school] = await db.insert(schools).values({
                name: "Broadway Nursery and Primary School",
                code: schoolCode,
                email: "info@broadway.school",
                contactPhones: "+254700000000",
                addressBox: "P.O. Box 12345, Nairobi",
                motto: "Excellence in Education",
                regNumber: "REG/2025/001",
                isActive: true
            }).returning();
        } else {
            console.log("School already exists.");
        }

        // 2. Create User
        const username = "Luqman";
        let [user] = await db.select().from(users).where(eq(users.username, username));

        if (!user) {
            console.log("Creating user...");
            const hashedPassword = await hashPassword("luqman1998#@");

            [user] = await db.insert(users).values({
                username: username,
                password: hashedPassword,
                name: "Luqman (Admin)",
                role: "admin",
                isSuperAdmin: true,
                email: "luqman@broadway.school",
            }).returning();
        } else {
            console.log("User already exists.");
        }

        // 3. Link User to School
        const [link] = await db.select().from(userSchools).where(
            eq(userSchools.userId, user.id)
        );

        if (!link) {
            console.log("Linking user to school...");
            await db.insert(userSchools).values({
                userId: user.id,
                schoolId: school.id,
                role: "admin",
                isPrimary: true
            });
        } else {
            console.log("User already linked to school.");
        }

        console.log("Seeding complete! You can now log in.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
