
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./shared/schema";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

const db = drizzle(pool, { schema });

async function checkTables() {
    let output = "";
    const log = (msg: string) => { console.log(msg); output += msg + "\n"; };

    log("Checking tables in database...");
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        log("Found tables:");
        const tableNames = result.rows.map(r => r.table_name);
        tableNames.forEach(t => log(` - ${t}`));

        const hasDormRooms = tableNames.includes("dorm_rooms");
        log(`\nHas 'dorm_rooms' table? ${hasDormRooms}`);

        // Check detailed columns for 'beds'
        const bedsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'beds';
    `);
        log("\nColumns in 'beds':");
        bedsColumns.rows.forEach(r => log(` - ${r.column_name} (${r.data_type})`));

        fs.writeFileSync("db_check_result.txt", output);

    } catch (error) {
        log(`Error Checking DB: ${error}`);
        fs.writeFileSync("db_check_result.txt", output);
    } finally {
        await pool.end();
    }
}

checkTables();
