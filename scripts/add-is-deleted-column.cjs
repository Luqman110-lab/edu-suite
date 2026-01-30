
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();
    try {
        console.log("Adding is_deleted column to fee_payments...");
        await client.query(`
      ALTER TABLE fee_payments 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
        console.log("Column added successfully.");
    } catch (err) {
        console.error("Error adding column:", err);
    } finally {
        await client.end();
    }
}

run();
