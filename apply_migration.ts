import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./shared/schema.js";
import fs from "fs";

const sqlContent = fs.readFileSync("./migrations/0001_reflective_doctor_doom.sql", "utf-8");
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

async function main() {
    try {
        console.log("Running migration using 'pg' driver...");
        await db.execute(sqlContent);
        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await pool.end();
    }
}
main();
