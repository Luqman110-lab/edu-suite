import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function repair() {
    try {
        await client.connect();
        console.log("Connected to database...");

        // 1. Create Invoices Table
        console.log("Checking/Creating invoices table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                term INTEGER NOT NULL,
                year INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                amount_paid REAL DEFAULT 0,
                balance REAL DEFAULT 0,
                due_date TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
                
                -- Phase 2 columns (adding directly here just in case)
                reminder_sent_at TIMESTAMP,
                reminder_count INTEGER DEFAULT 0,
                last_reminder_type VARCHAR(50),
                
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ invoices table ready");

        // 2. Create Invoice Items Table
        console.log("Checking/Creating invoice_items table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                fee_type VARCHAR(100) NOT NULL,
                description TEXT,
                amount REAL NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ invoice_items table ready");

        // 3. Create Payment Plans (Phase 2)
        console.log("Checking/Creating payment_plans table...");
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
        console.log("✅ payment_plans table ready");

        // 4. Create Plan Installments (Phase 2)
        console.log("Checking/Creating plan_installments table...");
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
        console.log("✅ plan_installments table ready");

        // 5. Create Mobile Money Transactions (Phase 3)
        console.log("Checking/Creating mobile_money_transactions table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS mobile_money_transactions (
                id SERIAL PRIMARY KEY,
                school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                payment_id INTEGER REFERENCES fee_payments(id) ON DELETE SET NULL,
                provider VARCHAR(20) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                amount REAL NOT NULL,
                currency VARCHAR(10) DEFAULT 'UGX',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                external_reference VARCHAR(100),
                description TEXT,
                entity_type VARCHAR(50),
                entity_id INTEGER,
                transaction_date TIMESTAMP DEFAULT NOW(),
                callback_received_at TIMESTAMP,
                raw_callback_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ mobile_money_transactions table ready");

        console.log("\n🎉 Database Repair Complete!");

    } catch (error) {
        console.error("Repair failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

repair();
