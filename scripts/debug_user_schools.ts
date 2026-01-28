import 'dotenv/config';
import { db } from "../server/db";
import { users, userSchools, schools } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Debugging Join Query...");
    const [user] = await db.select().from(users).where(eq(users.username, "admin_rec"));
    console.log("User:", user?.id);
    if (user) {
        // 1. Raw UserSchools
        const rawLinks = await db.select().from(userSchools).where(eq(userSchools.userId, user.id));
        console.log("Raw UserSchools Links:", rawLinks);

        if (rawLinks.length > 0) {
            const sId = rawLinks[0].schoolId;
            // 2. Check the School
            const school = await db.select().from(schools).where(eq(schools.id, sId));
            console.log("Target School:", school);
        } else {
            console.log("No links found for user.");
        }
    }
    process.exit(0);
}
main();
