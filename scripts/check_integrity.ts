import * as dotenv from "dotenv";
dotenv.config();

import * as dotenv from "dotenv";
dotenv.config();

import { eq, isNull, notExists, and } from "drizzle-orm";

// Dynamically import db and schema to ensure dotenv loads first
const { db } = await import("../server/db");
const { users, userSchools, guardians, studentGuardians, schools, students } = await import("../shared/schema");
import { eq, isNull, notExists, and } from "drizzle-orm";

async function checkIntegrity() {
    console.log("Starting Data Integrity Check...");

    // 1. Orphaned Guardians (Guardians with no linked students)
    // Drizzle doesn't have a simple NOT EXISTS helper in the query builder easily exposed sometimes, 
    // but we can find them by left joining and checking for null.
    const orphanedGuardians = await db.select({
        id: guardians.id,
        name: guardians.name,
        schoolId: guardians.schoolId
    })
        .from(guardians)
        .leftJoin(studentGuardians, eq(guardians.id, studentGuardians.guardianId))
        .where(isNull(studentGuardians.id));

    console.log(`\nFound ${orphanedGuardians.length} orphaned guardians (no students linked):`);
    if (orphanedGuardians.length > 0) {
        console.table(orphanedGuardians.slice(0, 10)); // Show top 10
        if (orphanedGuardians.length > 10) console.log(`...and ${orphanedGuardians.length - 10} more.`);
    }

    // 2. Inactive Users (Users not assigned to any school and not super admin)
    const allUsers = await db.select().from(users).where(eq(users.isSuperAdmin, false));
    const allUserSchools = await db.select().from(userSchools);

    const assignedUserIds = new Set(allUserSchools.map(us => us.userId));
    const inactiveUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

    console.log(`\nFound ${inactiveUsers.length} inactive users (no school assigned):`);
    if (inactiveUsers.length > 0) {
        console.table(inactiveUsers.map(u => ({ id: u.id, username: u.username, role: u.role })).slice(0, 10));
        if (inactiveUsers.length > 10) console.log(`...and ${inactiveUsers.length - 10} more.`);
    }

    // 3. Students with invalid Class Levels (Optional, simple check)
    // We'll just list distinct class levels to see if there's garbage
    const distinctClasses = await db.selectDistinct({ classLevel: students.classLevel }).from(students);
    console.log(`\nDistinct Class Levels found in students:`);
    console.log(distinctClasses.map(c => c.classLevel).join(", "));

    console.log("\nIntegrity Check Complete.");
    process.exit(0);
}

checkIntegrity().catch(err => {
    console.error("Integrity Check Failed:", err);
    process.exit(1);
});
