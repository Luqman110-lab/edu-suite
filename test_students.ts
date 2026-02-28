import { db } from "./server/db";
import { students } from "./shared/schema";

async function test() {
    const allStudents = await db.select().from(students).limit(5);
    console.log("Students from DB:");
    console.log(JSON.stringify(allStudents, null, 2));
    process.exit(0);
}

test().catch(console.error);
