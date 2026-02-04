
import { db } from "../server/db";
import { users, guardians } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../server/auth";

async function main() {
    const guardianName = process.argv[2];
    const username = process.argv[3];
    const password = process.argv[4] || "password123";

    if (!guardianName || !username) {
        console.error("Usage: tsx scripts/create-parent-user.ts <guardian_name_search> <new_username> [password]");
        process.exit(1);
    }

    // 1. Find Guardian
    const guardian = await db.query.guardians.findFirst({
        where: (guardians, { ilike }) => ilike(guardians.name, `%${guardianName}%`)
    });

    if (!guardian) {
        console.error(`No guardian found matching "${guardianName}"`);
        process.exit(1);
    }

    console.log(`Found Guardian: ${guardian.name} (ID: ${guardian.id})`);

    // 2. Create User
    const hashedPassword = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
        username,
        password: hashedPassword,
        role: "parent",
        name: guardian.name,
        schoolId: guardian.schoolId,
        status: "active"
    }).returning();

    console.log(`Created User: ${newUser.username} (ID: ${newUser.id})`);

    // 3. Link Guardian
    await db.update(guardians)
        .set({ userId: newUser.id })
        .where(eq(guardians.id, guardian.id));

    console.log("Successfully linked User to Guardian!");
    console.log("\nLogin Credentials:");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);

    process.exit(0);
}

main().catch(console.error);
