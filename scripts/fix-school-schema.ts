import "dotenv/config";
import { pool } from "../server/db";

// Log the database URL (masked) to help debugging
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`Using Database URL: ${masked}`);
} else {
    console.error("ERROR: DATABASE_URL is not set in environment variables!");
    console.error("Please check your .env file.");
}

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
    { name: 'streams', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'class_aliases', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'grading_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'subjects_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'report_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'id_card_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'security_config', type: 'JSONB DEFAULT \'{}\'' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
];

async function repairSchools() {
    try {
        console.log("Connected to database (via pool). Checking 'schools' table...");

        // Check if table exists
        const res = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'schools'
            );
        `);

        if (!res.rows[0].exists) {
            console.log("Schools table does not exist. Creating it...");
            await pool.query(`
                CREATE TABLE schools (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
             `);
            console.log("Created base schools table.");
        }

        // Get existing columns
        const colsRes = await pool.query(`
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
                    await pool.query(`ALTER TABLE schools ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added ${col.name}`);
                } catch (err: any) {
                    console.error(`❌ Failed to add ${col.name}:`, err.message);
                }
            }
        }

        console.log("Repair complete.");

    } catch (error: any) {
        console.error("Repair failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

repairSchools();
