
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and, gt, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function inspect() {
    console.log("🔍 Inspecting Plans...");
    const plans = await db.query.paymentPlans.findMany({
        with: {
            installments: true
        }
    });

    console.log(`Found ${plans.length} plans.`);
    for (const p of plans) {
        console.log(`Plan ID: ${p.id}, Name: ${p.planName}, Total: ${p.totalAmount}, Down: ${p.downPayment}`);
        console.log(`  Installments: ${p.installments.length}`);
        p.installments.forEach(i => {
            console.log(`    Inst #${i.installmentNumber}: Amount=${i.amount}, Paid=${i.paidAmount}, Status=${i.status}`);
        });
    }

    console.log("🔍 Inspecting Fee Payments...");
    const payments = await db.query.feePayments.findMany();
    console.log(`Found ${payments.length} fee payments.`);
    payments.forEach(p => console.log(`  Payment ID: ${p.id}, Amount: ${p.amountPaid}, Notes: ${p.notes}`));

    await pool.end();
}

inspect().catch(console.error);
