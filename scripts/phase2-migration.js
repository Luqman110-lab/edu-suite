import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon/AWS
});

async function migrate() {
    try {
        await client.connect();
        console.log("Connected to database...");

        console.log("Adding reminder columns to invoices table...");

        // Add reminder columns to invoices (if they don't exist)
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_reminder_type VARCHAR(50)
        `);
        console.log("✅ Reminder columns added to invoices");

        console.log("Creating payment_plans table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS payment_plans (
                id SERIAL PRIMARY KEY,
                school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
                plan_name VARCHAR(255),
                total_amount REAL NOT NULL,
                down_payment REAL DEFAULT 0,
                installment_count INTEGER NOT NULL,
                frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
                start_date TIMESTAMP NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ payment_plans table created");

        // Add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS payment_plans_school_idx ON payment_plans(school_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS payment_plans_student_idx ON payment_plans(student_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS payment_plans_status_idx ON payment_plans(status)`);
        console.log("✅ payment_plans indexes created");

        console.log("Creating plan_installments table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS plan_installments (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
                installment_number INTEGER NOT NULL,
                due_date TIMESTAMP NOT NULL,
                amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                paid_at TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ plan_installments table created");

        // Add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS plan_installments_plan_idx ON plan_installments(plan_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS plan_installments_due_date_idx ON plan_installments(due_date)`);
        await client.query(`CREATE INDEX IF NOT EXISTS plan_installments_status_idx ON plan_installments(status)`);
        console.log("✅ plan_installments indexes created");

        console.log("\n🎉 Phase 2 database migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
