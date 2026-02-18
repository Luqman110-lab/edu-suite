import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, asc, sql, gt, or, isNull, inArray } from "drizzle-orm";
import {
    feeStructures, feePayments, expenses, expenseCategories, financeTransactions,
    invoices, invoiceItems, paymentPlans, planInstallments, studentFeeOverrides,
    scholarships, studentScholarships, students
} from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const feesRoutes = Router();

// GET /api/fee-structures
feesRoutes.get("/fee-structures", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const fees = await db.select().from(feeStructures)
            .where(and(eq(feeStructures.schoolId, schoolId), eq(feeStructures.isActive, true)))
            .orderBy(feeStructures.classLevel);
        res.json(fees);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch fee structures: " + error.message });
    }
});

// POST /api/fee-structures
feesRoutes.post("/fee-structures", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { classLevel, feeType, amount, term, year, boardingStatus, description } = req.body;
        const feeAmount = Number(amount);
        if (isNaN(feeAmount) || feeAmount < 0) return res.status(400).json({ message: "Amount must be a non-negative number" });
        if (!classLevel || !feeType) return res.status(400).json({ message: "classLevel and feeType are required" });
        if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });
        const newFee = await db.insert(feeStructures).values({
            schoolId, classLevel, feeType, amount: feeAmount,
            term: term || null, year: Number(year),
            boardingStatus: boardingStatus || 'all', description, isActive: true
        }).returning();
        res.json(newFee[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create fee structure" });
    }
});

// PUT /api/fee-structures/:id
feesRoutes.put("/fee-structures/:id", requireAdmin, async (req, res) => {
    try {
        const id = parseInt(param(req, 'id'));
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const existing = await db.select().from(feeStructures).where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)));
        if (!existing.length) return res.status(404).json({ message: "Fee structure not found" });
        const updated = await db.update(feeStructures).set({ ...req.body, updatedAt: new Date() }).where(eq(feeStructures.id, id)).returning();
        res.json(updated[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update fee structure: " + error.message });
    }
});

// DELETE /api/fee-structures/:id
feesRoutes.delete("/fee-structures/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        await db.update(feeStructures).set({ isActive: false })
            .where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)));
        res.json({ message: "Fee structure deleted" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete fee structure" });
    }
});

// GET /api/fee-payments
feesRoutes.get("/fee-payments", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        const conditions = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(feePayments).where(and(...conditions));
        const payments = await db.select().from(feePayments).where(and(...conditions))
            .orderBy(desc(feePayments.createdAt)).limit(limit).offset(offset);
        res.json({ data: payments, total: Number(countResult.count), limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch fee payments: " + error.message });
    }
});

// GET /api/fee-payments/student/:studentId
feesRoutes.get("/fee-payments/student/:studentId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(param(req, 'studentId'));
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });
        const payments = await db.select().from(feePayments)
            .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.studentId, studentId), eq(feePayments.isDeleted, false)))
            .orderBy(desc(feePayments.createdAt));
        res.json(payments);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch student payments" });
    }
});

