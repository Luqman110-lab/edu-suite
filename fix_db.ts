import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
    idle_timeout: 5000,
});

async function main() {
    try {
        // Step 1: Kill orphaned connections
        console.log("Step 1: Killing orphaned connections...");
        const killRes = await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid()
              AND usename = current_user
              AND datname = current_database()
              AND state IN ('idle', 'idle in transaction', 'idle in transaction (aborted)');
        `);
        console.log("Terminated idle backends:", killRes.rowCount);

        // Step 2: Check existing columns
        console.log("\nStep 2: Checking fee_payments columns...");
        const cols = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'fee_payments' ORDER BY ordinal_position;
        `);
        console.log("fee_payments columns:", cols.rows.map(r => r.column_name));

        const cols2 = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'finance_transactions' ORDER BY ordinal_position;
        `);
        console.log("finance_transactions columns:", cols2.rows.map(r => r.column_name));

        const cols3 = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'school_events' ORDER BY ordinal_position;
        `);
        console.log("school_events columns:", cols3.rows.map(r => r.column_name));

        const cols4 = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'teachers' ORDER BY ordinal_position;
        `);
        console.log("teachers columns:", cols4.rows.map(r => r.column_name));

        // Step 3: Apply fixes
        console.log("\nStep 3: Applying column fixes...");

        // Drop wrongly-named camelCase columns if they exist
        await pool.query(`ALTER TABLE "fee_payments" DROP COLUMN IF EXISTS "isVoided";`);
        console.log("  Dropped fee_payments.isVoided (camelCase) if existed");
        await pool.query(`ALTER TABLE "fee_payments" DROP COLUMN IF EXISTS "voidReason";`);
        console.log("  Dropped fee_payments.voidReason (camelCase) if existed");
        await pool.query(`ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "isVoided";`);
        console.log("  Dropped finance_transactions.isVoided (camelCase) if existed");

        // Add correct snake_case columns
        await pool.query(`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "is_voided" boolean DEFAULT false;`);
        console.log("  Added fee_payments.is_voided");
        await pool.query(`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "void_reason" text;`);
        console.log("  Added fee_payments.void_reason");
        await pool.query(`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;`);
        console.log("  Added fee_payments.is_deleted");
        await pool.query(`ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "is_voided" boolean DEFAULT false;`);
        console.log("  Added finance_transactions.is_voided");
        await pool.query(`ALTER TABLE "school_events" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;`);
        console.log("  Added school_events.is_active");
        await pool.query(`ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;`);
        console.log("  Added teachers.is_active");

        console.log("\n✅ All column fixes applied successfully!");

    } catch (e) {
        console.error("❌ Failed:", e.message);
    } finally {
        await pool.end();
    }
}
main();
