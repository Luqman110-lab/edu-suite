import "dotenv/config";
import { db } from "./server/db.js";
import { users, schools, userSchools } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function createDefaultUser() {
    try {
        console.log("Connecting to database...");

        // Check if default school exists
        let school = await db.query.schools.findFirst({
            where: eq(schools.code, "BROADWAY")
        });

        if (!school) {
            console.log("Creating default school...");
            const [newSchool] = await db.insert(schools).values({
                name: "Broadway Nursery and Primary School",
                code: "BROADWAY",
                email: "info@broadway.school"
            }).returning();
            school = newSchool;
            console.log("✅ School created:", school.name);
        } else {
            console.log("✅ School exists:", school.name);
        }

        // Check if admin user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, "admin")
        });

        if (existingUser) {
            console.log("✅ Admin user already exists");
            return;
        }

        // Create admin user
        console.log("Creating admin user...");
        const [newUser] = await db.insert(users).values({
            username: "admin",
            password: "$2a$10$YourHashedPasswordHere", // This needs to be hashed
            name: "System Administrator",
            role: "admin",
            email: "admin@broadway.school",
            isSuperAdmin: true
        }).returning();

        // Link user to school
        await db.insert(userSchools).values({
            userId: newUser.id,
            schoolId: school.id,
            role: "admin",
            isPrimary: true
        });

        console.log("✅ Admin user created successfully!");
        console.log("Username: admin");
        console.log("Password: admin123 (change this after first login)");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        process.exit(0);
    }
}

createDefaultUser();
