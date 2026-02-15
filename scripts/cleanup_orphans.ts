
import * as dotenv from "dotenv";
dotenv.config();

import { eq, isNull, inArray } from "drizzle-orm";

const { db } = await import("../server/db");
const { guardians, studentGuardians } = await import("../shared/schema");

async function cleanup() {
    console.log("Starting cleanup...");

    // Find orphans again to be safe
    const orphanedGuardians = await db.select({
        id: guardians.id
    })
        .from(guardians)
        .leftJoin(studentGuardians, eq(guardians.id, studentGuardians.guardianId))
        .where(isNull(studentGuardians.id));

    if (orphanedGuardians.length === 0) {
        console.log("No orphans found to delete.");
        process.exit(0);
    }

    const ids = orphanedGuardians.map(g => g.id);
    console.log(`Deleting ${ids.length} orphaned guardians: ${ids.join(", ")}`);

    await db.delete(guardians).where(inArray(guardians.id, ids));

    console.log("Cleanup complete.");
    process.exit(0);
}

cleanup();
