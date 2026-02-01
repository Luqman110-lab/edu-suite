
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
}

console.log(`Testing connection to: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Try permissive SSL first
    connectionTimeoutMillis: 10000,
});

pool.connect()
    .then(client => {
        console.log("Successfully connected to the database!");
        return client.query('SELECT NOW()')
            .then(res => {
                console.log("Database time:", res.rows[0].now);
                client.release();
                process.exit(0);
            })
            .catch(err => {
                console.error("Error executing query:", err);
                client.release();
                process.exit(1);
            });
    })
    .catch(err => {
        console.error("Failed to connect:", err);
        process.exit(1);
    });
