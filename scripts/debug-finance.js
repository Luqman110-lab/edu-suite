import pg from 'pg';
import { eq, and } from 'drizzle-orm';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        await client.connect();
        console.log("Connected to database...");

        // 1. Check School
        const schools = await client.query('SELECT * FROM schools LIMIT 1');
        const schoolId = schools.rows[0]?.id;
        console.log(`Debug School ID: ${schoolId}`);

        if (!schoolId) return;

        // 2. Check Fee Structures
        const feeStructs = await client.query('SELECT * FROM fee_structures WHERE school_id = $1', [schoolId]);
        console.log(`\nFee Structures Found: ${feeStructs.rowCount}`);
        feeStructs.rows.forEach(f => {
            console.log(` - [${f.id}] ${f.class_level} | ${f.fee_type} | ${f.amount} | Term ${f.term} | Year ${f.year} | Status: ${f.is_active}`);
        });

        // 3. Check Active Students
        const students = await client.query('SELECT * FROM students WHERE school_id = $1 AND is_active = true', [schoolId]);
        console.log(`\nActive Students Found: ${students.rowCount}`);
        if (students.rowCount > 0) {
            console.log(` - Sample Student: ${students.rows[0].name} (${students.rows[0].class_level})`);
        }

        // 4. Simulate Generation (Term 1 2026)
        console.log("\n--- Simulation: Term 1 2026 ---");
        let matches = 0;
        const fees2026 = feeStructs.rows.filter(f => f.year === 2026 && (f.term == 1 || f.term === null));
        console.log(`Relevant Fees for T1/2026: ${fees2026.length}`);

        students.rows.forEach(s => {
            const applicable = fees2026.filter(f =>
                f.class_level === s.class_level
            );
            if (applicable.length > 0) {
                matches++;
                // console.log(`Match for ${s.name}: ${applicable.length} fees`);
            }
        });
        console.log(`\nProjected Invoices to Create: ${matches}`);

        // 5. Check Existing Invoices
        const invoices = await client.query('SELECT * FROM invoices WHERE school_id = $1', [schoolId]);
        console.log(`\nExisting Invoices in DB: ${invoices.rowCount}`);
        invoices.rows.forEach(i => {
            console.log(` - Inv: ${i.invoice_number} | Amount: ${i.total_amount} | Term ${i.term} ${i.year}`);
        });

        // 6. Check Finance Transactions (Legacy)
        const tx = await client.query('SELECT count(*) FROM finance_transactions WHERE school_id = $1', [schoolId]);
        console.log(`\nLegacy Finance Transactions: ${tx.rows[0].count}`);

    } catch (error) {
        console.error("Debug failed:", error);
    } finally {
        await client.end();
    }
}

debug();
