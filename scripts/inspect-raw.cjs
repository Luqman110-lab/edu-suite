
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();
    try {
        console.log("Connected to DB:", process.env.DATABASE_URL.split('@')[1]); // Show host part

        const resInvoices = await client.query('SELECT count(*) FROM invoices');
        console.log("Invoices count:", resInvoices.rows[0].count);

        const resPlans = await client.query('SELECT count(*) FROM payment_plans');
        console.log("Payment Plans count:", resPlans.rows[0].count);

        const resInstallments = await client.query('SELECT count(*) FROM plan_installments');
        console.log("Installments count:", resInstallments.rows[0].count);

        // Dump first plan if exists
        if (parseInt(resPlans.rows[0].count) > 0) {
            const p = await client.query('SELECT * FROM payment_plans LIMIT 1');
            console.log("First Plan:", p.rows[0]);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
