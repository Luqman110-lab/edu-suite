import "dotenv/config";
import { pool } from "../server/db";

async function run() {
    console.log("Applying missing Phase 1, Phase 4, and Phase 5 HR schema columns...");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Add missing text columns to teachers table if they don't exist
        await client.query(`
      ALTER TABLE teachers 
      ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
      ADD COLUMN IF NOT EXISTS national_id TEXT,
      ADD COLUMN IF NOT EXISTS religion TEXT,
      ADD COLUMN IF NOT EXISTS marital_status TEXT,
      ADD COLUMN IF NOT EXISTS home_address TEXT,
      ADD COLUMN IF NOT EXISTS district_of_origin TEXT,
      ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
      ADD COLUMN IF NOT EXISTS teaching_reg_number TEXT,
      ADD COLUMN IF NOT EXISTS bank_name TEXT,
      ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
      ADD COLUMN IF NOT EXISTS bank_branch TEXT,
      ADD COLUMN IF NOT EXISTS nssf_number TEXT,
      ADD COLUMN IF NOT EXISTS tin_number TEXT,
      ADD COLUMN IF NOT EXISTS specialization TEXT,
      ADD COLUMN IF NOT EXISTS education_history JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS photo_url TEXT;
    `);

        await client.query("COMMIT");
        console.log("Missing HR columns added successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", err);
    } finally {
        client.release();
    }

    process.exit(0);
}

run();
