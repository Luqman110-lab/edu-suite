import { db } from "../db";
import { eq, and, desc, asc, sql, gt, or, isNull, inArray } from "drizzle-orm";
import {
    feeStructures, feePayments, expenses, financeTransactions,
    invoices, invoiceItems, paymentPlans, planInstallments, studentFeeOverrides,
    scholarships, studentScholarships, students
} from "../../shared/schema";

export class FeeService {

    // Fee Structures
    async getFeeStructures(schoolId: number) {
        return await db.select().from(feeStructures)
            .where(and(eq(feeStructures.schoolId, schoolId), eq(feeStructures.isActive, true)))
            .orderBy(feeStructures.classLevel);
    }

    async createFeeStructure(schoolId: number, data: any) {
        const newFee = await db.insert(feeStructures).values({
            ...data, schoolId, isActive: true
        }).returning();
        return newFee[0];
    }

    async updateFeeStructure(id: number, schoolId: number, data: any) {
        const updated = await db.update(feeStructures).set({ ...data, updatedAt: new Date() })
            .where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)))
            .returning();
        return updated[0];
    }

    async deleteFeeStructure(id: number, schoolId: number) {
        await db.update(feeStructures).set({ isActive: false })
            .where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)));
        return true;
    }

    // Fee Payments
    async getFeePayments(schoolId: number, limit: number, offset: number) {
        try {
            const conditions = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];
            const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(feePayments).where(and(...conditions));
            const paymentsRaw = await db.select({
                payment: feePayments,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(feePayments)
                .leftJoin(students, eq(feePayments.studentId, students.id))
                .where(and(...conditions))
                .orderBy(desc(feePayments.createdAt)).limit(limit).offset(offset);

            const payments = paymentsRaw.map(r => ({
                ...r.payment,
                studentName: r.studentName,
                studentClass: r.studentClass,
                studentStream: r.studentStream
            }));
            return { data: payments, total: Number(countResult.count) };
        } catch (e) {
            // Fallback: query without isDeleted filter (column may not exist in DB yet)
            const conditions = [eq(feePayments.schoolId, schoolId)];
            const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(feePayments).where(and(...conditions));
            const paymentsRaw = await db.select({
                payment: feePayments,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(feePayments)
                .leftJoin(students, eq(feePayments.studentId, students.id))
                .where(and(...conditions))
                .orderBy(desc(feePayments.createdAt)).limit(limit).offset(offset);

            const payments = paymentsRaw.map(r => ({
                ...r.payment,
                studentName: r.studentName,
                studentClass: r.studentClass,
                studentStream: r.studentStream
            }));
            return { data: payments, total: Number(countResult.count) };
        }
    }

    async getStudentPayments(studentId: number, schoolId: number) {
        try {
            const paymentsRaw = await db.select({
                payment: feePayments,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(feePayments)
                .leftJoin(students, eq(feePayments.studentId, students.id))
                .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.studentId, studentId), eq(feePayments.isDeleted, false)))
                .orderBy(desc(feePayments.createdAt));
            return paymentsRaw.map(r => ({ ...r.payment, studentName: r.studentName, studentClass: r.studentClass, studentStream: r.studentStream }));
        } catch (e) {
            // Fallback: query without isDeleted filter
            const paymentsRaw = await db.select({
                payment: feePayments,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(feePayments)
                .leftJoin(students, eq(feePayments.studentId, students.id))
                .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.studentId, studentId)))
                .orderBy(desc(feePayments.createdAt));
            return paymentsRaw.map(r => ({ ...r.payment, studentName: r.studentName, studentClass: r.studentClass, studentStream: r.studentStream }));
        }
    }

    async createFeePayment(schoolId: number, userId: number, data: any) {
        const { studentId, feeType, amountPaid, term, year, paymentMethod, receiptNumber, notes } = data;
        const paidAmount = Number(amountPaid);
        const termNum = Number(term);
        const yearNum = Number(year);

        const today = new Date().toISOString().split('T')[0];

        // Check if student belongs to school
        const studentCheck = await db.select({ id: students.id }).from(students)
            .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) throw new Error("Student does not belong to the active school");

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
                paymentMethod: paymentMethod || 'Cash', receiptNumber: finalReceiptNumber, status, notes,
                receivedBy: userId.toString()
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
        return result;
    }

    async voidFeePayment(paymentId: number, schoolId: number, userId: number, reason: string) {
        return await db.transaction(async (tx) => {
            const payment = await tx.query.feePayments.findFirst({
                where: and(eq(feePayments.id, paymentId), eq(feePayments.schoolId, schoolId))
            });

            if (!payment) throw new Error("Payment not found");
            if (payment.isVoided) throw new Error("Payment is already voided");

            // Mark the payment as voided
            await tx.update(feePayments).set({
                isVoided: true,
                voidReason: reason,
                updatedAt: new Date()
            }).where(eq(feePayments.id, paymentId));

            // Find and mark the associated finance transaction as voided
            const [transaction] = await tx.select().from(financeTransactions).where(and(
                eq(financeTransactions.schoolId, schoolId),
                eq(financeTransactions.studentId, payment.studentId),
                eq(financeTransactions.transactionType, 'credit'),
                eq(financeTransactions.amount, payment.amountPaid),
                sql`${financeTransactions.description} LIKE ${'%' + payment.receiptNumber + '%'}`
            )).limit(1);

            if (transaction && !transaction.isVoided) {
                await tx.update(financeTransactions).set({
                    isVoided: true
                }).where(eq(financeTransactions.id, transaction.id));
            }

            // Restore the invoice balance
            const invoice = await tx.query.invoices.findFirst({
                where: and(
                    eq(invoices.schoolId, schoolId),
                    eq(invoices.studentId, payment.studentId),
                    eq(invoices.term, payment.term),
                    eq(invoices.year, payment.year)
                )
            });

            if (invoice) {
                await tx.update(invoices).set({
                    amountPaid: sql`${invoices.amountPaid} - ${payment.amountPaid}`,
                    balance: sql`${invoices.balance} + ${payment.amountPaid}`,
                    status: sql`CASE WHEN (${invoices.amountPaid} - ${payment.amountPaid}) <= 0 THEN 'unpaid' WHEN (${invoices.amountPaid} - ${payment.amountPaid}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                    updatedAt: new Date()
                }).where(eq(invoices.id, invoice.id));
            }

            return true;
        });
    }

    // Financial Summary
    async getFinancialSummary(schoolId: number) {
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

        return {
            totalRevenue, totalExpenses, totalOutstanding, totalDue,
            netIncome: totalRevenue - totalExpenses,
            collectionRate: totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0,
            paymentCount: Number(paymentsCountRes[0].count), expenseCount: expenseRecords.length
        };
    }

    async getStudentTransactions(studentId: number, schoolId: number) {
        const transactionsAsc = await db.execute(sql`
            SELECT *, SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE - amount END)
            OVER(ORDER BY transaction_date ASC, id ASC) as running_balance
            FROM finance_transactions
            WHERE student_id = ${studentId} AND school_id = ${schoolId}
            ORDER BY transaction_date ASC, id ASC`);
        return transactionsAsc.rows;
    }

    // Invoices
    async getInvoices(schoolId: number, filters: any, limit: number, offset: number) {
        const conditions = [eq(invoices.schoolId, schoolId)];
        if (filters.studentId) conditions.push(eq(invoices.studentId, filters.studentId));
        if (filters.term) conditions.push(eq(invoices.term, filters.term));
        if (filters.year) conditions.push(eq(invoices.year, filters.year));
        if (filters.status) conditions.push(eq(invoices.status, filters.status));

        const baseQuery = db.select({
            invoice: invoices, studentName: students.name,
            studentClass: students.classLevel, studentStream: students.stream,
        }).from(invoices).leftJoin(students, eq(invoices.studentId, students.id))
            .where(and(...conditions));

        const totalResult = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(...conditions));

        const results = await baseQuery.orderBy(desc(invoices.createdAt))
            .limit(limit).offset(offset);

        return {
            data: results.map(r => ({ ...r.invoice, studentName: r.studentName, studentClass: r.studentClass, studentStream: r.studentStream })),
            total: Number(totalResult[0]?.count || 0)
        };
    }

    async getInvoiceById(id: number, schoolId: number) {
        const [invoice] = await db.select({
            invoice: invoices, studentName: students.name,
            studentClass: students.classLevel, studentStream: students.stream,
        }).from(invoices).leftJoin(students, eq(invoices.studentId, students.id))
            .where(and(eq(invoices.id, id), eq(invoices.schoolId, schoolId)));

        if (!invoice) return null;

        const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        return { ...invoice.invoice, studentName: invoice.studentName, studentClass: invoice.studentClass, studentStream: invoice.studentStream, items };
    }

    async updateInvoice(id: number, schoolId: number, data: any) {
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

        const updated = await db.update(invoices).set(updateData)
            .where(and(eq(invoices.id, id), eq(invoices.schoolId, schoolId))).returning();
        return updated[0];
    }

    async generateInvoices(schoolId: number, data: any) {
        const { term, year, dueDate, classLevel } = data;
        const termNum = Number(term);
        const yearNum = Number(year);

        const structures = await db.select().from(feeStructures).where(and(
            eq(feeStructures.schoolId, schoolId),
            or(eq(feeStructures.term, termNum), isNull(feeStructures.term)),
            eq(feeStructures.year, yearNum), eq(feeStructures.isActive, true)
        ));

        if (structures.length === 0) throw new Error("No fee structures found for this term/year");

        let studentConditions: any[] = [eq(students.schoolId, schoolId), eq(students.isActive, true)];
        if (classLevel) studentConditions.push(eq(students.classLevel, classLevel));
        const activeStudents = await db.select().from(students).where(and(...studentConditions));

        if (activeStudents.length === 0) throw new Error("No active students found");

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
        return result;
    }

    async sendInvoiceReminder(id: number, schoolId: number, type: string = 'sms') {
        const invoice = await db.query.invoices.findFirst({
            where: and(eq(invoices.id, id), eq(invoices.schoolId, schoolId)), with: { student: true }
        });
        if (!invoice) return null;

        await db.update(invoices).set({ reminderSentAt: new Date(), reminderCount: (invoice.reminderCount || 0) + 1, lastReminderType: type })
            .where(and(eq(invoices.id, id), eq(invoices.schoolId, schoolId)));
        return true;
    }

    async bulkSendReminders(schoolId: number, type: string = 'sms', minBalance: number = 0) {
        const overdueInvoices = await db.select().from(invoices).where(and(eq(invoices.schoolId, schoolId), gt(invoices.balance, minBalance)));
        let sentCount = 0;
        for (const inv of overdueInvoices) {
            sentCount++;
            await db.update(invoices).set({ reminderSentAt: new Date(), reminderCount: (inv.reminderCount || 0) + 1, lastReminderType: type }).where(eq(invoices.id, inv.id));
        }
        return sentCount;
    }

    // Debtors List
    async getDebtors(schoolId: number, filters: any, limit: number, offset: number) {
        const conditions: any[] = [eq(invoices.schoolId, schoolId), gt(invoices.balance, 0)];
        if (filters.term) conditions.push(eq(invoices.term, Number(filters.term)));
        if (filters.year) conditions.push(eq(invoices.year, Number(filters.year)));

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

        const filtered = filters.classLevel ? debtors.filter(d => d.studentClass === filters.classLevel) : debtors;

        const summary = {
            totalDebtors: filtered.length,
            totalOutstanding: filtered.reduce((sum, d) => sum + d.balance, 0),
            current: filtered.filter(d => d.agingCategory === 'current').reduce((sum, d) => sum + d.balance, 0),
            days1to30: filtered.filter(d => d.agingCategory === '1-30').reduce((sum, d) => sum + d.balance, 0),
            days31to60: filtered.filter(d => d.agingCategory === '31-60').reduce((sum, d) => sum + d.balance, 0),
            days61to90: filtered.filter(d => d.agingCategory === '61-90').reduce((sum, d) => sum + d.balance, 0),
            days90plus: filtered.filter(d => d.agingCategory === '90+').reduce((sum, d) => sum + d.balance, 0),
        };

        return { debtors: filtered.slice(offset, offset + limit), summary, total: filtered.length };
    }

    // Hub Stats
    async getHubStats(schoolId: number, term?: number, year?: number) {
        let invoiceConditions: any[] = [eq(invoices.schoolId, schoolId)];
        if (term) invoiceConditions.push(eq(invoices.term, term));
        if (year) invoiceConditions.push(eq(invoices.year, year));

        const invoiceStats = await db.select({
            totalDue: sql<number>`COALESCE(SUM(total_amount), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(amount_paid), 0)`,
            totalBalance: sql<number>`COALESCE(SUM(balance), 0)`,
            invoiceCount: sql<number>`COUNT(*)`,
        }).from(invoices).where(and(...invoiceConditions));

        let expenseConditions: any[] = [eq(expenses.schoolId, schoolId)];
        if (term) expenseConditions.push(eq(expenses.term, term));
        if (year) expenseConditions.push(eq(expenses.year, year));
        const expenseStats = await db.select({ totalExpenses: sql<number>`COALESCE(SUM(amount), 0)` }).from(expenses).where(and(...expenseConditions));

        let paymentConditions: any[] = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];
        if (term) paymentConditions.push(eq(feePayments.term, term));
        if (year) paymentConditions.push(eq(feePayments.year, year));
        const paymentStats = await db.select({ totalCollected: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(feePayments).where(and(...paymentConditions));

        const stats = invoiceStats[0], expStats = expenseStats[0], payStats = paymentStats[0];
        const totalDue = Number(stats?.totalDue || 0);
        const totalCollected = Number(payStats?.totalCollected || stats?.totalPaid || 0);
        const totalOutstanding = Number(stats?.totalBalance || 0);
        const totalExpenses = Number(expStats?.totalExpenses || 0);

        return {
            totalDue, totalCollected, totalOutstanding, totalExpenses,
            netIncome: totalCollected - totalExpenses,
            collectionRate: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0,
            invoiceCount: Number(stats?.invoiceCount || 0)
        };
    }

    // Payment Plans
    async getPaymentPlans(schoolId: number, limit: number, offset: number) {
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(paymentPlans).where(eq(paymentPlans.schoolId, schoolId));
        const plans = await db.query.paymentPlans.findMany({
            where: eq(paymentPlans.schoolId, schoolId),
            with: { student: true, installments: true },
            orderBy: [desc(paymentPlans.createdAt)], limit, offset,
        });
        return { data: plans, total: Number(countResult.count) };
    }

    async createPaymentPlan(schoolId: number, data: any) {
        const { studentId, invoiceId, planName, totalAmount, downPayment, installmentCount, frequency, startDate } = data;
        const total = Number(totalAmount), down = Number(downPayment) || 0, count = Number(installmentCount);

        const studentCheck = await db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1);
        if (studentCheck.length === 0) throw new Error("Student does not belong to the active school");

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
        return newPlan;
    }

    async getPaymentPlanById(id: number, schoolId: number) {
        return await db.query.paymentPlans.findFirst({
            where: and(eq(paymentPlans.id, id), eq(paymentPlans.schoolId, schoolId)),
            with: { student: true, installments: { orderBy: asc(planInstallments.installmentNumber) } },
        });
    }

    async payInstallment(planId: number, installmentId: number, amount: number, schoolId: number, userId: number | undefined) {
        const installment = await db.query.planInstallments.findFirst({ where: eq(planInstallments.id, installmentId) });
        if (!installment) throw new Error("Installment not found");

        const remaining = installment.amount - (installment.paidAmount || 0);
        if (amount > remaining) throw new Error(`Amount exceeds remaining balance of ${Math.round(remaining)}`);

        const plan = await db.query.paymentPlans.findFirst({ where: eq(paymentPlans.id, planId), with: { invoice: true } });
        if (!plan) throw new Error("Plan not found");
        if (plan.schoolId !== schoolId) throw new Error("Access denied to payment plan from another school");

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
            const newPaidAmount = (installment.paidAmount || 0) + amount;
            const isFull = newPaidAmount >= installment.amount;

            await tx.update(planInstallments).set({ paidAmount: newPaidAmount, paidAt: today, status: isFull ? 'paid' : 'partial' }).where(eq(planInstallments.id, installmentId));

            await tx.insert(feePayments).values({
                schoolId: plan.schoolId, studentId: plan.studentId,
                amountDue: Math.round(installment.amount), amountPaid: Math.round(amount),
                balance: Math.max(0, Math.round(remaining - amount)), term: termId, year: yearId,
                paymentDate: today.toISOString().split('T')[0], paymentMethod: 'Cash', feeType: 'Tuition',
                receiptNumber, notes: `Installment #${installment.installmentNumber} - ${plan.planName}`,
                receivedBy: userId?.toString(),
            }).returning();

            await tx.insert(financeTransactions).values({
                schoolId: plan.schoolId, studentId: plan.studentId, transactionType: 'credit',
                amount: Math.round(amount), term: termId, year: yearId,
                description: `Payment Plan: ${plan.planName} (Inst #${installment.installmentNumber}) - ${receiptNumber}`,
                transactionDate: today.toISOString().split('T')[0],
            });

            if (plan.invoiceId) {
                await tx.update(invoices).set({
                    amountPaid: sql`${invoices.amountPaid} + ${Math.round(amount)}`,
                    balance: sql`GREATEST(0, ${invoices.totalAmount} - (${invoices.amountPaid} + ${Math.round(amount)}))`,
                    status: sql`CASE WHEN (${invoices.amountPaid} + ${Math.round(amount)}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                    updatedAt: today
                }).where(and(eq(invoices.id, plan.invoiceId), eq(invoices.schoolId, schoolId)));
            }
        });
        return true;
    }
    // Fee Overrides
    async getStudentFeeOverrides(studentId: number, schoolId: number) {
        return await db.select().from(studentFeeOverrides)
            .where(and(eq(studentFeeOverrides.studentId, studentId), eq(studentFeeOverrides.schoolId, schoolId), eq(studentFeeOverrides.isActive, true)));
    }

    async createStudentFeeOverride(schoolId: number, userId: number | undefined, data: any) {
        const { studentId, feeType, customAmount, term, year, reason } = data;

        const existing = await db.select().from(studentFeeOverrides)
            .where(and(eq(studentFeeOverrides.studentId, studentId), eq(studentFeeOverrides.feeType, feeType), eq(studentFeeOverrides.term, term), eq(studentFeeOverrides.year, year), eq(studentFeeOverrides.schoolId, schoolId))).limit(1);

        if (existing.length > 0) {
            const updated = await db.update(studentFeeOverrides).set({ customAmount, reason, updatedAt: new Date() }).where(eq(studentFeeOverrides.id, existing[0].id)).returning();
            return updated[0];
        }

        const newOverride = await db.insert(studentFeeOverrides).values({ schoolId, studentId, feeType, customAmount, term, year, reason, createdBy: userId }).returning();
        return newOverride[0];
    }

    async deleteStudentFeeOverride(id: number, schoolId: number) {
        const updated = await db.update(studentFeeOverrides).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(studentFeeOverrides.id, id), eq(studentFeeOverrides.schoolId, schoolId))).returning();
        return updated.length > 0;
    }
}

export const feeService = new FeeService();