// POST /api/fee-payments
feesRoutes.post("/fee-payments", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, feeType, amountPaid, term, year, paymentMethod, receiptNumber, notes } = req.body;
        if (!studentId || !feeType || !term || !year) return res.status(400).json({ message: "studentId, feeType, term, and year are required" });
        const paidAmount = Number(amountPaid);
        if (isNaN(paidAmount) || paidAmount <= 0) return res.status(400).json({ message: "amountPaid must be a positive number" });
        const termNum = Number(term), yearNum = Number(year);
        if (termNum < 1 || termNum > 3) return res.status(400).json({ message: "Term must be 1, 2, or 3" });
        if (yearNum < 2020 || yearNum > 2100) return res.status(400).json({ message: "Year must be between 2020 and 2100" });
        const validMethods = ['Cash', 'Bank Deposit', 'Cheque'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';
        const studentCheck = await db.select({ id: students.id }).from(students)
            .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) return res.status(403).json({ message: "Student does not belong to the active school" });
        const today = new Date().toISOString().split('T')[0];
        const result = await db.transaction(async (tx) => {
            let finalReceiptNumber = receiptNumber;
            if (!finalReceiptNumber) {
                const lastReceipt = await tx.select({ receiptNumber: feePayments.receiptNumber }).from(feePayments)
                    .where(and(eq(feePayments.schoolId, schoolId), sql`${feePayments.receiptNumber} LIKE ${'REC-' + yearNum + '-%'}`))
                    .orderBy(desc(feePayments.id)).limit(1);
                let nextNum = 1;
                if (lastReceipt[0]?.receiptNumber) {
                    const parts = lastReceipt[0].receiptNumber.split('-');
                    const lastNum = parseInt(parts[parts.length - 1]);
                    if (!isNaN(lastNum)) nextNum = lastNum + 1;
                }
                finalReceiptNumber = `REC-${yearNum}-${nextNum.toString().padStart(4, '0')}`;
            }
            const matchingInvoice = await tx.select().from(invoices)
                .where(and(eq(invoices.schoolId, schoolId), eq(invoices.studentId, studentId), eq(invoices.term, termNum), eq(invoices.year, yearNum))).limit(1);
            const invoice = matchingInvoice[0];
            const serverAmountDue = invoice ? invoice.balance : 0;
            if (invoice && paidAmount > invoice.balance && invoice.balance > 0) {
                throw new Error(`OVERPAYMENT: Amount (${paidAmount}) exceeds invoice balance (${invoice.balance})`);
            }
            const balance = Math.max(0, serverAmountDue - paidAmount);
            const status = balance <= 0 ? 'paid' : 'partial';
            const [newPayment] = await tx.insert(feePayments).values({
                schoolId, studentId, feeType, amountDue: serverAmountDue, amountPaid: paidAmount,
                balance, term: termNum, year: yearNum, paymentDate: today,
                paymentMethod: method, receiptNumber: finalReceiptNumber, status, notes,
                receivedBy: req.user?.id?.toString()
            }).returning();
            await tx.insert(financeTransactions).values({
                schoolId, studentId, transactionType: 'credit', amount: paidAmount,
                description: `Payment - ${feeType} (T${termNum}/${yearNum}) - ${finalReceiptNumber}`,
                term: termNum, year: yearNum, transactionDate: today
            });
            if (invoice) {
                await tx.update(invoices).set({
                    amountPaid: sql`${invoices.amountPaid} + ${paidAmount}`,
                    balance: sql`GREATEST(0, ${invoices.totalAmount} - (${invoices.amountPaid} + ${paidAmount}))`,
                    status: sql`CASE WHEN (${invoices.amountPaid} + ${paidAmount}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                    updatedAt: new Date()
                }).where(eq(invoices.id, invoice.id));
            }
            return newPayment;
        });
        res.json(result);
    } catch (error: any) {
        console.error("Create fee payment error:", error);
        if (error.message?.startsWith('OVERPAYMENT:')) return res.status(400).json({ message: error.message.replace('OVERPAYMENT: ', '') });
        res.status(500).json({ message: "Failed to create fee payment" });
    }
});

// GET /api/financial-summary
feesRoutes.get("/financial-summary", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const finStats = await db.select({
            totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
        }).from(financeTransactions).where(eq(financeTransactions.schoolId, schoolId));
        const totalRevenue = Number(finStats[0].totalCredits || 0);
        const totalDue = Number(finStats[0].totalDebits || 0);
        const totalOutstanding = totalDue - totalRevenue;
        const paymentsCountRes = await db.select({ count: sql<number>`count(*)` }).from(feePayments)
            .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)));
        const expenseRecords = await db.select().from(expenses).where(eq(expenses.schoolId, schoolId));
        const totalExpenses = expenseRecords.reduce((sum, e) => sum + (e.amount || 0), 0);
        res.json({
            totalRevenue, totalExpenses, totalOutstanding, totalDue,
            netIncome: totalRevenue - totalExpenses,
            collectionRate: totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0,
            paymentCount: Number(paymentsCountRes[0].count), expenseCount: expenseRecords.length
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch financial summary: " + error.message });
    }
});

// GET /api/finance-transactions/:studentId
feesRoutes.get("/finance-transactions/:studentId", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const studentId = parseInt(param(req, 'studentId'));
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid key" });
        const transactionsAsc = await db.execute(sql`
SELECT *, SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE - amount END)
OVER(ORDER BY transaction_date ASC, id ASC) as running_balance
FROM finance_transactions
WHERE student_id = ${studentId} AND school_id = ${schoolId}
ORDER BY transaction_date ASC, id ASC`);
        res.json(transactionsAsc.rows);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch transactions: " + error.message });
    }
});

// GET /api/invoices
feesRoutes.get("/invoices", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, term, year, status, limit = '50', offset = '0' } = req.query;
        const conditions = [eq(invoices.schoolId, schoolId)];
        if (studentId) conditions.push(eq(invoices.studentId, parseInt(studentId as string)));
        if (term) conditions.push(eq(invoices.term, parseInt(term as string)));
        if (year) conditions.push(eq(invoices.year, parseInt(year as string)));
        if (status && typeof status === 'string') conditions.push(eq(invoices.status, status));
        const results = await db.select({
            invoice: invoices, studentName: students.name,
            studentClass: students.classLevel, studentStream: students.stream,
        }).from(invoices).leftJoin(students, eq(invoices.studentId, students.id))
            .where(and(...conditions)).orderBy(desc(invoices.createdAt))
            .limit(parseInt(limit as string)).offset(parseInt(offset as string));
        res.json(results.map(r => ({ ...r.invoice, studentName: r.studentName, studentClass: r.studentClass, studentStream: r.studentStream })));
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch invoices: " + error.message });
    }
});

// GET /api/invoices/:id
feesRoutes.get("/invoices/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const invoiceId = parseInt(param(req, 'id'));
        if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });
        const [invoice] = await db.select({
            invoice: invoices, studentName: students.name,
            studentClass: students.classLevel, studentStream: students.stream,
        }).from(invoices).leftJoin(students, eq(invoices.studentId, students.id))
            .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)));
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        res.json({ ...invoice.invoice, studentName: invoice.studentName, studentClass: invoice.studentClass, studentStream: invoice.studentStream, items });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch invoice: " + error.message });
    }
});

// POST /api/invoices/generate
feesRoutes.post("/invoices/generate", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { term, year, dueDate, classLevel } = req.body;
        if (!term || !year) return res.status(400).json({ message: "Term and year are required" });
        const termNum = Number(term), yearNum = Number(year);
        if (termNum < 1 || termNum > 3) return res.status(400).json({ message: "Term must be 1, 2, or 3" });
        if (yearNum < 2020 || yearNum > 2100) return res.status(400).json({ message: "Year must be between 2020 and 2100" });

        const structures = await db.select().from(feeStructures).where(and(
            eq(feeStructures.schoolId, schoolId),
            or(eq(feeStructures.term, termNum), isNull(feeStructures.term)),
            eq(feeStructures.year, yearNum), eq(feeStructures.isActive, true)
        ));
        if (structures.length === 0) return res.status(400).json({ message: "No fee structures found for this term/year" });

        let studentConditions: any[] = [eq(students.schoolId, schoolId), eq(students.isActive, true)];
        if (classLevel) studentConditions.push(eq(students.classLevel, classLevel));
        const activeStudents = await db.select().from(students).where(and(...studentConditions));
        if (activeStudents.length === 0) return res.status(400).json({ message: "No active students found" });

        const overrides = await db.select().from(studentFeeOverrides).where(and(
            eq(studentFeeOverrides.schoolId, schoolId), eq(studentFeeOverrides.year, yearNum),
            or(eq(studentFeeOverrides.term, termNum), isNull(studentFeeOverrides.term)), eq(studentFeeOverrides.isActive, true)
        ));
        const overrideMap = new Map<string, number>();
        for (const o of overrides) overrideMap.set(`${o.studentId}-${o.feeType}`, o.customAmount);

        const activeScholarships = await db.select().from(scholarships).where(and(eq(scholarships.schoolId, schoolId), eq(scholarships.isActive, true)));
        const scholarshipAssignments = await db.select().from(studentScholarships).where(and(
            eq(studentScholarships.schoolId, schoolId), eq(studentScholarships.year, yearNum),
            or(eq(studentScholarships.term, termNum), isNull(studentScholarships.term)), eq(studentScholarships.status, 'active')
        ));
        const scholarshipMap = new Map<number, Array<{ discountType: string; discountValue: number; feeTypes: string[] }>>();
        for (const sa of scholarshipAssignments) {
            const sch = activeScholarships.find(s => s.id === sa.scholarshipId);
            if (!sch) continue;
            const existing = scholarshipMap.get(sa.studentId) || [];
            existing.push({ discountType: sch.discountType, discountValue: sch.discountValue, feeTypes: (sch.feeTypes as string[]) || [] });
            scholarshipMap.set(sa.studentId, existing);
        }

        const result = await db.transaction(async (tx) => {
            let invoicesCreated = 0, invoicesSkipped = 0;
            for (const student of activeStudents) {
                const existing = await tx.select({ id: invoices.id }).from(invoices).where(and(
                    eq(invoices.schoolId, schoolId), eq(invoices.studentId, student.id),
                    eq(invoices.term, termNum), eq(invoices.year, yearNum)
                )).limit(1);
                if (existing.length > 0) { invoicesSkipped++; continue; }

                const applicableStructures = structures.filter(s =>
                    s.classLevel === student.classLevel &&
                    (!s.boardingStatus || s.boardingStatus === student.boardingStatus || s.boardingStatus === 'all')
                );
                if (applicableStructures.length === 0) continue;

                const itemsWithAmounts = applicableStructures.map(s => {
                    const amount = overrideMap.get(`${student.id}-${s.feeType}`) ?? s.amount;
                    return { feeType: s.feeType, classLevel: s.classLevel, amount };
                });

                const studentDiscounts = scholarshipMap.get(student.id) || [];
                for (const item of itemsWithAmounts) {
                    for (const disc of studentDiscounts) {
                        if (disc.feeTypes.length === 0 || disc.feeTypes.includes(item.feeType)) {
                            if (disc.discountType === 'percentage') item.amount = Math.round(item.amount * (1 - disc.discountValue / 100));
                            else if (disc.discountType === 'fixed') item.amount = Math.max(0, item.amount - disc.discountValue);
                        }
                    }
                }

                const totalAmount = itemsWithAmounts.reduce((sum, item) => sum + item.amount, 0);
                const invoiceNumber = `INV-${yearNum}-T${termNum}-${schoolId}-${student.id.toString().padStart(5, '0')}`;
                const [newInvoice] = await tx.insert(invoices).values({
                    schoolId, studentId: student.id, invoiceNumber, term: termNum, year: yearNum,
                    totalAmount, amountPaid: 0, balance: totalAmount,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null, status: 'unpaid',
                }).returning();
                for (const item of itemsWithAmounts) {
                    await tx.insert(invoiceItems).values({ invoiceId: newInvoice.id, feeType: item.feeType, description: `${item.feeType} - ${item.classLevel}`, amount: item.amount });
                }
                invoicesCreated++;
            }
            return { invoicesCreated, invoicesSkipped };
        });
        res.json({ message: `Generated ${result.invoicesCreated} invoices, skipped ${result.invoicesSkipped} existing`, ...result });
    } catch (error: any) {
        console.error("Generate invoices error:", error);
        res.status(500).json({ message: "Failed to generate invoices" });
    }
});

// PUT /api/invoices/:id
feesRoutes.put("/invoices/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const invoiceId = parseInt(param(req, 'id'));
        if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });
        const { notes, dueDate } = req.body;
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (notes !== undefined) updateData.notes = notes;
        if (dueDate !== undefined) updateData.dueDate = dueDate;
        const updated = await db.update(invoices).set(updateData)
            .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId))).returning();
        if (updated.length === 0) return res.status(404).json({ message: "Invoice not found" });
        res.json(updated[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update invoice" });
    }
});

// POST /api/invoices/:id/remind
feesRoutes.post("/invoices/:id/remind", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const invoiceId = parseInt(param(req, 'id'));
        if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });
        const { type = 'sms' } = req.body;
        const invoice = await db.query.invoices.findFirst({
            where: and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)), with: { student: true }
        });
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        console.log(`[Mock ${type.toUpperCase()}] Sending reminder for invoice ${invoice.invoiceNumber}. Amount: ${invoice.balance}`);
        await db.update(invoices).set({ reminderSentAt: new Date(), reminderCount: (invoice.reminderCount || 0) + 1, lastReminderType: type })
            .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)));
        res.json({ message: `${type.toUpperCase()} reminder sent successfully`, success: true });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to send reminder" });
    }
});

// POST /api/invoices/bulk-remind
feesRoutes.post("/invoices/bulk-remind", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { type = 'sms', minBalance = 0 } = req.body;
        const overdueInvoices = await db.select().from(invoices).where(and(eq(invoices.schoolId, schoolId), gt(invoices.balance, minBalance)));
        let sentCount = 0;
        for (const inv of overdueInvoices) {
            sentCount++;
            await db.update(invoices).set({ reminderSentAt: new Date(), reminderCount: (inv.reminderCount || 0) + 1, lastReminderType: type }).where(eq(invoices.id, inv.id));
        }
        res.json({ message: `Sent ${sentCount} reminders successfully`, count: sentCount });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to send bulk reminders" });
    }
});

// GET /api/finance/debtors
feesRoutes.get("/finance/debtors", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { term, year, classLevel } = req.query;
        const conditions: any[] = [eq(invoices.schoolId, schoolId), gt(invoices.balance, 0)];
        if (term) conditions.push(eq(invoices.term, parseInt(term as string)));
        if (year) conditions.push(eq(invoices.year, parseInt(year as string)));
        const debtorInvoices = await db.select({
            invoice: invoices, studentName: students.name,
            studentClass: students.classLevel, studentStream: students.stream, parentPhone: students.parentContact,
        }).from(invoices).leftJoin(students, eq(invoices.studentId, students.id)).where(and(...conditions)).orderBy(desc(invoices.balance));
        const now = new Date();
        const debtors = debtorInvoices.map(d => {
            const dueDate = d.invoice.dueDate ? new Date(d.invoice.dueDate) : new Date(d.invoice.createdAt || now);
            const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            let agingCategory = 'current';
            if (daysOverdue > 90) agingCategory = '90+';
            else if (daysOverdue > 60) agingCategory = '61-90';
            else if (daysOverdue > 30) agingCategory = '31-60';
            else if (daysOverdue > 0) agingCategory = '1-30';
            return { ...d.invoice, studentName: d.studentName, studentClass: d.studentClass, studentStream: d.studentStream, parentPhone: d.parentPhone, daysOverdue, agingCategory };
        });
        const filtered = classLevel ? debtors.filter(d => d.studentClass === classLevel) : debtors;
        const summary = {
            totalDebtors: filtered.length,
            totalOutstanding: filtered.reduce((sum, d) => sum + d.balance, 0),
            current: filtered.filter(d => d.agingCategory === 'current').reduce((sum, d) => sum + d.balance, 0),
            days1to30: filtered.filter(d => d.agingCategory === '1-30').reduce((sum, d) => sum + d.balance, 0),
            days31to60: filtered.filter(d => d.agingCategory === '31-60').reduce((sum, d) => sum + d.balance, 0),
            days61to90: filtered.filter(d => d.agingCategory === '61-90').reduce((sum, d) => sum + d.balance, 0),
            days90plus: filtered.filter(d => d.agingCategory === '90+').reduce((sum, d) => sum + d.balance, 0),
        };
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        res.json({ debtors: filtered.slice(offset, offset + limit), summary, total: filtered.length, limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch debtors: " + error.message });
    }
});

// GET /api/finance/hub-stats
feesRoutes.get("/finance/hub-stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { term, year } = req.query;
        let invoiceConditions: any[] = [eq(invoices.schoolId, schoolId)];
        if (term) invoiceConditions.push(eq(invoices.term, parseInt(term as string)));
        if (year) invoiceConditions.push(eq(invoices.year, parseInt(year as string)));
        const invoiceStats = await db.select({
            totalDue: sql<number>`COALESCE(SUM(total_amount), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(amount_paid), 0)`,
            totalBalance: sql<number>`COALESCE(SUM(balance), 0)`,
            invoiceCount: sql<number>`COUNT(*)`,
        }).from(invoices).where(and(...invoiceConditions));
        let expenseConditions: any[] = [eq(expenses.schoolId, schoolId)];
        if (term) expenseConditions.push(eq(expenses.term, parseInt(term as string)));
        if (year) expenseConditions.push(eq(expenses.year, parseInt(year as string)));
        const expenseStats = await db.select({ totalExpenses: sql<number>`COALESCE(SUM(amount), 0)` }).from(expenses).where(and(...expenseConditions));
        let paymentConditions: any[] = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];
        if (term) paymentConditions.push(eq(feePayments.term, parseInt(term as string)));
        if (year) paymentConditions.push(eq(feePayments.year, parseInt(year as string)));
        const paymentStats = await db.select({ totalCollected: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(feePayments).where(and(...paymentConditions));
        const stats = invoiceStats[0], expStats = expenseStats[0], payStats = paymentStats[0];
        const totalDue = Number(stats?.totalDue || 0);
        const totalCollected = Number(payStats?.totalCollected || stats?.totalPaid || 0);
        const totalOutstanding = Number(stats?.totalBalance || 0);
        const totalExpenses = Number(expStats?.totalExpenses || 0);
        res.json({ totalDue, totalCollected, totalOutstanding, totalExpenses, netIncome: totalCollected - totalExpenses, collectionRate: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0, invoiceCount: Number(stats?.invoiceCount || 0) });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch hub stats: " + error.message });
    }
});

// GET /api/payment-plans
feesRoutes.get("/payment-plans", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(paymentPlans).where(eq(paymentPlans.schoolId, schoolId));
        const plans = await db.query.paymentPlans.findMany({
            where: eq(paymentPlans.schoolId, schoolId),
            with: { student: true, installments: true },
            orderBy: [desc(paymentPlans.createdAt)], limit, offset,
        });
        res.json({ data: plans, total: Number(countResult.count), limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list plans" });
    }
});

// POST /api/payment-plans
feesRoutes.post("/payment-plans", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, invoiceId, planName, totalAmount, downPayment, installmentCount, frequency, startDate } = req.body;
        const total = Number(totalAmount), down = Number(downPayment) || 0, count = Number(installmentCount);
        if (isNaN(total) || total <= 0) return res.status(400).json({ message: "totalAmount must be a positive number" });
        if (down < 0 || down >= total) return res.status(400).json({ message: "downPayment must be between 0 and totalAmount" });
        if (!count || count < 1 || count > 36) return res.status(400).json({ message: "installmentCount must be between 1 and 36" });
        if (!startDate) return res.status(400).json({ message: "startDate is required" });
        if (!['weekly', 'monthly'].includes(frequency)) return res.status(400).json({ message: "frequency must be 'weekly' or 'monthly'" });
        const studentCheck = await db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) return res.status(403).json({ message: "Student does not belong to the active school" });
        const amountPerInstallment = Math.round((total - down) / count);
        const start = new Date(startDate);
        const newPlan = await db.transaction(async (tx) => {
            const [plan] = await tx.insert(paymentPlans).values({ schoolId, studentId, invoiceId, planName, totalAmount: total, downPayment: down, installmentCount: count, frequency, startDate: start, status: 'active' }).returning();
            for (let i = 1; i <= count; i++) {
                const dueDate = new Date(start);
                if (frequency === 'weekly') dueDate.setDate(dueDate.getDate() + (i * 7));
                else dueDate.setMonth(dueDate.getMonth() + i);
                await tx.insert(planInstallments).values({ planId: plan.id, installmentNumber: i, dueDate, amount: amountPerInstallment, status: 'pending' });
            }
            return plan;
        });
        res.json(newPlan);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create payment plan" });
    }
});

// GET /api/payment-plans/:id
feesRoutes.get("/payment-plans/:id", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        if (isNaN(id)) return res.status(400).json({ message: "Invalid plan ID" });
        const plan = await db.query.paymentPlans.findFirst({
            where: and(eq(paymentPlans.id, id), eq(paymentPlans.schoolId, schoolId)),
            with: { student: true, installments: { orderBy: asc(planInstallments.installmentNumber) } },
        });
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        res.json(plan);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to get plan" });
    }
});

// POST /api/payment-plans/:id/pay
feesRoutes.post("/payment-plans/:id/pay", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { installmentId, amount } = req.body;
        const planId = parseInt(param(req, 'id'));
        const payAmount = Number(amount);
        if (isNaN(payAmount) || payAmount <= 0) return res.status(400).json({ message: "Amount must be a positive number" });
        if (isNaN(planId)) return res.status(400).json({ message: "Invalid plan ID" });
        const installment = await db.query.planInstallments.findFirst({ where: eq(planInstallments.id, installmentId) });
        if (!installment) return res.status(404).json({ message: "Installment not found" });
        const remaining = installment.amount - (installment.paidAmount || 0);
        if (payAmount > remaining) return res.status(400).json({ message: `Amount exceeds remaining balance of ${Math.round(remaining)}` });
        const plan = await db.query.paymentPlans.findFirst({ where: eq(paymentPlans.id, planId), with: { invoice: true } });
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        if (plan.schoolId !== schoolId) return res.status(403).json({ message: "Access denied to payment plan from another school" });
        const today = new Date();
        const termId = plan.invoice?.term || 1;
        const yearId = plan.invoice?.year || new Date().getFullYear();
        await db.transaction(async (tx) => {
            const lastReceipt = await tx.select({ receiptNumber: feePayments.receiptNumber }).from(feePayments)
                .where(and(eq(feePayments.schoolId, schoolId), sql`${feePayments.receiptNumber} LIKE ${'REC-' + yearId + '-%'}`))
                .orderBy(desc(feePayments.id)).limit(1);
            let nextNum = 1;
            if (lastReceipt[0]?.receiptNumber) {
                const parts = lastReceipt[0].receiptNumber.split('-');
                const lastNum = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const receiptNumber = `REC-${yearId}-${nextNum.toString().padStart(4, '0')}`;
            const newPaidAmount = (installment.paidAmount || 0) + payAmount;
            const isFull = newPaidAmount >= installment.amount;
            await tx.update(planInstallments).set({ paidAmount: newPaidAmount, paidAt: today, status: isFull ? 'paid' : 'partial' }).where(eq(planInstallments.id, installmentId));
            await tx.insert(feePayments).values({
                schoolId: plan.schoolId, studentId: plan.studentId,
                amountDue: Math.round(installment.amount), amountPaid: Math.round(payAmount),
                balance: Math.max(0, Math.round(remaining - payAmount)), term: termId, year: yearId,
                paymentDate: today.toISOString().split('T')[0], paymentMethod: 'Cash', feeType: 'Tuition',
                receiptNumber, notes: `Installment #${installment.installmentNumber} - ${plan.planName}`,
                receivedBy: req.user?.id?.toString(),
            }).returning();
            await tx.insert(financeTransactions).values({
                schoolId: plan.schoolId, studentId: plan.studentId, transactionType: 'credit',
                amount: Math.round(payAmount), term: termId, year: yearId,
                description: `Payment Plan: ${plan.planName} (Inst #${installment.installmentNumber}) - ${receiptNumber}`,
                transactionDate: today.toISOString().split('T')[0],
            });
            if (plan.invoiceId) {
                await tx.update(invoices).set({
                    amountPaid: sql`${invoices.amountPaid} + ${Math.round(payAmount)}`,
                    balance: sql`GREATEST(0, ${invoices.totalAmount} - (${invoices.amountPaid} + ${Math.round(payAmount)}))`,
                    status: sql`CASE WHEN (${invoices.amountPaid} + ${Math.round(payAmount)}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                    updatedAt: today
                }).where(and(eq(invoices.id, plan.invoiceId), eq(invoices.schoolId, schoolId)));
            }
        });
        res.json({ message: "Payment recorded and ledger updated", success: true });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to record payment" });
    }
});

// GET /api/finance/momo/pay (disabled)
feesRoutes.post("/finance/momo/pay", requireAuth, async (_req, res) => {
    res.status(503).json({ message: "Mobile Money payments are not available. Please use Cash, Bank Deposit, or Cheque." });
});

// GET /api/finance/momo/transaction/:id (disabled)
feesRoutes.get("/finance/momo/transaction/:id", requireAuth, async (_req, res) => {
    res.status(503).json({ message: "Mobile Money is not available." });
});
