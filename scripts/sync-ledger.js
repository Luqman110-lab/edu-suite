
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and, gt, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function syncLedger() {
    console.log("🔄 Starting Ledger Sync...");

    // 1. Sync Installments
    const installments = await db.query.planInstallments.findMany({
        where: gt(schema.planInstallments.paidAmount, 0),
        with: {
            plan: true
        }
    });

    console.log(`Found ${installments.length} installments with payments.`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const inst of installments) {
        const description = `Installment #${inst.installmentNumber} - ${inst.plan.planName}`;
        const existingPayment = await db.query.feePayments.findFirst({
            where: sql`${schema.feePayments.notes} LIKE ${`%${description}%`}`
        });

        if (existingPayment) {
            skippedCount++;
            continue;
        }

        let studentId = inst.plan.studentId;

        // Fetch Invoice for Term/Year
        let term = 1;
        let year = 2026;
        let invoice = null;

        if (inst.plan.invoiceId) {
            invoice = await db.query.invoices.findFirst({
                where: eq(schema.invoices.id, inst.plan.invoiceId)
            });
            if (invoice) {
                term = invoice.term;
                year = invoice.year;
            }
        }

        const [payment] = await db.insert(schema.feePayments).values({
            schoolId: inst.plan.schoolId,
            studentId: studentId,
            term: term,
            year: year,
            amountDue: Math.round(Number(inst.amount)), // Or invoice balance? For single payment record, maybe 0 or inst.amount
            amountPaid: Math.round(Number(inst.paidAmount)),
            paymentDate: inst.paidAt || new Date(),
            paymentMethod: 'Adjustment',
            feeType: 'Tuition',
            notes: `[Sync] ${description}`,
        }).returning();

        await db.insert(schema.financeTransactions).values({
            schoolId: inst.plan.schoolId,
            studentId: studentId,
            transactionType: 'credit',
            amount: Math.round(Number(inst.paidAmount)),
            description: `[Sync] Payment Plan: ${inst.plan.planName} (Inst #${inst.installmentNumber})`,
            term: term,
            year: year,
            transactionDate: (inst.paidAt || new Date()).toISOString().split('T')[0],
        });

        // Update Main Invoice
        if (invoice) {
            const currentPaid = invoice.amountPaid || 0;
            const paymentAmount = Math.round(Number(inst.paidAmount || 0));

            if (currentPaid < paymentAmount) {
                const newPaid = currentPaid + paymentAmount;
                const newBal = Math.max(0, invoice.totalAmount - newPaid);

                await db.update(schema.invoices)
                    .set({
                        amountPaid: newPaid,
                        balance: newBal,
                        status: newBal === 0 ? 'paid' : 'partial',
                        updatedAt: new Date()
                    })
                    .where(eq(schema.invoices.id, invoice.id));
                console.log(`Updated Invoice #${invoice.invoiceNumber}`);
            }
        }

        syncedCount++;
    }

    // 2. Sync Down Payments
    console.log("Checking Down Payments...");
    const plans = await db.query.paymentPlans.findMany({
        where: gt(schema.paymentPlans.downPayment, 0)
    });
    console.log(`Found ${plans.length} plans with down payments.`);

    for (const plan of plans) {
        const description = `Down Payment - ${plan.planName}`;
        const existingPayment = await db.query.feePayments.findFirst({
            where: sql`${schema.feePayments.notes} LIKE ${`%${description}%`}`
        });

        if (existingPayment) {
            skippedCount++;
            continue;
        }

        let term = 1;
        let year = 2026;
        let invoice = null;

        if (plan.invoiceId) {
            invoice = await db.query.invoices.findFirst({
                where: eq(schema.invoices.id, plan.invoiceId)
            });
            if (invoice) {
                term = invoice.term;
                year = invoice.year;
            }
        }

        console.log(`Syncing Down Payment for ${plan.planName}: ${plan.downPayment}`);

        const [payment] = await db.insert(schema.feePayments).values({
            schoolId: plan.schoolId,
            studentId: plan.studentId,
            term: term,
            year: year,
            amountDue: Math.round(Number(plan.downPayment)),
            amountPaid: Math.round(Number(plan.downPayment)),
            paymentDate: new Date(plan.startDate),
            paymentMethod: 'Adjustment',
            feeType: 'Tuition',
            notes: `[Sync] ${description}`,
        }).returning();

        await db.insert(schema.financeTransactions).values({
            schoolId: plan.schoolId,
            studentId: plan.studentId,
            transactionType: 'credit',
            amount: Math.round(Number(plan.downPayment)),
            description: `[Sync] ${description}`,
            term: term,
            year: year,
            transactionDate: new Date(plan.startDate).toISOString().split('T')[0],
        });

        if (invoice) {
            const currentPaid = invoice.amountPaid || 0;
            const paymentAmount = Math.round(Number(plan.downPayment));
            if (currentPaid < paymentAmount) {
                const newPaid = currentPaid + paymentAmount;
                const newBal = Math.max(0, invoice.totalAmount - newPaid);
                await db.update(schema.invoices)
                    .set({
                        amountPaid: newPaid,
                        balance: newBal,
                        status: newBal === 0 ? 'paid' : 'partial',
                        updatedAt: new Date()
                    })
                    .where(eq(schema.invoices.id, invoice.id));
                console.log(`Updated Invoice #${invoice.invoiceNumber} (Down Payment)`);
            }
        }
        syncedCount++;
    }

    console.log(`✅ Sync Complete.`);
    console.log(`Synced: ${syncedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    await pool.end();
}

syncLedger().catch(console.error);
