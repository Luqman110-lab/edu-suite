require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: `${process.env.DATABASE_URL}?sslmode=require`,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        await client.query('ALTER TABLE marks ADD COLUMN IF NOT EXISTS aggregate INTEGER DEFAULT 0;');
        console.log('Added aggregate column');

        await client.query("ALTER TABLE marks ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '';");
        console.log('Added division column');

        const res = await client.query('SELECT aggregate, division FROM marks LIMIT 1;');
        console.log('Validation success:', res.fields.map(f => f.name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
        console.log('Disconnected');
    }
}
run();
