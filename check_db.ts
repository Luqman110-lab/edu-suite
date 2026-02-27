import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 10000 // 10s timeout
});

async function main() {
    try {
        console.log("--------------- fee_payments ---------------");
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'fee_payments';
        `);
        console.log(res.rows.map(r => r.column_name));

        console.log("--------------- school_events ---------------");
        const res2 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'school_events';
        `);
        console.log(res2.rows.map(r => r.column_name));

        console.log("--------------- teachers ---------------");
        const res3 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'teachers';
        `);
        console.log(res3.rows.map(r => r.column_name));

    } catch (e) {
        console.error("Query Failed:", e.message);
    } finally {
        await pool.end();
    }
}
main();
