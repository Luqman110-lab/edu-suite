require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function test() {
    try {
        console.log("-- Testing Neon HTTP Connection --");
        const sql = neon(process.env.DATABASE_URL);

        await sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS aggregate INTEGER DEFAULT 0;`;
        await sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '';`;
        await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS attendance_settings JSONB DEFAULT '{}'::jsonb;`;
        await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS archived_years JSONB DEFAULT '[]'::jsonb;`;
        await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS security_config JSONB DEFAULT '{}'::jsonb;`;
        await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS id_card_config JSONB DEFAULT '{}'::jsonb;`;

        console.log("SUCCESS: MIGRATED COLUMNS");
    } catch (e) {
        console.error("HTTP CONNECTION FAILED:", e);
    } finally {
        process.exit();
    }
}

test();
