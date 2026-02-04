import pg from 'pg';
import dns from 'dns';
import 'dotenv/config';
const { Client } = pg;

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const COLUMNS_TO_CHECK = [
    { name: 'address_box', type: 'TEXT DEFAULT \'\'' },
    { name: 'contact_phones', type: 'TEXT DEFAULT \'\'' },
    { name: 'email', type: 'TEXT' },
    { name: 'motto', type: 'TEXT DEFAULT \'\'' },
    { name: 'reg_number', type: 'TEXT DEFAULT \'\'' },
    { name: 'centre_number', type: 'TEXT DEFAULT \'\'' },
    { name: 'logo_base64', type: 'TEXT' },
    { name: 'primary_color', type: 'TEXT DEFAULT \'#7B1113\'' },
    { name: 'secondary_color', type: 'TEXT DEFAULT \'#1E3A5F\'' },
    { name: 'current_term', type: 'INTEGER DEFAULT 1' },
    { name: 'current_year', type: 'INTEGER DEFAULT 2025' },
    { name: 'next_term_begin_boarders', type: 'TEXT DEFAULT \'\'' },
    { name: 'next_term_begin_day', type: 'TEXT DEFAULT \'\'' },
    { name: 'streams', type: 'JSONB DEFAULT \'{}\'' }, // Using JSONB for better performance/flexibility
    { name: 'class_aliases', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'grading_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'subjects_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'report_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'id_card_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'security_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
]

async function repairSchools() {
    try {
        await client.connect();
        console.log("Connected to database. Checking 'schools' table...");

        // Check if table exists
        const res = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'schools'
            );
        `);

        if (!res.rows[0].exists) {
            console.log("Schools table does not exist. It normally should. Creating it if absolutely necessary...");
            await client.query(`
                CREATE TABLE schools (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
             `);
            console.log("Created base schools table.");
            // Then add columns below
        }

        // Get existing columns
        const colsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'schools';
        `);
        const existingColumns = new Set(colsRes.rows.map(r => r.column_name));

        console.log("Existing columns:", Array.from(existingColumns).join(", "));

        for (const col of COLUMNS_TO_CHECK) {
            if (!existingColumns.has(col.name)) {
                console.log(`Adding missing column: ${col.name} (${col.type})`);
                try {
                    // Drizzle uses 'json' which maps to 'json' or 'jsonb' in Postgres. 
                    // Drizzle default is usually json, but let's allow the script to be flexible.
                    // If type is JSONB, but DB prefers JSON, it's fine.
                    await client.query(`ALTER TABLE schools ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added ${col.name}`);
                } catch (err) {
                    console.error(`❌ Failed to add ${col.name}:`, err.message);
                }
            } else {
                // console.log(`✓ ${col.name} exists`);
            }
        }

        console.log("Repair complete.");

    } catch (error) {
        console.error("Repair failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

repairSchools();
