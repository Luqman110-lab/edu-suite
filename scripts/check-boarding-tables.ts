
import 'dotenv/config';
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function check() {
    try {
        console.log("Checking for dormitories table...");
        const result = await db.execute(sql`SELECT * FROM dormitories LIMIT 1`);
        console.log("Success! Table exists.", result);
        process.exit(0);
    } catch (error: any) {
        if (error.code === '42P01') {
            console.log("Table 'dormitories' does not exist.");
        } else {
            console.error("Error checking table:", error);
        }
        process.exit(1);
    }
}

check();
