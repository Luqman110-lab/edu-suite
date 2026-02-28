const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query('SELECT id, name, class_level FROM students LIMIT 5');
        console.log("Students:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
