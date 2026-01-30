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

async function migrate() {
    try {
        await client.connect();
        console.log("Connected to database...");

        console.log("Creating mobile_money_transactions table...");
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
        console.log("✅ mobile_money_transactions table created");

        // Add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS momo_tx_school_idx ON mobile_money_transactions(school_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS momo_tx_status_idx ON mobile_money_transactions(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS momo_tx_ext_ref_idx ON mobile_money_transactions(external_reference)`);
        console.log("✅ Indexes created");

        console.log("\n🎉 Phase 3 database migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
