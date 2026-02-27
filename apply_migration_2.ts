import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./shared/schema.js";

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
});

const sqlQueries = `
  ALTER TABLE "fee_payments" DROP COLUMN IF EXISTS "isVoided";
  ALTER TABLE "fee_payments" DROP COLUMN IF EXISTS "voidReason";
  ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "isVoided";

  ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "is_voided" boolean DEFAULT false;
  ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "void_reason" text;
  ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "is_voided" boolean DEFAULT false;
  ALTER TABLE "school_events" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
  ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
`;

async function main() {
    try {
        console.log("Running naming correction migration...");
        await pool.query(sqlQueries);
        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await pool.end();
    }
}
main();
