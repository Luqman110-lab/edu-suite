import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // fail fast if max connections reached
});

async function main() {
    try {
        console.log("Connecting to database to kill orphaned connections...");
        const res = await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid()
              AND usename = current_user
              AND datname = current_database();
        `);
        console.log("Terminated backends count:", res.rowCount);
    } catch (e) {
        console.error("Connection or Query Failed:", e.message);
    } finally {
        await pool.end();
    }
}
main();
