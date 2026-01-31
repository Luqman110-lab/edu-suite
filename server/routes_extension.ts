
import { Express } from "express";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray, gt, or, isNull } from "drizzle-orm";

import { students, teachers, marks, schools, feePayments, expenses, expenseCategories, gateAttendance, teacherAttendance, users, userSchools, feeStructures, financeTransactions, conversations, conversationParticipants, messages, promotionHistory, studentFeeOverrides, dormitories, beds, boardingRollCalls, leaveRequests, auditLogs, invoices, invoiceItems, paymentPlans, planInstallments, visitorLogs, boardingSettings, faceEmbeddings } from "../shared/schema";
import { requireAuth, requireAdmin, requireSuperAdmin, getActiveSchoolId, hashPassword } from "./auth";
import { MobileMoneyService } from "./services/MobileMoneyService";
import { broadcastMessage } from "./websocket";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerExtendedRoutes(app: Express) {

    // --- Biometric Authentication (Face Recognition) ---

    // Enroll a face (Save embedding)
    app.post("/api/face-embeddings", requireAuth, async (req, res) => {
        try {
            const { personType, personId, embedding, quality } = req.body;
            const schoolId = getActiveSchoolId(req);

            if (!schoolId) {
                return res.status(400).json({ message: "Active school required" });
            }

            if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
                return res.status(400).json({ message: "Invalid embedding format. Expected 128-float array." });
            }

            // upsert based on unique constraint (schoolId, personType, personId)
            const [record] = await db.insert(faceEmbeddings).values({
                schoolId,
                personType,
                personId,
                embedding,
                quality: quality || 0,
                captureVersion: 1
            }).onConflictDoUpdate({
                target: [faceEmbeddings.schoolId, faceEmbeddings.personType, faceEmbeddings.personId],
                set: {
                    embedding,
                    quality: quality || 0,
                    updatedAt: new Date()
                }
            }).returning();

            res.json(record);
        } catch (error: any) {
            console.error("Face enrollment error:", error);
            res.status(500).json({ message: "Failed to enroll face: " + error.message });
        }
    });

    // Identify a face
    app.post("/api/face-embeddings/identify", requireAuth, async (req, res) => {
        try {
            const { embedding, threshold = 0.5 } = req.body;
            const schoolId = getActiveSchoolId(req);

            if (!schoolId) {
                return res.status(400).json({ message: "Active school required" });
            }

            if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
                return res.status(400).json({ message: "Invalid embedding format." });
            }

            // Fetch active embeddings for this school
            const candidates = await db.select().from(faceEmbeddings).where(
                and(
                    eq(faceEmbeddings.isActive, true),
                    eq(faceEmbeddings.schoolId, schoolId)
                )
            );

            let bestMatch: any = null;
            let minDistance = Infinity;

            for (const candidate of candidates) {
                const storedEmbedding = candidate.embedding as number[];
                if (!storedEmbedding || storedEmbedding.length !== 128) continue;

                // Euclidean distance
                const distance = Math.sqrt(
                    embedding.reduce((sum, val, i) => sum + Math.pow(val - storedEmbedding[i], 2), 0)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = candidate;
                }
            }

            if (bestMatch && minDistance <= threshold) {
                // Fetch person details
                let personDetails = null;
                if (bestMatch.personType === 'student') {
                    [personDetails] = await db.select().from(students).where(eq(students.id, bestMatch.personId));
                } else if (bestMatch.personType === 'teacher') {
                    [personDetails] = await db.select().from(teachers).where(eq(teachers.id, bestMatch.personId));
                }

                return res.json({
                    match: true,
                    person: personDetails,
                    personType: bestMatch.personType,
                    distance: minDistance
                });
            }

            res.json({ match: false, distance: minDistance });

        } catch (error: any) {
            console.error("Face identification error:", error);
            res.status(500).json({ message: "Failed to identify face: " + error.message });
        }
    });

    // --- Fee Structures Endpoints ---
    app.get("/api/fee-structures", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const allStructures = await db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId));
            res.json(allStructures);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch fee structures: " + error.message });
        }
    });

    app.post("/api/fee-structures", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const data = { ...req.body, schoolId, isActive: true };
            const newStructure = await db.insert(feeStructures).values(data).returning();

            res.json(newStructure[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create fee structure: " + error.message });
        }
    });

    app.put("/api/fee-structures/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Verify ownership
            const existing = await db.select().from(feeStructures).where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)));
            if (!existing.length) return res.status(404).json({ message: "Fee structure not found" });

            const updated = await db.update(feeStructures).set({ ...req.body, updatedAt: new Date() }).where(eq(feeStructures.id, id)).returning();
            res.json(updated[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to update fee structure: " + error.message });
        }
    });

    app.delete("/api/fee-structures/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const deleted = await db.delete(feeStructures).where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId))).returning();
            if (!deleted.length) return res.status(404).json({ message: "Fee structure not found" });
            res.json({ message: "Deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete fee structure: " + error.message });
        }
    });

    // --- Expense Categories & Finance Transactions (Moved from top) ---
    app.post("/api/expense-categories", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { name, color, description } = req.body;

            const newCategory = await db.insert(expenseCategories).values({
                schoolId,
                name,
                color: color || '#6554C0',
                description
            }).returning();

            res.json(newCategory[0]);
        } catch (error: any) {
            console.error("Create expense category error:", error);
            res.status(500).json({ message: "Failed to create expense category: " + error.message });
        }
    });

    app.get("/api/finance-transactions/:studentId", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const studentId = parseInt(req.params.studentId);
            if (isNaN(studentId)) return res.status(400).json({ message: "Invalid key" });

            const transactionsAsc = await db.execute(sql`
SELECT
    *,
    SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE - amount END)
OVER(ORDER BY transaction_date ASC, id ASC) as running_balance
                    FROM finance_transactions
                    WHERE student_id = ${studentId} AND school_id = ${schoolId}
                    ORDER BY transaction_date ASC, id ASC
                `);

            res.json(transactionsAsc.rows);
        } catch (error: any) {
            console.error("Get finance transactions error:", error);
            res.status(500).json({ message: "Failed to fetch transactions: " + error.message });
        }
    });

    // --- Invoice Management Endpoints ---

    // List invoices with filters
    app.get("/api/invoices", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, term, year, status, limit = '50', offset = '0' } = req.query;

            let query = db.select({
                invoice: invoices,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(invoices)
                .leftJoin(students, eq(invoices.studentId, students.id))
                .where(eq(invoices.schoolId, schoolId))
                .orderBy(desc(invoices.createdAt));

            const conditions = [eq(invoices.schoolId, schoolId)];
            if (studentId) conditions.push(eq(invoices.studentId, parseInt(studentId as string)));
            if (term) conditions.push(eq(invoices.term, parseInt(term as string)));
            if (year) conditions.push(eq(invoices.year, parseInt(year as string)));
            if (status && typeof status === 'string') conditions.push(eq(invoices.status, status));

            const results = await db.select({
                invoice: invoices,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(invoices)
                .leftJoin(students, eq(invoices.studentId, students.id))
                .where(and(...conditions))
                .orderBy(desc(invoices.createdAt))
                .limit(parseInt(limit as string))
                .offset(parseInt(offset as string));

            // Flatten results
            const flatResults = results.map(r => ({
                ...r.invoice,
                studentName: r.studentName,
                studentClass: r.studentClass,
                studentStream: r.studentStream,
            }));

            res.json(flatResults);
        } catch (error: any) {
            console.error("Get invoices error:", error);
            res.status(500).json({ message: "Failed to fetch invoices: " + error.message });
        }
    });

    // Get single invoice with items
    app.get("/api/invoices/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const invoiceId = parseInt(req.params.id);
            if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });

            const [invoice] = await db.select({
                invoice: invoices,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
            }).from(invoices)
                .leftJoin(students, eq(invoices.studentId, students.id))
                .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)));

            if (!invoice) return res.status(404).json({ message: "Invoice not found" });

            const items = await db.select().from(invoiceItems)
                .where(eq(invoiceItems.invoiceId, invoiceId));

            res.json({
                ...invoice.invoice,
                studentName: invoice.studentName,
                studentClass: invoice.studentClass,
                studentStream: invoice.studentStream,
                items,
            });
        } catch (error: any) {
            console.error("Get invoice error:", error);
            res.status(500).json({ message: "Failed to fetch invoice: " + error.message });
        }
    });

    // Generate invoices for a term
    app.post("/api/invoices/generate", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { term, year, dueDate, classLevel } = req.body;
            if (!term || !year) return res.status(400).json({ message: "Term and year are required" });

            console.log(`[InvoiceGen] Request: Term=${term}, Year=${year}, SchoolId=${schoolId}`);

            // Get active fee structures for the term/year (or those applicable to all terms)
            const structures = await db.select().from(feeStructures)
                .where(and(
                    eq(feeStructures.schoolId, schoolId),
                    or(eq(feeStructures.term, term), isNull(feeStructures.term)),
                    eq(feeStructures.year, year),
                    eq(feeStructures.isActive, true)
                ));

            console.log(`[InvoiceGen] Found ${structures.length} fee structures`);

            if (structures.length === 0) {
                return res.status(400).json({ message: "No fee structures found for this term/year" });
            }

            // Get active students (optionally filtered by class)
            let studentConditions = [eq(students.schoolId, schoolId), eq(students.isActive, true)];
            if (classLevel) studentConditions.push(eq(students.classLevel, classLevel));

            const activeStudents = await db.select().from(students)
                .where(and(...studentConditions));

            console.log(`[InvoiceGen] Found ${activeStudents.length} active students`);

            if (activeStudents.length === 0) {
                return res.status(400).json({ message: "No active students found" });
            }

            let invoicesCreated = 0;
            let invoicesSkipped = 0;

            for (const student of activeStudents) {
                // Check if invoice already exists
                const existing = await db.select().from(invoices)
                    .where(and(
                        eq(invoices.schoolId, schoolId),
                        eq(invoices.studentId, student.id),
                        eq(invoices.term, term),
                        eq(invoices.year, year)
                    )).limit(1);

                if (existing.length > 0) {
                    invoicesSkipped++;
                    continue;
                }

                // Get applicable fee structures for this student
                const applicableStructures = structures.filter(s =>
                    s.classLevel === student.classLevel &&
                    (!s.boardingStatus || s.boardingStatus === student.boardingStatus || s.boardingStatus === 'all')
                );

                // console.log(`[InvoiceGen] Student ${student.name} (${student.classLevel}): ${applicableStructures.length} fees`);

                if (applicableStructures.length === 0) continue;

                const totalAmount = applicableStructures.reduce((sum, s) => sum + s.amount, 0);
                const invoiceNumber = `INV-${year}-T${term}-${student.id.toString().padStart(5, '0')}`;

                // Create invoice
                const [newInvoice] = await db.insert(invoices).values({
                    schoolId,
                    studentId: student.id,
                    invoiceNumber,
                    term,
                    year,
                    totalAmount,
                    amountPaid: 0,
                    balance: totalAmount,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    status: 'unpaid',
                }).returning();

                // Create invoice items
                for (const structure of applicableStructures) {
                    await db.insert(invoiceItems).values({
                        invoiceId: newInvoice.id,
                        feeType: structure.feeType,
                        description: `${structure.feeType} - ${structure.classLevel}`,
                        amount: structure.amount,
                    });
                }

                invoicesCreated++;
            }

            console.log(`[InvoiceGen] Completed. Created: ${invoicesCreated}, Skipped: ${invoicesSkipped}`);

            res.json({
                message: `Generated ${invoicesCreated} invoices, skipped ${invoicesSkipped} existing`,
                invoicesCreated,
                invoicesSkipped,
            });
        } catch (error: any) {
            console.error("Generate invoices error:", error);
            res.status(500).json({ message: "Failed to generate invoices: " + error.message });
        }
    });

    // Update invoice (mark as paid, update amount, etc)
    app.put("/api/invoices/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const invoiceId = parseInt(req.params.id);
            if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });

            const { amountPaid, status, notes, dueDate } = req.body;

            const updateData: Record<string, any> = { updatedAt: new Date() };
            if (amountPaid !== undefined) {
                updateData.amountPaid = amountPaid;
                // Get current invoice to calculate new balance
                const [current] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
                if (current) {
                    updateData.balance = current.totalAmount - amountPaid;
                    if (amountPaid >= current.totalAmount) updateData.status = 'paid';
                    else if (amountPaid > 0) updateData.status = 'partial';
                }
            }
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes;
            if (dueDate !== undefined) updateData.dueDate = dueDate;

            const updated = await db.update(invoices)
                .set(updateData)
                .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)))
                .returning();

            if (updated.length === 0) return res.status(404).json({ message: "Invoice not found" });

            res.json(updated[0]);
        } catch (error: any) {
            console.error("Update invoice error:", error);
            res.status(500).json({ message: "Failed to update invoice: " + error.message });
        }
    });

    // Debtors aging report
    app.get("/api/finance/debtors", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { term, year, classLevel } = req.query;

            const conditions = [
                eq(invoices.schoolId, schoolId),
                gt(invoices.balance, 0), // Only invoices with balance
            ];

            if (term) conditions.push(eq(invoices.term, parseInt(term as string)));
            if (year) conditions.push(eq(invoices.year, parseInt(year as string)));

            const debtorInvoices = await db.select({
                invoice: invoices,
                studentName: students.name,
                studentClass: students.classLevel,
                studentStream: students.stream,
                parentPhone: students.parentPhone,
            }).from(invoices)
                .leftJoin(students, eq(invoices.studentId, students.id))
                .where(and(...conditions))
                .orderBy(desc(invoices.balance));

            // Calculate aging
            const now = new Date();
            const debtors = debtorInvoices.map(d => {
                const createdDate = new Date(d.invoice.createdAt || now);
                const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

                let agingCategory = 'current';
                if (daysOverdue > 90) agingCategory = '90+';
                else if (daysOverdue > 60) agingCategory = '61-90';
                else if (daysOverdue > 30) agingCategory = '31-60';
                else if (daysOverdue > 0) agingCategory = '1-30';

                return {
                    ...d.invoice,
                    studentName: d.studentName,
                    studentClass: d.studentClass,
                    studentStream: d.studentStream,
                    parentPhone: d.parentPhone,
                    daysOverdue,
                    agingCategory,
                };
            });

            // Optionally filter by class
            const filtered = classLevel
                ? debtors.filter(d => d.studentClass === classLevel)
                : debtors;

            // Summary stats
            const summary = {
                totalDebtors: filtered.length,
                totalOutstanding: filtered.reduce((sum, d) => sum + d.balance, 0),
                current: filtered.filter(d => d.agingCategory === 'current').reduce((sum, d) => sum + d.balance, 0),
                days1to30: filtered.filter(d => d.agingCategory === '1-30').reduce((sum, d) => sum + d.balance, 0),
                days31to60: filtered.filter(d => d.agingCategory === '31-60').reduce((sum, d) => sum + d.balance, 0),
                days61to90: filtered.filter(d => d.agingCategory === '61-90').reduce((sum, d) => sum + d.balance, 0),
                days90plus: filtered.filter(d => d.agingCategory === '90+').reduce((sum, d) => sum + d.balance, 0),
            };

            res.json({ debtors: filtered, summary });
        } catch (error: any) {
            console.error("Get debtors error:", error);
            res.status(500).json({ message: "Failed to fetch debtors: " + error.message });
        }
    });

    // Financial Hub stats
    app.get("/api/finance/hub-stats", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { term, year } = req.query;

            // Get totals from invoices
            let invoiceConditions = [eq(invoices.schoolId, schoolId)];
            if (term) invoiceConditions.push(eq(invoices.term, parseInt(term as string)));
            if (year) invoiceConditions.push(eq(invoices.year, parseInt(year as string)));

            const invoiceStats = await db.select({
                totalDue: sql<number>`COALESCE(SUM(total_amount), 0)`,
                totalPaid: sql<number>`COALESCE(SUM(amount_paid), 0)`,
                totalBalance: sql<number>`COALESCE(SUM(balance), 0)`,
                invoiceCount: sql<number>`COUNT(*)`,
            }).from(invoices)
                .where(and(...invoiceConditions));

            // Get expense totals
            let expenseConditions = [eq(expenses.schoolId, schoolId)];
            if (term) expenseConditions.push(eq(expenses.term, parseInt(term as string)));
            if (year) expenseConditions.push(eq(expenses.year, parseInt(year as string)));

            const expenseStats = await db.select({
                totalExpenses: sql<number>`COALESCE(SUM(amount), 0)`,
            }).from(expenses)
                .where(and(...expenseConditions));

            // Get payment totals from feePayments
            let paymentConditions = [eq(feePayments.schoolId, schoolId)];
            if (term) paymentConditions.push(eq(feePayments.term, parseInt(term as string)));
            if (year) paymentConditions.push(eq(feePayments.year, parseInt(year as string)));

            const paymentStats = await db.select({
                totalCollected: sql<number>`COALESCE(SUM(amount_paid), 0)`,
            }).from(feePayments)
                .where(and(...paymentConditions));

            const stats = invoiceStats[0];
            const expStats = expenseStats[0];
            const payStats = paymentStats[0];

            const totalDue = Number(stats?.totalDue || 0);
            const totalCollected = Number(payStats?.totalCollected || stats?.totalPaid || 0);
            const totalOutstanding = Number(stats?.totalBalance || 0);
            const totalExpenses = Number(expStats?.totalExpenses || 0);
            const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

            res.json({
                totalDue,
                totalCollected,
                totalOutstanding,
                totalExpenses,
                netIncome: totalCollected - totalExpenses,
                collectionRate,
                invoiceCount: Number(stats?.invoiceCount || 0),
            });
        } catch (error: any) {
            console.error("Get hub stats error:", error);
            res.status(500).json({ message: "Failed to fetch hub stats: " + error.message });
        }
    });

    // --- Invoice Reminders ---

    // Send single invoice reminder
    app.post("/api/invoices/:id/remind", requireAuth, async (req, res) => {
        try {
            const invoiceId = parseInt(req.params.id);
            const { type = 'sms' } = req.body; // 'sms' or 'email'

            const invoice = await db.query.invoices.findFirst({
                where: eq(invoices.id, invoiceId),
                with: {
                    student: true,
                }
            });

            if (!invoice) return res.status(404).json({ message: "Invoice not found" });

            // TODO: Integrate actual SMS/Email provider here
            console.log(`[Mock ${type.toUpperCase()}] Sending reminder to student ${invoice.student.name} for invoice ${invoice.invoiceNumber}. Amount: ${invoice.balance}`);

            // Update reminder status
            await db.update(invoices)
                .set({
                    reminderSentAt: new Date(),
                    reminderCount: (invoice.reminderCount || 0) + 1,
                    lastReminderType: type,
                })
                .where(eq(invoices.id, invoiceId));

            res.json({ message: `${type.toUpperCase()} reminder sent successfully`, success: true });
        } catch (error: any) {
            console.error("Send reminder error:", error);
            res.status(500).json({ message: "Failed to send reminder" });
        }
    });

    // Bulk send reminders for overdue invoices
    app.post("/api/invoices/bulk-remind", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const { type = 'sms', minBalance = 0 } = req.body;

            const overdueInvoices = await db.select().from(invoices)
                .where(and(
                    eq(invoices.schoolId, schoolId),
                    gt(invoices.balance, minBalance),
                    // In real app, check due date: lt(invoices.dueDate, new Date())
                ));

            let sentCount = 0;
            for (const inv of overdueInvoices) {
                sentCount++;
                await db.update(invoices)
                    .set({
                        reminderSentAt: new Date(),
                        reminderCount: (inv.reminderCount || 0) + 1,
                        lastReminderType: type,
                    })
                    .where(eq(invoices.id, inv.id));
            }

            res.json({ message: `Sent ${sentCount} reminders successfully`, count: sentCount });
        } catch (error: any) {
            console.error("Bulk remind error:", error);
            res.status(500).json({ message: "Failed to send bulk reminders" });
        }
    });

    // --- Payment Plans ---

    // List payment plans
    app.get("/api/payment-plans", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const plans = await db.query.paymentPlans.findMany({
                where: eq(paymentPlans.schoolId, schoolId),
                with: {
                    student: true,
                    installments: true,
                },
                orderBy: [desc(paymentPlans.createdAt)],
            });
            res.json(plans);
        } catch (error: any) {
            console.error("List plans error:", error);
            res.status(500).json({ message: "Failed to list plans" });
        }
    });

    // Create payment plan
    app.post("/api/payment-plans", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const { studentId, invoiceId, planName, totalAmount, downPayment, installmentCount, frequency, startDate } = req.body;

            const [newPlan] = await db.insert(paymentPlans).values({
                schoolId,
                studentId,
                invoiceId,
                planName,
                totalAmount,
                downPayment: downPayment || 0,
                installmentCount,
                frequency,
                startDate: new Date(startDate),
                status: 'active',
            }).returning();

            const amountPerInstallment = (totalAmount - (downPayment || 0)) / installmentCount;
            const start = new Date(startDate);

            for (let i = 1; i <= installmentCount; i++) {
                const dueDate = new Date(start);
                if (frequency === 'weekly') {
                    dueDate.setDate(dueDate.getDate() + (i * 7));
                } else {
                    dueDate.setMonth(dueDate.getMonth() + i);
                }

                await db.insert(planInstallments).values({
                    planId: newPlan.id,
                    installmentNumber: i,
                    dueDate,
                    amount: amountPerInstallment,
                    status: 'pending',
                });
            }

            res.json(newPlan);
        } catch (error: any) {
            console.error("Create plan error:", error);
            res.status(500).json({ message: "Failed to create payment plan" });
        }
    });

    // Get payment plan details
    app.get("/api/payment-plans/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const plan = await db.query.paymentPlans.findFirst({
                where: eq(paymentPlans.id, id),
                with: {
                    student: true,
                    installments: {
                        orderBy: asc(planInstallments.installmentNumber),
                    },
                },
            });

            if (!plan) return res.status(404).json({ message: "Plan not found" });
            res.json(plan);
        } catch (error: any) {
            console.error("Get plan error:", error);
            res.status(500).json({ message: "Failed to get plan" });
        }
    });

    // Record installment payment
    app.post("/api/payment-plans/:id/pay", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const { installmentId, amount } = req.body;
            const planId = parseInt(req.params.id);

            // 1. Get Installment & Plan Details
            const installment = await db.query.planInstallments.findFirst({
                where: eq(planInstallments.id, installmentId),
            });
            if (!installment) return res.status(404).json({ message: "Installment not found" });

            const plan = await db.query.paymentPlans.findFirst({
                where: eq(paymentPlans.id, planId),
            });
            if (!plan) return res.status(404).json({ message: "Plan not found" });

            // 2. Update Installment
            const newPaidAmount = (installment.paidAmount || 0) + amount;
            const isFull = newPaidAmount >= installment.amount;

            await db.update(planInstallments)
                .set({
                    paidAmount: newPaidAmount,
                    paidAt: new Date(),
                    status: isFull ? 'paid' : 'partial',
                })
                .where(eq(planInstallments.id, installmentId));

            // 3. Record in Global Finance Ledger (fee_payments & finance_transactions)
            const today = new Date();

            // Create fee_payment record
            const [payment] = await db.insert(feePayments).values({
                schoolId: plan.schoolId,
                studentId: plan.studentId,
                amountPaid: amount,
                paymentDate: today,
                paymentMethod: 'Cash', // Default for this endpoint
                feeType: 'Tuition', // Defaulting to Tuition for plan payments usually
                notes: `Installment #${installment.installmentNumber} - ${plan.planName}`,
            }).returning();

            // Create finance_transaction record
            await db.insert(financeTransactions).values({
                schoolId: plan.schoolId,
                type: 'income',
                category: 'fee_payment',
                amount: amount,
                referenceId: payment.id.toString(),
                description: `Payment Plan: ${plan.planName} (Inst #${installment.installmentNumber})`,
                date: today,
                paymentMethod: 'Cash',
                studentId: plan.studentId,
            });

            // 4. Update Main Invoice (if linked)
            if (plan.invoiceId) {
                const invoice = await db.query.invoices.findFirst({
                    where: eq(invoices.id, plan.invoiceId),
                });
                if (invoice) {
                    const invPaid = (invoice.amountPaid || 0) + amount;
                    const invBal = Math.max(0, invoice.totalAmount - invPaid);

                    await db.update(invoices)
                        .set({
                            amountPaid: invPaid,
                            balance: invBal,
                            status: invBal === 0 ? 'paid' : 'partial',
                            updatedAt: today
                        })
                        .where(eq(invoices.id, plan.invoiceId));
                }
            }

            res.json({ message: "Payment recorded and ledger updated", success: true });
        } catch (error: any) {
            console.error("Pay installment error:", error);
            res.status(500).json({ message: "Failed to record payment" });
        }
    });

    // --- Mobile Money Endpoints ---

    // Initiate Payment
    app.post("/api/finance/momo/pay", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const { phoneNumber, amount, provider, description, entityType, entityId } = req.body;

            // Optional: Create a fee_payment record first if standard checking is required
            // For now, we go straight to MoMo

            const transaction = await MobileMoneyService.initiatePayment({
                schoolId,
                phoneNumber,
                amount: parseFloat(amount),
                provider,
                reference: `INV-${entityId}`, // Simplified reference
                description,
                entityType,
                entityId
            });

            res.json({
                success: true,
                message: "Payment initiated",
                transactionId: transaction.id,
                status: transaction.status
            });

        } catch (error: any) {
            console.error("MoMo Pay error:", error);
            res.status(500).json({ message: "Failed to initiate payment" });
        }
    });

    // Check Transaction Status
    app.get("/api/finance/momo/transaction/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const transaction = await MobileMoneyService.checkStatus(id);
            if (!transaction) return res.status(404).json({ message: "Transaction not found" });
            res.json(transaction);
        } catch (error: any) {
            console.error("MoMo Status error:", error);
            res.status(500).json({ message: "Failed to check status" });
        }
    });

    // --- Dashboard Endpoints ---
    // Using requireAuth for security to ensure only logged-in users access stats

    app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const today = new Date().toISOString().split('T')[0];

            // 1. Basic Counts
            const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

            const teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers)
                .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));

            const attendance = await db.select({ count: sql<number>`count(*)` }).from(gateAttendance)
                .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, today), eq(gateAttendance.status, 'present')));

            // 2. Financial Stats (Revenue & Outstanding)
            // Revenue = Total collected (Credits)
            // Outstanding = Total Billed (Debits) - Total collected (Credits)
            const finStats = await db.select({
                totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
                totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            }).from(financeTransactions).where(eq(financeTransactions.schoolId, schoolId));

            const totalRevenue = Number(finStats[0].totalCredits || 0);
            const totalInvoiced = Number(finStats[0].totalDebits || 0);
            const outstanding = totalInvoiced - totalRevenue;
            const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

            res.json({
                students: { total: Number(studentCount[0].count), present: Number(attendance[0].count) },
                teachers: { total: Number(teacherCount[0].count) },
                revenue: { total: totalRevenue, outstanding: outstanding, collectionRate: collectionRate },
                attendance: { rate: Number(studentCount[0].count) > 0 ? Math.round((Number(attendance[0].count) / Number(studentCount[0].count)) * 100) : 0 }
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/dashboard/revenue-trends", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const payments = await db.select({
                date: feePayments.paymentDate,
                amount: feePayments.amountPaid
            }).from(feePayments).where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)));

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const trends_map: Record<string, number> = {};

            // Initialize all months with 0
            months.forEach(m => trends_map[m] = 0);

            payments.forEach(p => {
                if (p.date) {
                    const date = new Date(p.date);
                    // Only include current year? Or last 12 months? Let's do current year for simplicity or specific logic
                    // If date is valid
                    if (!isNaN(date.getTime())) {
                        const month = date.toLocaleString('default', { month: 'short' });
                        trends_map[month] = (trends_map[month] || 0) + Number(p.amount);
                    }
                }
            });

            const data = months.map(name => ({
                name,
                revenue: trends_map[name] || 0,
                expenses: (trends_map[name] || 0) * 0.4 // Still estimating expenses for now as we don't have expense dates linked well yet
            }));

            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/dashboard/demographics", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const boys = await db.select({ count: sql<number>`count(*)` }).from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'M'), eq(students.isActive, true)));
            const girls = await db.select({ count: sql<number>`count(*)` }).from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'F'), eq(students.isActive, true)));

            res.json({
                gender: [
                    { name: 'Male', value: Number(boys[0].count) },
                    { name: 'Female', value: Number(girls[0].count) }
                ]
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/dashboard/academic-performance", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Get current school settings to determine term/year
            const school = await db.query.schools.findFirst({
                where: eq(schools.id, schoolId)
            });

            if (!school) return res.status(404).json({ message: "School not found" });

            const currentTerm = school.currentTerm || 1;
            const currentYear = school.currentYear || new Date().getFullYear();

            // Fetch all marks for current term/year
            const allMarks = await db.select().from(marks)
                .where(and(
                    eq(marks.schoolId, schoolId),
                    eq(marks.term, currentTerm),
                    eq(marks.year, currentYear)
                ));

            // Subjects to aggregate
            const subjects = ['english', 'maths', 'science', 'sst', 'literacy1', 'literacy2'];
            const totals: Record<string, { sum: number, count: number }> = {};

            subjects.forEach(sub => totals[sub] = { sum: 0, count: 0 });

            allMarks.forEach(record => {
                const m = record.marks as any;
                if (m) {
                    subjects.forEach(sub => {
                        const val = m[sub];
                        if (typeof val === 'number') {
                            totals[sub].sum += val;
                            totals[sub].count++;
                        }
                    });
                }
            });

            const data = subjects.map(sub => ({
                subject: sub.charAt(0).toUpperCase() + sub.slice(1),
                average: totals[sub].count > 0 ? Math.round(totals[sub].sum / totals[sub].count) : 0
            })).filter(d => d.average > 0); // Only return subjects with data

            res.json(data);
        } catch (error: any) {
            console.error("Academic performance error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/dashboard/upcoming-events", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const allStudents = await db.select({ name: students.name, dob: students.dateOfBirth }).from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);

            const birthdays = allStudents.filter(s => {
                if (!s.dob) return false;
                const d = new Date(s.dob);
                const currentYearDob = new Date(today.getFullYear(), d.getMonth(), d.getDate());
                return currentYearDob >= today && currentYearDob <= nextWeek;
            }).map(s => ({
                title: `${s.name} 's Birthday`,
                date: new Date(today.getFullYear(), new Date(s.dob!).getMonth(), new Date(s.dob!).getDate()).toISOString(),
                type: 'birthday'
            })).slice(0, 5);

            res.json(birthdays);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });


    // --- Student Management Extensions ---

    app.get("/api/students", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const allStudents = await db.select().from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
                .orderBy(students.name);
            res.json(allStudents);
        } catch (error: any) {
            console.error("Get students error:", error);
            res.status(500).json({ message: "Failed to fetch students: " + error.message });
        }
    });

    app.post("/api/students", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const newStudent = await db.insert(students).values({
                ...req.body,
                schoolId,
                isActive: true
            }).returning();

            res.status(201).json(newStudent[0]);
        } catch (error: any) {
            console.error("Create student error:", error);
            res.status(500).json({ message: "Failed to create student: " + error.message });
        }
    });

    app.put("/api/students/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const studentId = parseInt(req.params.id);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

            const existing = await db.select().from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);

            if (existing.length === 0) return res.status(404).json({ message: "Student not found" });

            const updated = await db.update(students)
                .set({ ...req.body, schoolId })
                .where(eq(students.id, studentId))
                .returning();

            res.json(updated[0]);
        } catch (error: any) {
            console.error("Update student error:", error);
            res.status(500).json({ message: "Failed to update student: " + error.message });
        }
    });

    app.delete("/api/students/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const studentId = parseInt(req.params.id);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

            const existing = await db.select().from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);

            if (existing.length === 0) return res.status(404).json({ message: "Student not found" });

            await db.update(students)
                .set({ isActive: false })
                .where(eq(students.id, studentId));

            res.json({ message: "Student deleted successfully" });
        } catch (error: any) {
            console.error("Delete student error:", error);
            res.status(500).json({ message: "Failed to delete student: " + error.message });
        }
    });

    app.delete("/api/students", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No student IDs provided" });
            }

            await db.update(students)
                .set({ isActive: false })
                .where(and(
                    eq(students.schoolId, schoolId),
                    inArray(students.id, ids)
                ));

            res.json({ message: "Students deleted successfully" });
        } catch (error: any) {
            console.error("Batch delete students error:", error);
            res.status(500).json({ message: "Failed to delete students: " + error.message });
        }
    });

    app.post("/api/students/batch", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { students: newStudents } = req.body;
            if (!Array.isArray(newStudents) || newStudents.length === 0) {
                return res.status(400).json({ message: "No students provided" });
            }

            // Using onConflictDoNothing to skip duplicates gracefully
            const created = await db.insert(students).values(newStudents.map((s: any) => ({
                ...s,
                isActive: true,
                schoolId: schoolId
            }))).onConflictDoNothing().returning();

            res.json(created);
        } catch (error: any) {
            console.error("Batch import error:", error);
            res.status(500).json({ message: "Failed to import students: " + error.message });
        }
    });


    // --- Messaging Extensions ---

    // File Upload Endpoint
    app.post("/api/upload", requireAuth, async (req, res) => {
        try {
            const { fileName, fileData } = req.body; // fileData is base64
            if (!fileName || !fileData) return res.status(400).json({ message: "File required" });

            const uploadsDir = path.join(process.cwd(), "uploads");
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            const uniqueName = `${Date.now()}-${fileName}`;
            const filePath = path.join(uploadsDir, uniqueName);

            // Remove header (data:image/png;base64,)
            const base64Data = fileData.split(';base64,').pop();
            fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });

            res.json({ url: `/uploads/${uniqueName}` }); // Note: Ensure express.static serves /uploads
        } catch (error: any) {
            console.error("Upload error:", error);
            res.status(500).json({ message: "Upload failed" });
        }
    });

    // Toggle Reaction
    app.post("/api/conversations/:id/messages/:msgId/react", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            const msgId = parseInt(req.params.msgId);
            const { emoji } = req.body; // If emoji matches existing, remove it (toggle)

            const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
            if (!msg) return res.status(404).json({ message: "Message not found" });

            let reactions = (msg.reactions as any[]) || [];
            const userId = req.user!.id;

            const existingIdx = reactions.findIndex((r: any) => r.userId === userId && r.emoji === emoji);
            if (existingIdx >= 0) {
                reactions.splice(existingIdx, 1); // Remove
            } else {
                reactions.push({ userId, emoji }); // Add
            }

            const [updated] = await db.update(messages)
                .set({ reactions })
                .where(eq(messages.id, msgId))
                .returning();

            // Broadcast update
            broadcastMessage(convId, { ...updated, type: 'reaction_update' });

            res.json(updated);
        } catch (error: any) {
            console.error("Reaction error:", error);
            res.status(500).json({ message: "Reaction failed" });
        }
    });

    // Delete Message (Soft delete)
    app.delete("/api/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            const msgId = parseInt(req.params.msgId);
            const userId = req.user!.id;

            const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
            if (!msg) return res.status(404).json({ message: "Message not found" });

            if (msg.senderId !== userId) {
                return res.status(403).json({ message: "Cannot delete others' messages" });
            }

            const [updated] = await db.update(messages)
                .set({ isDeleted: true, content: 'This message was deleted', deletedAt: new Date() })
                .where(eq(messages.id, msgId))
                .returning();

            broadcastMessage(convId, { ...updated, type: 'message_update' });
            res.json({ success: true, messageId: msgId });
        } catch (error: any) {
            console.error("Delete message error:", error);
            res.status(500).json({ message: "Failed to delete message" });
        }
    });

    // Edit Message
    app.put("/api/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            const msgId = parseInt(req.params.msgId);
            const userId = req.user!.id;
            const { content } = req.body;

            if (!content) return res.status(400).json({ message: "Content required" });

            const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
            if (!msg) return res.status(404).json({ message: "Message not found" });

            if (msg.senderId !== userId) {
                return res.status(403).json({ message: "Cannot edit others' messages" });
            }

            const [updated] = await db.update(messages)
                .set({ content, isEdited: true, editedAt: new Date() })
                .where(eq(messages.id, msgId))
                .returning();

            broadcastMessage(convId, { ...updated, type: 'message_update' });
            res.json(updated);
        } catch (error: any) {
            console.error("Edit message error:", error);
            res.status(500).json({ message: "Failed to edit message" });
        }
    });

    // Update Group Info (Existing)
    app.put("/api/conversations/:id", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            const { groupName, groupAvatar, addParticipants } = req.body;

            // Check if user is admin or creator (simplification: anyone in group can update for now, or check creators)
            // Ideally check isAdmin

            const updates: any = {};
            if (groupName) updates.groupName = groupName;
            if (groupAvatar) updates.groupAvatar = groupAvatar;

            await db.update(conversations).set(updates).where(eq(conversations.id, convId));

            if (addParticipants && Array.isArray(addParticipants)) {
                const newParts = addParticipants.map((uid: number) => ({
                    conversationId: convId,
                    userId: uid,
                    joinedAt: new Date()
                }));
                await db.insert(conversationParticipants).values(newParts).onConflictDoNothing();
            }

            // Broadcast group update?
            // broadcastMessage(convId, { type: 'group_update', updates });

            res.json({ success: true });
        } catch (error: any) {
            console.error("Update group error:", error);
            res.status(500).json({ message: "Failed to update group" });
        }
    });

    app.get("/api/conversations/unread-count", requireAuth, async (req, res) => {
        try {
            if (!req.user) return res.sendStatus(401);

            const result = await db.select({ count: sql<number>`count(*)` })
                .from(conversationParticipants)
                .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
                .where(and(
                    eq(conversationParticipants.userId, req.user.id),
                    eq(conversationParticipants.isArchived, false),
                    or(
                        sql`${conversations.lastMessageAt} > ${conversationParticipants.lastReadAt}`,
                        isNull(conversationParticipants.lastReadAt)
                    )
                ));

            res.json({ unreadCount: Number(result[0]?.count || 0) });
        } catch (error: any) {
            console.error("Unread count error:", error);
            res.status(500).json({ message: "Failed to count unread messages" });
        }
    });

    // List users for messaging (in same school)
    app.get("/api/messaging/users", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school" });

            // Get users linked to this school (teachers, admins)
            const usersInSchool = await db.select({
                id: users.id,
                name: users.name,
                role: users.role,
                email: users.email
            })
                .from(userSchools)
                .innerJoin(users, eq(userSchools.userId, users.id))
                .where(eq(userSchools.schoolId, schoolId));

            // Filter out current user
            const filtered = usersInSchool.filter(u => u.id !== req.user!.id);
            res.json(filtered);
        } catch (error: any) {
            console.error("Fetch users error:", error);
            res.status(500).json({ message: "Failed to fetch users" });
        }
    });

    // Get all conversations for current user
    app.get("/api/conversations", requireAuth, async (req, res) => {
        try {
            if (!req.user) return res.sendStatus(401);

            // Get conversation IDs for user
            const myConvos = await db.select().from(conversationParticipants)
                .where(eq(conversationParticipants.userId, req.user.id));

            const conversationIds = myConvos.map(c => c.conversationId);

            if (conversationIds.length === 0) return res.json([]);

            // Get conversations details
            const convos = await db.select().from(conversations)
                .where(inArray(conversations.id, conversationIds))
                .orderBy(desc(conversations.lastMessageAt));

            // Fetch participants and last message for each
            const results = await Promise.all(convos.map(async (conv) => {
                const parts = await db.select({
                    id: users.id,
                    name: users.name,
                    role: users.role
                })
                    .from(conversationParticipants)
                    .innerJoin(users, eq(conversationParticipants.userId, users.id))
                    .where(eq(conversationParticipants.conversationId, conv.id));

                const lastMsg = await db.select().from(messages)
                    .where(eq(messages.conversationId, conv.id))
                    .orderBy(desc(messages.createdAt))
                    .limit(1);

                // Calculate unread
                const myPart = myConvos.find(c => c.conversationId === conv.id);
                let unreadCount = 0;
                if (myPart) {
                    const unread = await db.select({ count: sql<number>`count(*)` })
                        .from(messages)
                        .where(and(
                            eq(messages.conversationId, conv.id),
                            // messages newer than read time
                            myPart.lastReadAt ? gt(messages.createdAt, myPart.lastReadAt) : sql`1=1`
                        ));
                    unreadCount = Number(unread[0]?.count || 0);
                }

                return {
                    ...conv,
                    participants: parts,
                    lastMessage: lastMsg[0] || null,
                    unreadCount
                };
            }));

            res.json(results);
        } catch (error: any) {
            console.error("Fetch conversations error:", error);
            res.status(500).json({ message: "Failed to fetch conversations" });
        }
    });

    // Create new conversation
    app.post("/api/conversations", requireAuth, async (req, res) => {
        try {
            const { subject, participantIds, initialMessage, type, isGroup, groupName, groupAvatar } = req.body;
            const schoolId = getActiveSchoolId(req);

            if (!schoolId) return res.status(400).json({ message: "No active school" });
            if (!participantIds) {
                return res.status(400).json({ message: "Missing participants" });
            }

            const senderId = req.user!.id;

            // Create conversation
            const [newConv] = await db.insert(conversations).values({
                schoolId,
                subject: subject || (groupName ? groupName : 'New Conversation'),
                type: type || (isGroup ? 'group' : 'direct'),
                isGroup: isGroup || false,
                groupName,
                groupAvatar,
                admins: isGroup ? [senderId] : [],
                createdById: senderId,
                lastMessageAt: new Date()
            }).returning();

            // Add participants (sender + recipients)
            const allParticipants = [...new Set([senderId, ...participantIds])];

            await db.insert(conversationParticipants).values(
                allParticipants.map((uid: number) => ({
                    conversationId: newConv.id,
                    userId: uid,
                    joinedAt: new Date(),
                    lastReadAt: uid === senderId ? new Date() : null // Sender has read it
                }))
            );

            // Create initial message
            await db.insert(messages).values({
                conversationId: newConv.id,
                senderId: senderId,
                content: initialMessage,
                createdAt: new Date()
            });

            res.status(201).json(newConv);
        } catch (error: any) {
            console.error("Create conversation error:", error);
            res.status(500).json({ message: "Failed to create conversation" });
        }
    });

    // Get single conversation
    app.get("/api/conversations/:id", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

            // Verify access
            const access = await db.select().from(conversationParticipants)
                .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

            if (access.length === 0) return res.status(403).json({ message: "Access denied" });

            const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
            if (!conv) return res.status(404).json({ message: "Conversation not found" });

            const participants = await db.select({
                id: users.id,
                name: users.name,
                role: users.role,
                lastReadMessageId: conversationParticipants.lastReadMessageId,
                lastReadAt: conversationParticipants.lastReadAt
            })
                .from(conversationParticipants)
                .innerJoin(users, eq(conversationParticipants.userId, users.id))
                .where(eq(conversationParticipants.conversationId, convId));

            res.json({ ...conv, participants });
        } catch (error: any) {
            console.error("Get conversation error:", error);
            res.status(500).json({ message: "Failed to fetch conversation" });
        }
    });

    // Get messages for conversation
    app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

            // Verify access
            const access = await db.select().from(conversationParticipants)
                .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

            if (access.length === 0) return res.status(403).json({ message: "Access denied" });

            const msgs = await db.select({
                id: messages.id,
                conversationId: messages.conversationId,
                senderId: messages.senderId,
                content: messages.content,
                messageType: messages.messageType,
                attachments: messages.attachments,
                reactions: messages.reactions,
                replyToId: messages.replyToId,
                isEdited: messages.isEdited,
                isDeleted: messages.isDeleted,
                createdAt: messages.createdAt,
                sender: {
                    id: users.id,
                    name: users.name,
                    role: users.role
                }
            })
                .from(messages)
                .innerJoin(users, eq(messages.senderId, users.id))
                .where(eq(messages.conversationId, convId))
                .orderBy(sql`${messages.createdAt} ASC`); // Oldest first for chat

            res.json(msgs);
        } catch (error: any) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    });

    // Send message
    app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });
            const { content, attachments, replyToId } = req.body;
            // content optional if attachments exist
            if (!content && (!attachments || attachments.length === 0)) return res.status(400).json({ message: "Message content or attachment required" });

            // Verify access
            const access = await db.select().from(conversationParticipants)
                .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

            if (access.length === 0) return res.status(403).json({ message: "Access denied" });

            // Insert message
            const [newMsg] = await db.insert(messages).values({
                conversationId: convId,
                senderId: req.user!.id,
                content: content || "",
                attachments: attachments || [],
                replyToId,
                messageType: (attachments && attachments.length > 0) ? 'file' : 'text',
                createdAt: new Date()
            }).returning();

            // Update conversation timestamp
            await db.update(conversations)
                .set({ lastMessageAt: new Date() })
                .where(eq(conversations.id, convId));

            // Populate sender info for return
            const sender = await db.select({
                id: users.id,
                name: users.name,
                role: users.role
            }).from(users).where(eq(users.id, req.user!.id));

            res.json({ ...newMsg, sender: sender[0] });

            // Websocket Broadcast
            broadcastMessage(convId, { ...newMsg, sender: sender[0] });
        } catch (error: any) {
            console.error("Send message error:", error);
            res.status(500).json({ message: "Failed to send message" });
        }
    });

    // Mark as read
    app.post("/api/conversations/:id/read", requireAuth, async (req, res) => {
        try {
            const convId = parseInt(req.params.id);
            if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

            await db.update(conversationParticipants)
                .set({ lastReadAt: new Date() })
                .where(and(
                    eq(conversationParticipants.conversationId, convId),
                    eq(conversationParticipants.userId, req.user!.id)
                ));

            res.json({ success: true });
        } catch (error: any) {
            console.error("Read mark error:", error);
            res.status(500).json({ message: "Failed to mark as read" });
        }
    });

    app.post("/api/students/promote", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentIds, targetStream } = req.body;
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ message: "No students selected for promotion" });
            }

            const activeStudents = await db.select().from(students)
                .where(and(
                    inArray(students.id, studentIds),
                    eq(students.schoolId, schoolId)
                ));

            let promotedCount = 0;
            let graduatedCount = 0;
            let skippedCount = 0;

            const classMap: Record<string, string> = {
                'Baby': 'Middle', 'Middle': 'Top', 'Top': 'P1',
                'P1': 'P2', 'P2': 'P3', 'P3': 'P4', 'P4': 'P5', 'P5': 'P6', 'P6': 'P7',
                'P7': 'Alumni'
            };

            for (const student of activeStudents) {
                const currentClass = student.classLevel;
                const nextClass = classMap[currentClass];

                if (!nextClass) {
                    skippedCount++;
                    continue;
                }

                const isGraduating = currentClass === 'P7';
                const updates: any = {
                    classLevel: nextClass,
                    stream: targetStream || student.stream // Update stream if provided, else keep current
                };

                // If graduating, we might want to mark them as alumni or inactive?
                // For now, we just move them to 'Alumni' class.
                if (isGraduating) {
                    graduatedCount++;
                } else {
                    promotedCount++;
                }

                await db.update(students)
                    .set(updates)
                    .where(eq(students.id, student.id));

                // Record history
                await db.insert(promotionHistory).values({
                    schoolId,
                    studentId: student.id,
                    fromClass: currentClass,
                    toClass: nextClass,
                    fromStream: student.stream,
                    toStream: updates.stream,
                    academicYear: new Date().getFullYear(),
                    term: 1, // Assuming promotion happens for Term 1
                    promotedBy: req.user!.id
                });
            }

            res.json({
                promotedCount,
                graduatedCount,
                skippedCount,
                message: `Successfully processed ${studentIds.length} students.`
            });

        } catch (error: any) {
            console.error("Promotion error:", error);
            res.status(500).json({ message: "Failed to promote students: " + error.message });
        }
    });

    app.get("/api/face-embeddings", async (req, res) => {
        res.json([]);
    });

    // --- School Management Extensions ---

    app.post("/api/schools", requireAuth, async (req, res) => {
        try {
            // Check if Super Admin
            if (!req.user?.isSuperAdmin) {
                return res.status(403).json({ message: "Only Super Admin can create schools" });
            }

            const { name, code, addressBox, contactPhones, email, motto, regNumber, centreNumber,
                primaryColor, secondaryColor, logoBase64 } = req.body;

            // Validate required fields
            if (!name || !code) {
                return res.status(400).json({ message: "Name and Code are required" });
            }

            // Check for duplicate code
            const existing = await db.select().from(schools).where(eq(schools.code, code)).limit(1);
            if (existing.length > 0) {
                return res.status(400).json({ message: "A school with this code already exists" });
            }

            const newSchool = await db.insert(schools).values({
                name,
                code,
                addressBox: addressBox || "",
                contactPhones: contactPhones || "",
                email: email || "",
                motto: motto || "",
                regNumber: regNumber || "",
                centreNumber: centreNumber || "",
                primaryColor: primaryColor || "#7B1113",
                secondaryColor: secondaryColor || "#1E3A5F",
                logoBase64: logoBase64 || null,
                isActive: true,
            }).returning();

            res.status(201).json(newSchool[0]);
        } catch (error: any) {
            console.error("Create school error:", error);
            res.status(500).json({ message: "Failed to create school: " + error.message });
        }
    });

    app.put("/api/schools/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = parseInt(req.params.id);
            if (isNaN(schoolId)) return res.status(400).json({ message: "Invalid school ID" });

            if (!req.user?.isSuperAdmin && req.user?.activeSchoolId !== schoolId) {
                return res.status(403).json({ message: "Unauthorized to update this school" });
            }

            // Extract only valid schema fields to avoid type issues
            const {
                name, code, addressBox, contactPhones, email, motto, regNumber, centreNumber,
                primaryColor, secondaryColor, logoBase64, currentTerm, currentYear,
                nextTermBeginBoarders, nextTermBeginDay, streams, gradingConfig, subjectsConfig,
                reportConfig, idCardConfig, securityConfig, isActive
            } = req.body;

            // Build update object with only defined values
            const updateData: Record<string, any> = { updatedAt: new Date() };
            if (name !== undefined) updateData.name = name;
            if (code !== undefined) updateData.code = code;
            if (addressBox !== undefined) updateData.addressBox = addressBox;
            if (contactPhones !== undefined) updateData.contactPhones = contactPhones;
            if (email !== undefined) updateData.email = email;
            if (motto !== undefined) updateData.motto = motto;
            if (regNumber !== undefined) updateData.regNumber = regNumber;
            if (centreNumber !== undefined) updateData.centreNumber = centreNumber;
            if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
            if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
            if (logoBase64 !== undefined) updateData.logoBase64 = logoBase64;
            if (currentTerm !== undefined) updateData.currentTerm = currentTerm;
            if (currentYear !== undefined) updateData.currentYear = currentYear;
            if (nextTermBeginBoarders !== undefined) updateData.nextTermBeginBoarders = nextTermBeginBoarders;
            if (nextTermBeginDay !== undefined) updateData.nextTermBeginDay = nextTermBeginDay;
            if (streams !== undefined) updateData.streams = streams;
            if (gradingConfig !== undefined) updateData.gradingConfig = gradingConfig;
            if (subjectsConfig !== undefined) updateData.subjectsConfig = subjectsConfig;
            if (reportConfig !== undefined) updateData.reportConfig = reportConfig;
            if (idCardConfig !== undefined) updateData.idCardConfig = idCardConfig;
            if (securityConfig !== undefined) updateData.securityConfig = securityConfig;
            if (isActive !== undefined) updateData.isActive = isActive;

            const updated = await db.update(schools)
                .set(updateData)
                .where(eq(schools.id, schoolId))
                .returning();

            if (updated.length === 0) return res.status(404).json({ message: "School not found" });

            res.json(updated[0]);
        } catch (error: any) {
            console.error("Update school error:", error);
            res.status(500).json({ message: "Failed to update school: " + error.message });
        }
    });

    app.delete("/api/schools/:id", requireAuth, async (req, res) => {
        try {
            if (!req.user?.isSuperAdmin) {
                return res.status(403).json({ message: "Only Super Admin can delete schools" });
            }

            const schoolId = parseInt(req.params.id);
            if (isNaN(schoolId)) return res.status(400).json({ message: "Invalid school ID" });

            // Soft delete
            await db.update(schools)
                .set({ isActive: false })
                .where(eq(schools.id, schoolId));

            res.json({ message: "School deleted successfully" });
        } catch (error: any) {
            console.error("Delete school error:", error);
            res.status(500).json({ message: "Failed to delete school: " + error.message });
        }
    });

    // --- Teacher Management Extensions ---

    app.get("/api/teachers", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const allTeachers = await db.select().from(teachers)
                .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));

            res.json(allTeachers);
        } catch (error: any) {
            console.error("Get teachers error:", error);
            res.status(500).json({ message: "Failed to fetch teachers: " + error.message });
        }
    });

    app.post("/api/teachers", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const newTeacher = await db.insert(teachers).values({
                ...req.body,
                schoolId,
                isActive: true
            }).returning();

            res.status(201).json(newTeacher[0]);
        } catch (error: any) {
            console.error("Create teacher error:", error);
            res.status(500).json({ message: "Failed to create teacher: " + error.message });
        }
    });

    app.put("/api/teachers/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const teacherId = parseInt(req.params.id);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

            // Verify teacher belongs to school
            const existing = await db.select().from(teachers)
                .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId)))
                .limit(1);

            if (existing.length === 0) return res.status(404).json({ message: "Teacher not found" });

            const updated = await db.update(teachers)
                .set({ ...req.body, schoolId }) // Ensure schoolId isn't changed/lost
                .where(eq(teachers.id, teacherId))
                .returning();

            res.json(updated[0]);
        } catch (error: any) {
            console.error("Update teacher error:", error);
            res.status(500).json({ message: "Failed to update teacher: " + error.message });
        }
    });

    app.delete("/api/teachers/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const teacherId = parseInt(req.params.id);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

            // Verify teacher belongs to school
            const existing = await db.select().from(teachers)
                .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId)))
                .limit(1);

            if (existing.length === 0) return res.status(404).json({ message: "Teacher not found" });

            // Soft delete
            await db.update(teachers)
                .set({ isActive: false })
                .where(eq(teachers.id, teacherId));

            res.json({ message: "Teacher deleted successfully" });
        } catch (error: any) {
            console.error("Delete teacher error:", error);
            res.status(500).json({ message: "Failed to delete teacher: " + error.message });
        }
    });

    app.post("/api/teachers/batch", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { teachers: newTeachers } = req.body;
            if (!Array.isArray(newTeachers) || newTeachers.length === 0) {
                return res.status(400).json({ message: "No teachers provided" });
            }

            const created = await db.insert(teachers).values(newTeachers.map((t: any) => ({
                ...t,
                schoolId: schoolId,
                isActive: true
            }))).returning();

            res.json(created);
        } catch (error: any) {
            console.error("Batch teacher import error:", error);
            res.status(500).json({ message: "Failed to import teachers: " + error.message });
        }
    });

    // --- Marks Management Extensions ---

    app.get("/api/marks", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const allMarks = await db.select().from(marks)
                .where(eq(marks.schoolId, schoolId));

            res.json(allMarks);
        } catch (error: any) {
            console.error("Get marks error:", error);
            res.status(500).json({ message: "Failed to fetch marks: " + error.message });
        }
    });

    app.post("/api/marks", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, term, year, type } = req.body;

            // Check for existing mark and update (upsert logic)
            const existing = await db.select().from(marks)
                .where(and(
                    eq(marks.studentId, studentId),
                    eq(marks.term, term),
                    eq(marks.year, year),
                    eq(marks.type, type),
                    eq(marks.schoolId, schoolId)
                ))
                .limit(1);

            if (existing.length > 0) {
                const updated = await db.update(marks)
                    .set({ ...req.body, schoolId })
                    .where(eq(marks.id, existing[0].id))
                    .returning();
                return res.json(updated[0]);
            }

            const newMark = await db.insert(marks).values({
                ...req.body,
                schoolId
            }).returning();

            res.status(201).json(newMark[0]);
        } catch (error: any) {
            console.error("Save mark error:", error);
            res.status(500).json({ message: "Failed to save mark: " + error.message });
        }
    });

    app.post("/api/marks/batch", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { marks: marksToSave } = req.body;
            if (!Array.isArray(marksToSave) || marksToSave.length === 0) {
                return res.status(400).json({ message: "No marks provided" });
            }

            const results = [];
            for (const mark of marksToSave) {
                const { studentId, term, year, type } = mark;

                const existing = await db.select().from(marks)
                    .where(and(
                        eq(marks.studentId, studentId),
                        eq(marks.term, term),
                        eq(marks.year, year),
                        eq(marks.type, type),
                        eq(marks.schoolId, schoolId)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    const updated = await db.update(marks)
                        .set({ ...mark, schoolId })
                        .where(eq(marks.id, existing[0].id))
                        .returning();
                    results.push(updated[0]);
                } else {
                    const newMark = await db.insert(marks).values({
                        ...mark,
                        schoolId
                    }).returning();
                    results.push(newMark[0]);
                }
            }

            res.json(results);
        } catch (error: any) {
            console.error("Batch marks save error:", error);
            res.status(500).json({ message: "Failed to save marks: " + error.message });
        }
    });

    app.delete("/api/marks/batch", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentIds, term, year, type } = req.body;
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ message: "No student IDs provided" });
            }

            let deletedCount = 0;
            for (const studentId of studentIds) {
                const result = await db.delete(marks)
                    .where(and(
                        eq(marks.studentId, studentId),
                        eq(marks.term, term),
                        eq(marks.year, year),
                        eq(marks.type, type),
                        eq(marks.schoolId, schoolId)
                    ));
                // Assume successful if no error
                deletedCount++;
            }

            res.json({
                deleted: deletedCount,
                requested: studentIds.length,
                message: `Deleted marks for ${deletedCount} students`
            });
        } catch (error: any) {
            console.error("Batch marks delete error:", error);
            res.status(500).json({ message: "Failed to delete marks: " + error.message });
        }
    });

    // --- Finance Module ---

    app.get("/api/financial-summary", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Ledger Based Stats (Revenue & Invoiced)
            const finStats = await db.select({
                totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
                totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            }).from(financeTransactions).where(eq(financeTransactions.schoolId, schoolId));

            const totalRevenue = Number(finStats[0].totalCredits || 0);
            const totalDue = Number(finStats[0].totalDebits || 0); // Total Invoiced
            const totalOutstanding = totalDue - totalRevenue;

            // Counts
            const paymentsCountRes = await db.select({ count: sql<number>`count(*)` }).from(feePayments).where(eq(feePayments.schoolId, schoolId));
            const paymentCount = Number(paymentsCountRes[0].count);

            // Expenses
            const expenseRecords = await db.select().from(expenses).where(eq(expenses.schoolId, schoolId));
            const totalExpenses = expenseRecords.reduce((sum, e) => sum + (e.amount || 0), 0);

            res.json({
                totalRevenue,
                totalExpenses,
                totalOutstanding,
                totalDue,
                netIncome: totalRevenue - totalExpenses,
                collectionRate: totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0,
                paymentCount,
                expenseCount: expenseRecords.length
            });
        } catch (error: any) {
            console.error("Financial summary error:", error);
            res.status(500).json({ message: "Failed to fetch financial summary: " + error.message });
        }
    });

    app.get("/api/fee-payments", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const payments = await db.select().from(feePayments)
                .where(eq(feePayments.schoolId, schoolId))
                .orderBy(desc(feePayments.createdAt));
            res.json(payments);
        } catch (error: any) {
            console.error("Fee payments error:", error);
            res.status(500).json({ message: "Failed to fetch fee payments: " + error.message });
        }
    });

    app.post("/api/fee-payments", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, feeType, amountDue, amountPaid, term, year, paymentMethod, receiptNumber, notes } = req.body;
            const balance = amountDue - (amountPaid || 0);
            const status = balance <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'pending');

            // Generate receipt number if missing to satisfy potential constraints
            const finalReceiptNumber = receiptNumber || `REC-${Date.now()}`;

            const newPayment = await db.insert(feePayments).values({
                schoolId,
                studentId,
                feeType,
                amountDue,
                amountPaid: amountPaid || 0,
                balance,
                term,
                year,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod,
                receiptNumber: finalReceiptNumber,
                status,
                notes,
                receivedBy: req.user?.id?.toString()
            }).returning();

            // Record transaction in Ledger (Credit)
            if (newPayment[0] && amountPaid > 0) {
                await db.insert(financeTransactions).values({
                    schoolId,
                    studentId,
                    transactionType: 'credit',
                    amount: amountPaid,
                    description: `Payment - ${feeType} (${term}/${year}) - ${finalReceiptNumber}`,
                    term,
                    year,
                    transactionDate: new Date().toISOString().split('T')[0]
                });
            }

            res.json(newPayment[0]);
        } catch (error: any) {
            console.error("Create fee payment error:", error);
            // Include detail/code if available, safe fallbacks
            const dbError = error.code ? ` (DB Code: ${error.code})` : '';
            res.status(500).json({ message: "Failed to create fee payment: " + error.message + dbError });
        }
    });

    app.get("/api/expenses", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const expenseRecords = await db.select().from(expenses)
                .where(and(eq(expenses.schoolId, schoolId)))
                .orderBy(desc(expenses.expenseDate));
            res.json(expenseRecords);
        } catch (error: any) {
            console.error("Expenses error:", error);
            res.status(500).json({ message: "Failed to fetch expenses: " + error.message });
        }
    });

    app.post("/api/expenses", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { amount, description, categoryId, expenseDate, referenceNumber, vendor } = req.body;

            const newExpense = await db.insert(expenses).values({
                schoolId,
                amount,
                description,
                categoryId,
                expenseDate: expenseDate || new Date().toISOString().split('T')[0],
                referenceNumber,
                vendor,
                createdBy: req.user?.id
            }).returning();

            res.json(newExpense[0]);
        } catch (error: any) {
            console.error("Create expense error:", error);
            res.status(500).json({ message: "Failed to create expense: " + error.message });
        }
    });

    app.get("/api/expense-categories", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const categories = await db.select().from(expenseCategories)
                .where(and(eq(expenseCategories.schoolId, schoolId), eq(expenseCategories.isActive, true)));
            res.json(categories);
        } catch (error: any) {
            console.error("Expense categories error:", error);
            res.status(500).json({ message: "Failed to fetch expense categories: " + error.message });
        }
    });

    app.post("/api/expense-categories", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { name, color, description } = req.body;

            const newCategory = await db.insert(expenseCategories).values({
                schoolId,
                name,
                color: color || '#6554C0',
                description
            }).returning();

            res.json(newCategory[0]);
        } catch (error: any) {
            console.error("Create expense category error:", error);
            res.status(500).json({ message: "Failed to create expense category: " + error.message });
        }
    });

    // --- Fee Structures API ---

    app.get("/api/fee-structures", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const fees = await db.select().from(feeStructures)
                .where(and(eq(feeStructures.schoolId, schoolId), eq(feeStructures.isActive, true)))
                .orderBy(feeStructures.classLevel);

            res.json(fees);
        } catch (error: any) {
            console.error("Get fee structures error:", error);
            res.status(500).json({ message: "Failed to fetch fee structures: " + error.message });
        }
    });

    app.post("/api/fee-structures", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { classLevel, feeType, amount, term, year, boardingStatus, description } = req.body;

            const newFee = await db.insert(feeStructures).values({
                schoolId,
                classLevel,
                feeType,
                amount,
                term,
                year,
                boardingStatus: boardingStatus || 'all',
                description,
                isActive: true
            }).returning();

            res.json(newFee[0]);
        } catch (error: any) {
            console.error("Create fee structure error:", error);
            res.status(500).json({ message: "Failed to create fee structure: " + error.message });
        }
    });

    app.delete("/api/fee-structures/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

            // Hard delete for now as it's configuration data, but check dependencies if needed
            // OR soft delete
            await db.update(feeStructures).set({ isActive: false }).where(eq(feeStructures.id, id));

            res.json({ message: "Fee structure deleted" });
        } catch (error: any) {
            console.error("Delete fee structure error:", error);
            res.status(500).json({ message: "Failed to delete fee structure: " + error.message });
        }
    });

    // --- Student Search ---
    app.get("/api/students/search", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const query = req.query.q as string;
            const classLevel = req.query.classLevel as string;
            const stream = req.query.stream as string;
            const boardingStatus = req.query.boardingStatus as string;

            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Ensure at least one filter is active to prevent returning all students accidentally
            // But if they explicitly select 'All' for everything (empties), maybe we should limit return or require SOMETHING.
            // Let's allow simple list if filters are provided, but if ONLY q is provided, require len >= 2.
            const hasFilters = classLevel || stream || boardingStatus;

            if (!hasFilters && (!query || query.length < 2)) {
                return res.json([]);
            }

            const conditions = [
                eq(students.schoolId, schoolId),
                eq(students.isActive, true)
            ];

            if (query && query.length > 0) {
                conditions.push(sql`LOWER(${students.name}) LIKE ${`%${query.toLowerCase()}%`}`);
            }

            if (classLevel) {
                conditions.push(eq(students.classLevel, classLevel));
            }
            if (stream) {
                conditions.push(sql`LOWER(${students.stream}) = ${stream.toLowerCase()}`);
            }
            if (boardingStatus) {
                conditions.push(sql`LOWER(${students.boardingStatus}) = ${boardingStatus.toLowerCase()}`);
            }

            // Sorting
            const sortBy = req.query.sortBy as string || 'name';
            const sortOrder = req.query.sortOrder as string || 'asc';

            let orderByClause;
            switch (sortBy) {
                case 'classLevel':
                    orderByClause = sortOrder === 'desc' ? desc(students.classLevel) : asc(students.classLevel);
                    break;
                case 'stream':
                    orderByClause = sortOrder === 'desc' ? desc(students.stream) : asc(students.stream);
                    break;
                case 'boardingStatus':
                    orderByClause = sortOrder === 'desc' ? desc(students.boardingStatus) : asc(students.boardingStatus);
                    break;
                case 'name':
                default:
                    orderByClause = sortOrder === 'desc' ? desc(students.name) : asc(students.name);
            }

            const results = await db.select().from(students)
                .where(and(...conditions))
                .orderBy(orderByClause)
                .limit(50); // Increased limit for filtered lists

            res.json(results);
        } catch (error: any) {
            res.status(500).json({ message: "Search failed: " + error.message });
        }
    });

    // --- Student Fee Overrides ---
    app.get("/api/student-fee-overrides/:studentId", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const studentId = parseInt(req.params.studentId);

            const overrides = await db.select().from(studentFeeOverrides)
                .where(and(
                    eq(studentFeeOverrides.studentId, studentId),
                    eq(studentFeeOverrides.schoolId, schoolId),
                    eq(studentFeeOverrides.isActive, true)
                ));
            res.json(overrides);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch overrides: " + error.message });
        }
    });

    app.post("/api/student-fee-overrides", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const { studentId, feeType, customAmount, term, year, reason } = req.body;

            // Check for existing override
            const existing = await db.select().from(studentFeeOverrides)
                .where(and(
                    eq(studentFeeOverrides.studentId, studentId),
                    eq(studentFeeOverrides.feeType, feeType),
                    eq(studentFeeOverrides.term, term),
                    eq(studentFeeOverrides.year, year),
                    eq(studentFeeOverrides.schoolId, schoolId)
                ))
                .limit(1);

            if (existing.length > 0) {
                const updated = await db.update(studentFeeOverrides)
                    .set({ customAmount, reason, updatedAt: new Date() })
                    .where(eq(studentFeeOverrides.id, existing[0].id))
                    .returning();
                return res.json(updated[0]);
            }

            const newOverride = await db.insert(studentFeeOverrides).values({
                schoolId,
                studentId,
                feeType,
                customAmount,
                term,
                year,
                reason,
                createdBy: req.user?.id
            }).returning();
            res.json(newOverride[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to save override: " + error.message });
        }
    });

    // --- Invoice Generation (Debits) ---

    // URL deprecated. Use /api/invoices/generate instead logic moved to invoices module 
    // Legacy endpoint removed to prevent duplicate ledger entries.

    // --- Gate Attendance Module ---

    app.get("/api/gate-attendance", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const date = req.query.date as string || new Date().toISOString().split('T')[0];

            const records = await db.select().from(gateAttendance)
                .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, date)));

            res.json(records);
        } catch (error: any) {
            console.error("Get gate attendance error:", error);
            res.status(500).json({ message: "Failed to fetch gate attendance: " + error.message });
        }
    });

    app.post("/api/gate-attendance/check-in", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, method } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

            // Check if already checked in today
            const existing = await db.select().from(gateAttendance)
                .where(and(
                    eq(gateAttendance.studentId, studentId),
                    eq(gateAttendance.date, today),
                    eq(gateAttendance.schoolId, schoolId)
                ))
                .limit(1);

            if (existing.length > 0) {
                return res.status(400).json({ message: "Student already checked in today" });
            }

            // Determine if late (assume 8:00 AM threshold)
            const lateTime = "08:00";
            const status = currentTime > lateTime ? 'late' : 'present';

            const newRecord = await db.insert(gateAttendance).values({
                studentId,
                schoolId,
                date: today,
                checkInTime: currentTime,
                checkInMethod: method || 'manual',
                status
            }).returning();

            res.json({ ...newRecord[0], checkInTime: currentTime, status });
        } catch (error: any) {
            console.error("Check-in error:", error);
            res.status(500).json({ message: "Failed to check in: " + error.message });
        }
    });

    app.post("/api/gate-attendance/check-out", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, method } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

            const existing = await db.select().from(gateAttendance)
                .where(and(
                    eq(gateAttendance.studentId, studentId),
                    eq(gateAttendance.date, today),
                    eq(gateAttendance.schoolId, schoolId)
                ))
                .limit(1);

            if (existing.length === 0) {
                return res.status(400).json({ message: "Student not checked in today" });
            }

            const updated = await db.update(gateAttendance)
                .set({
                    checkOutTime: currentTime,
                    checkOutMethod: method || 'manual'
                })
                .where(eq(gateAttendance.id, existing[0].id))
                .returning();

            res.json({ ...updated[0], checkOutTime: currentTime });
        } catch (error: any) {
            console.error("Check-out error:", error);
            res.status(500).json({ message: "Failed to check out: " + error.message });
        }
    });

    app.post("/api/gate-attendance/mark-absent", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { date } = req.body;
            const targetDate = date || new Date().toISOString().split('T')[0];

            // Get all students for the school
            const allStudents = await db.select().from(students)
                .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

            // Get existing records for the date
            const existingRecords = await db.select().from(gateAttendance)
                .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, targetDate)));

            const checkedInIds = new Set(existingRecords.map(r => r.studentId));
            const absentStudents = allStudents.filter(s => !checkedInIds.has(s.id));

            let markedCount = 0;
            for (const student of absentStudents) {
                await db.insert(gateAttendance).values({
                    studentId: student.id,
                    schoolId,
                    date: targetDate,
                    status: 'absent'
                });
                markedCount++;
            }

            res.json({ marked: markedCount });
        } catch (error: any) {
            console.error("Mark absent error:", error);
            res.status(500).json({ message: "Failed to mark absent: " + error.message });
        }
    });

    app.get("/api/attendance-settings", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Return default settings - extend with DB storage later
            res.json({
                schoolStartTime: "08:00",
                lateThresholdMinutes: 15,
                gateCloseTime: "08:30",
                schoolEndTime: "16:00",
                enableFaceRecognition: false,
                enableQrScanning: true,
                requireFaceForGate: false,
                faceConfidenceThreshold: 0.6
            });
        } catch (error: any) {
            console.error("Get attendance settings error:", error);
            res.status(500).json({ message: "Failed to fetch attendance settings: " + error.message });
        }
    });

    // --- Admin & Settings Module ---

    // Get ALL schools for super admin dashboard
    app.get("/api/admin/schools", requireSuperAdmin, async (req, res) => {
        try {
            // Return ALL schools including inactive ones for admin management
            const allSchools = await db.select().from(schools).orderBy(desc(schools.createdAt));
            res.json(allSchools);
        } catch (error: any) {
            console.error("Admin schools error:", error);
            res.status(500).json({ message: "Failed to fetch schools: " + error.message });
        }
    });

    // Platform-wide statistics for super admin dashboard
    app.get("/api/admin/stats", requireSuperAdmin, async (req, res) => {
        try {
            const [schoolCount] = await db.select({ count: sql<number>`count(*)` }).from(schools);
            const [activeSchoolCount] = await db.select({ count: sql<number>`count(*)` }).from(schools).where(eq(schools.isActive, true));
            const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
            const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.isActive, true));
            const [teacherCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers);

            // Recent activity - last 7 days (gracefully handle missing table)
            let recentLogins: any[] = [];
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                recentLogins = await db.select({
                    id: auditLogs.id,
                    userName: auditLogs.userName,
                    action: auditLogs.action,
                    entityType: auditLogs.entityType,
                    entityName: auditLogs.entityName,
                    createdAt: auditLogs.createdAt,
                }).from(auditLogs)
                    .where(gt(auditLogs.createdAt, sevenDaysAgo))
                    .orderBy(desc(auditLogs.createdAt))
                    .limit(20);
            } catch (e) {
                console.log("audit_logs table may not exist yet, skipping recent activity");
            }

            res.json({
                totalSchools: Number(schoolCount.count),
                activeSchools: Number(activeSchoolCount.count),
                totalUsers: Number(userCount.count),
                totalStudents: Number(studentCount.count),
                totalTeachers: Number(teacherCount.count),
                recentActivity: recentLogins,
            });
        } catch (error: any) {
            console.error("Admin stats error:", error);
            res.status(500).json({ message: "Failed to fetch stats: " + error.message });
        }
    });

    // Get all users for super admin
    app.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
        try {
            const allUsers = await db.select({
                id: users.id,
                username: users.username,
                name: users.name,
                role: users.role,
                email: users.email,
                phone: users.phone,
                isSuperAdmin: users.isSuperAdmin,
                createdAt: users.createdAt,
            }).from(users).orderBy(desc(users.createdAt));

            // Get school assignments for each user
            const usersWithSchools = await Promise.all(allUsers.map(async (user) => {
                const schoolAssignments = await db.select({
                    schoolId: userSchools.schoolId,
                    schoolName: schools.name,
                    role: userSchools.role,
                    isPrimary: userSchools.isPrimary,
                }).from(userSchools)
                    .leftJoin(schools, eq(schools.id, userSchools.schoolId))
                    .where(eq(userSchools.userId, user.id));

                return {
                    ...user,
                    schools: schoolAssignments,
                    schoolCount: schoolAssignments.length,
                };
            }));

            res.json(usersWithSchools);
        } catch (error: any) {
            console.error("Admin users error:", error);
            res.status(500).json({ message: "Failed to fetch users: " + error.message });
        }
    });

    // Update user (super admin only)
    app.put("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

            const { name, email, phone, role, isSuperAdmin } = req.body;

            const updateData: Record<string, any> = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (role !== undefined) updateData.role = role;
            if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;

            const updated = await db.update(users)
                .set(updateData)
                .where(eq(users.id, userId))
                .returning();

            if (updated.length === 0) return res.status(404).json({ message: "User not found" });

            // Log the action (gracefully handle missing table)
            try {
                await db.insert(auditLogs).values({
                    userId: req.user?.id,
                    userName: req.user?.name,
                    action: 'update',
                    entityType: 'user',
                    entityId: userId,
                    entityName: updated[0].name,
                    details: { changes: updateData },
                    ipAddress: req.ip,
                });
            } catch (e) { /* audit_logs table may not exist */ }

            const { password, ...userWithoutPassword } = updated[0];
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Update user error:", error);
            res.status(500).json({ message: "Failed to update user: " + error.message });
        }
    });

    // Reset user password (super admin only)
    app.post("/api/admin/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters" });
            }

            const hashedPassword = await hashPassword(newPassword);
            const updated = await db.update(users)
                .set({ password: hashedPassword })
                .where(eq(users.id, userId))
                .returning();

            if (updated.length === 0) return res.status(404).json({ message: "User not found" });

            // Log the action (gracefully handle missing table)
            try {
                await db.insert(auditLogs).values({
                    userId: req.user?.id,
                    userName: req.user?.name,
                    action: 'reset_password',
                    entityType: 'user',
                    entityId: userId,
                    entityName: updated[0].name,
                    ipAddress: req.ip,
                });
            } catch (e) { /* audit_logs table may not exist */ }

            res.json({ message: "Password reset successfully" });
        } catch (error: any) {
            console.error("Reset password error:", error);
            res.status(500).json({ message: "Failed to reset password: " + error.message });
        }
    });

    // Delete user (super admin only)
    app.delete("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

            // Don't allow deleting yourself
            if (userId === req.user?.id) {
                return res.status(400).json({ message: "Cannot delete your own account" });
            }

            const [userToDelete] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            if (!userToDelete) return res.status(404).json({ message: "User not found" });

            await db.delete(users).where(eq(users.id, userId));

            // Log the action (gracefully handle missing table)
            try {
                await db.insert(auditLogs).values({
                    userId: req.user?.id,
                    userName: req.user?.name,
                    action: 'delete',
                    entityType: 'user',
                    entityId: userId,
                    entityName: userToDelete.name,
                    ipAddress: req.ip,
                });
            } catch (e) { /* audit_logs table may not exist */ }

            res.json({ message: "User deleted successfully" });
        } catch (error: any) {
            console.error("Delete user error:", error);
            res.status(500).json({ message: "Failed to delete user: " + error.message });
        }
    });

    // Get audit logs
    app.get("/api/admin/audit-logs", requireSuperAdmin, async (req, res) => {
        try {
            const { action, entityType, limit = '50', offset = '0' } = req.query;

            // Gracefully handle missing audit_logs table
            try {
                let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

                const conditions = [];
                if (action && typeof action === 'string') {
                    conditions.push(eq(auditLogs.action, action));
                }
                if (entityType && typeof entityType === 'string') {
                    conditions.push(eq(auditLogs.entityType, entityType));
                }

                if (conditions.length > 0) {
                    query = query.where(and(...conditions)) as any;
                }

                const logs = await query.limit(parseInt(limit as string)).offset(parseInt(offset as string));

                // Get total count
                const [totalCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);

                res.json({
                    logs,
                    total: Number(totalCount.count),
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                });
            } catch (tableError) {
                // Table doesn't exist - return empty
                res.json({
                    logs: [],
                    total: 0,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                });
            }
        } catch (error: any) {
            console.error("Audit logs error:", error);
            res.status(500).json({ message: "Failed to fetch audit logs: " + error.message });
        }
    });

    // Get school settings (for the active school)
    app.get("/api/settings", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const school = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
            if (school.length === 0) {
                return res.status(404).json({ message: "School not found" });
            }

            // Return school settings in the expected format
            res.json({
                id: school[0].id,
                schoolName: school[0].name,
                addressBox: school[0].addressBox || "",
                contactPhones: school[0].contactPhones || "",
                email: school[0].email || "",
                motto: school[0].motto || "",
                regNumber: school[0].regNumber || "",
                centreNumber: school[0].centreNumber || "",
                primaryColor: school[0].primaryColor || "#7B1113",
                secondaryColor: school[0].secondaryColor || "#1E3A5F",
                logoBase64: school[0].logoBase64 || "",
                currentTerm: school[0].currentTerm || 1,
                currentYear: school[0].currentYear || new Date().getFullYear(),
                streams: school[0].streams || {},
                gradingConfig: school[0].gradingConfig || null,
                subjectsConfig: school[0].subjectsConfig || null,
            });
        } catch (error: any) {
            console.error("Get settings error:", error);
            res.status(500).json({ message: "Failed to fetch settings: " + error.message });
        }
    });

    // Update school settings
    app.put("/api/settings", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { schoolName, addressBox, contactPhones, email, motto, regNumber, centreNumber,
                primaryColor, secondaryColor, logoBase64, currentTerm, currentYear,
                streams, gradingConfig, subjectsConfig } = req.body;

            const updated = await db.update(schools)
                .set({
                    name: schoolName,
                    addressBox,
                    contactPhones,
                    email,
                    motto,
                    regNumber,
                    centreNumber,
                    primaryColor,
                    secondaryColor,
                    logoBase64,
                    currentTerm,
                    currentYear,
                    streams,
                    gradingConfig,
                    subjectsConfig,
                    updatedAt: new Date()
                })
                .where(eq(schools.id, schoolId))
                .returning();

            if (updated.length === 0) {
                return res.status(404).json({ message: "School not found" });
            }

            res.json({ message: "Settings updated successfully", school: updated[0] });
        } catch (error: any) {
            console.error("Update settings error:", error);
            res.status(500).json({ message: "Failed to update settings: " + error.message });
        }
    });

    // Get all users for the current school (admin)
    app.get("/api/users", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Get users who have a role in this school
            const schoolUsers = await db.select({
                id: users.id,
                username: users.username,
                name: users.name,
                role: userSchools.role,
                email: users.email,
                phone: users.phone,
                isSuperAdmin: users.isSuperAdmin,
                createdAt: users.createdAt
            })
                .from(users)
                .leftJoin(userSchools, and(eq(userSchools.userId, users.id), eq(userSchools.schoolId, schoolId)))
                .where(eq(userSchools.schoolId, schoolId));

            res.json(schoolUsers);
        } catch (error: any) {
            console.error("Get users error:", error);
            res.status(500).json({ message: "Failed to fetch users: " + error.message });
        }
    });

    // Get user's school assignments (super admin)
    app.get("/api/users/:id/schools", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);

            const assignments = await db.select({
                schoolId: userSchools.schoolId,
                schoolName: schools.name,
                schoolCode: schools.code,
                role: userSchools.role,
                isPrimary: userSchools.isPrimary
            })
                .from(userSchools)
                .leftJoin(schools, eq(schools.id, userSchools.schoolId))
                .where(eq(userSchools.userId, userId));

            res.json(assignments);
        } catch (error: any) {
            console.error("Get user schools error:", error);
            res.status(500).json({ message: "Failed to fetch user schools: " + error.message });
        }
    });

    // Assign user to a school (super admin)
    app.post("/api/users/:id/schools", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const { schoolId, role, isPrimary } = req.body;

            // Check if assignment already exists
            const existing = await db.select().from(userSchools)
                .where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)))
                .limit(1);

            if (existing.length > 0) {
                // Update existing
                await db.update(userSchools)
                    .set({ role, isPrimary: isPrimary || false })
                    .where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));
            } else {
                // Create new assignment
                await db.insert(userSchools).values({
                    userId,
                    schoolId,
                    role,
                    isPrimary: isPrimary || false
                });
            }

            res.json({ message: "User assigned to school successfully" });
        } catch (error: any) {
            console.error("Assign user to school error:", error);
            res.status(500).json({ message: "Failed to assign user: " + error.message });
        }
    });

    // Remove user from school (super admin)
    app.delete("/api/users/:id/schools/:schoolId", requireSuperAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const schoolId = parseInt(req.params.schoolId);

            await db.delete(userSchools)
                .where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));

            res.json({ message: "User removed from school successfully" });
        } catch (error: any) {
            console.error("Remove user from school error:", error);
            res.status(500).json({ message: "Failed to remove user: " + error.message });
        }
    });

    // Activity logs endpoint
    app.get("/api/activity-logs", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Return empty array for now - extend with actual logging later
            res.json([]);
        } catch (error: any) {
            console.error("Get activity logs error:", error);
            res.status(500).json({ message: "Failed to fetch activity logs: " + error.message });
        }
    });

    // Create new user (admin)
    app.post("/api/users", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { username, password, name, role, email, phone } = req.body;

            // Check if username already exists
            const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
            if (existing.length > 0) {
                return res.status(409).json({ message: "Username already exists" });
            }

            // Create user with hashed password
            const hashedPassword = await hashPassword(password);
            const [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                name,
                role: role || "teacher",
                email: email || null,
                phone: phone || null,
                isSuperAdmin: false
            }).returning();

            // Assign user to current school
            await db.insert(userSchools).values({
                userId: newUser.id,
                schoolId,
                role: role || "teacher",
                isPrimary: true
            });

            res.status(201).json({ message: "User created successfully", user: { id: newUser.id, username: newUser.username, name: newUser.name } });
        } catch (error: any) {
            console.error("Create user error:", error);
            res.status(500).json({ message: "Failed to create user: " + error.message });
        }
    });

    // Update user (admin)
    app.put("/api/users/:id", requireAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const { name, role, email, phone } = req.body;

            const updated = await db.update(users)
                .set({ name, role, email, phone })
                .where(eq(users.id, userId))
                .returning();

            if (updated.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            // Update role in school assignment too
            const schoolId = getActiveSchoolId(req);
            if (schoolId) {
                await db.update(userSchools)
                    .set({ role })
                    .where(and(eq(userSchools.userId, userId), eq(userSchools.schoolId, schoolId)));
            }

            res.json({ message: "User updated successfully" });
        } catch (error: any) {
            console.error("Update user error:", error);
            res.status(500).json({ message: "Failed to update user: " + error.message });
        }
    });

    // Delete user (admin)
    app.delete("/api/users/:id", requireAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);

            // Remove all school assignments first
            await db.delete(userSchools).where(eq(userSchools.userId, userId));

            // Delete the user
            await db.delete(users).where(eq(users.id, userId));

            res.json({ message: "User deleted successfully" });
        } catch (error: any) {
            console.error("Delete user error:", error);
            res.status(500).json({ message: "Failed to delete user: " + error.message });
        }
    });

    // Reset user password (admin)
    app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const { newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters" });
            }

            const hashedPassword = await hashPassword(newPassword);
            await db.update(users)
                .set({ password: hashedPassword })
                .where(eq(users.id, userId));

            res.json({ message: "Password reset successfully" });
        } catch (error: any) {
            console.error("Reset password error:", error);
            res.status(500).json({ message: "Failed to reset password: " + error.message });
        }
    });

    // Delete school (super admin only - hard delete)
    app.delete("/api/admin/schools/:id", requireSuperAdmin, async (req, res) => {
        try {
            const schoolId = parseInt(req.params.id);

            // Verify school exists
            const school = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
            if (school.length === 0) {
                return res.status(404).json({ message: "School not found" });
            }

            // Prevent deleting the default school
            if (school[0].code === "DEFAULT") {
                return res.status(400).json({ message: "Cannot delete the default school" });
            }

            // Soft delete by setting isActive to false
            await db.update(schools)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(schools.id, schoolId));

            res.json({ message: "School deleted successfully" });
        } catch (error: any) {
            console.error("Delete school error:", error);
            res.status(500).json({ message: "Failed to delete school: " + error.message });
        }
    });

    // Get all data for export (admin)
    app.get("/api/all-data", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // Fetch all data for the school
            const schoolData = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
            const studentsData = await db.select().from(students).where(eq(students.schoolId, schoolId));
            const teachersData = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId));
            const marksData = await db.select().from(marks).where(eq(marks.schoolId, schoolId));

            res.json({
                school: schoolData[0] || null,
                students: studentsData,
                teachers: teachersData,
                marks: marksData,
                exportDate: new Date().toISOString()
            });
        } catch (error: any) {
            console.error("Get all data error:", error);
            res.status(500).json({ message: "Failed to export data: " + error.message });
        }
    });

    // --- Boarding Module Routes ---

    // Boarding Stats
    app.get("/api/boarding-stats", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const today = new Date().toISOString().split('T')[0];

            const dormsCount = await db.select({ count: sql<number>`count(*)` }).from(dormitories).where(eq(dormitories.schoolId, schoolId));
            const bedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(eq(beds.schoolId, schoolId));
            const occupiedBedsCount = await db.select({ count: sql<number>`count(*)` }).from(beds).where(and(eq(beds.schoolId, schoolId), eq(beds.status, 'occupied')));
            const boardersCount = await db.select({ count: sql<number>`count(*)` }).from(students).where(and(eq(students.schoolId, schoolId), eq(students.boardingStatus, 'boarding')));

            // Leave Stats
            const pendingLeaves = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'pending')));
            const onLeave = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, 'checked_out')));

            // Roll Calls
            const morningRollCalls = await db.select({ count: sql<number>`count(*)` }).from(boardingRollCalls).where(
                and(
                    eq(boardingRollCalls.schoolId, schoolId),
                    eq(boardingRollCalls.date, today),
                    eq(boardingRollCalls.session, 'morning')
                )
            );
            const eveningRollCalls = await db.select({ count: sql<number>`count(*)` }).from(boardingRollCalls).where(
                and(
                    eq(boardingRollCalls.schoolId, schoolId),
                    eq(boardingRollCalls.date, today),
                    eq(boardingRollCalls.session, 'evening')
                )
            );

            const totalBeds = bedsCount[0]?.count || 0;
            const occupied = occupiedBedsCount[0]?.count || 0;

            res.json({
                totalDorms: dormsCount[0]?.count || 0,
                dormitories: dormsCount[0]?.count || 0, // Frontend expects this key
                totalRooms: 0,
                totalBeds: totalBeds,
                occupiedBeds: occupied,
                availableBeds: totalBeds - occupied,
                totalBoarders: boardersCount[0]?.count || 0,
                occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
                pendingLeaveRequests: pendingLeaves[0]?.count || 0,
                studentsOnLeave: onLeave[0]?.count || 0,
                todayRollCalls: {
                    morning: morningRollCalls[0]?.count || 0,
                    evening: eveningRollCalls[0]?.count || 0
                }
            });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch boarding stats: " + error.message });
        }
    });

    // Bulk Roll Calls
    app.post("/api/boarding-roll-calls/bulk", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { records, session } = req.body;
            if (!records || !Array.isArray(records)) {
                return res.status(400).json({ message: "Invalid records format" });
            }

            const today = new Date().toISOString().split('T')[0];
            const newEntries = [];

            for (const record of records) {
                const existing = await db.select().from(boardingRollCalls).where(
                    and(
                        eq(boardingRollCalls.studentId, record.studentId),
                        eq(boardingRollCalls.date, today),
                        eq(boardingRollCalls.session, session)
                    )
                );

                if (existing.length > 0) {
                    const updated = await db.update(boardingRollCalls)
                        .set({
                            status: record.status,
                            dormitoryId: record.dormitoryId,
                            markedById: req.user?.id
                        })
                        .where(eq(boardingRollCalls.id, existing[0].id))
                        .returning();
                    newEntries.push(updated[0]);
                } else {
                    const created = await db.insert(boardingRollCalls).values({
                        schoolId,
                        studentId: record.studentId,
                        date: today,
                        session: session,
                        status: record.status,
                        dormitoryId: record.dormitoryId,
                        markedById: req.user?.id
                    }).returning();
                    newEntries.push(created[0]);
                }
            }
            res.json(newEntries);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to submit bulk roll call: " + error.message });
        }
    });

    // Dormitories CRUD
    app.get("/api/dormitories", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const allDorms = await db.select().from(dormitories).where(eq(dormitories.schoolId, schoolId));
            res.json(allDorms);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch dormitories: " + error.message });
        }
    });

    app.post("/api/dormitories", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const data = { ...req.body, schoolId };
            const newDorm = await db.insert(dormitories).values(data).returning();
            res.json(newDorm[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create dormitory: " + error.message });
        }
    });

    app.put("/api/dormitories/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const updatedDorm = await db.update(dormitories).set(req.body).where(eq(dormitories.id, id)).returning();
            res.json(updatedDorm[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to update dormitory: " + error.message });
        }
    });

    app.delete("/api/dormitories/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.delete(dormitories).where(eq(dormitories.id, id));
            res.json({ message: "Dormitory deleted" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete dormitory: " + error.message });
        }
    });



    // Beds CRUD
    app.get("/api/beds", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const conditions = [eq(beds.schoolId, schoolId)];

            if (req.query.dormitoryId) {
                conditions.push(eq(beds.dormitoryId, parseInt(req.query.dormitoryId as string)));
            }
            // Removed roomId check as it's no longer relevant

            const allBeds = await db.select({
                bed: beds,
                student: {
                    id: students.id,
                    name: students.name,
                    classLevel: students.classLevel
                }
            })
                .from(beds)
                .leftJoin(students, eq(beds.currentStudentId, students.id))
                .where(and(...conditions));

            const flattenedBeds = allBeds.map(item => ({
                ...item.bed,
                studentName: item.student ? item.student.name : null,
                classLevel: item.student?.classLevel
            }));

            res.json(flattenedBeds);

        } catch (error: any) {
            console.error("Fetch beds error:", error);
            res.status(500).json({ message: "Failed to fetch beds: " + error.message });
        }
    });

    app.post("/api/beds", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const data = { ...req.body, schoolId, status: 'vacant' }; // Default status
            const newBed = await db.insert(beds).values(data).returning();
            res.json(newBed[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create bed: " + error.message });
        }
    });

    // Bulk Create Beds
    app.post("/api/beds/bulk", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { dormitoryId, startNumber, count, type } = req.body;
            // type: 'single', 'double', 'triple'

            if (!dormitoryId || !startNumber || !count || !type) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const createdBeds = [];
            let currentNumber = parseInt(startNumber);
            if (isNaN(currentNumber)) currentNumber = 1;

            for (let i = 0; i < count; i++) {
                const bedIdentifier = currentNumber.toString();

                if (type === 'single') {
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Single',
                        status: 'vacant'
                    });
                } else if (type === 'double') {
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Bottom',
                        status: 'vacant'
                    });
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Top',
                        status: 'vacant'
                    });
                } else if (type === 'triple') {
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Bottom',
                        status: 'vacant'
                    });
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Middle',
                        status: 'vacant'
                    });
                    createdBeds.push({
                        schoolId,
                        dormitoryId,
                        bedNumber: bedIdentifier,
                        level: 'Top',
                        status: 'vacant'
                    });
                }
                currentNumber++;
            }

            if (createdBeds.length > 0) {
                const inserted = await db.insert(beds).values(createdBeds).returning();
                res.json(inserted);
            } else {
                res.json([]);
            }

        } catch (error: any) {
            res.status(500).json({ message: "Failed to bulk create beds: " + error.message });
        }
    });

    app.post("/api/beds/:id/assign", requireAuth, async (req, res) => {
        try {
            const bedId = parseInt(req.params.id);
            const { studentId, mattressNumber } = req.body;

            if (!studentId) return res.status(400).json({ message: "Student ID required" });

            // 1. Update Bed
            const updatedBed = await db.update(beds)
                .set({
                    status: 'occupied',
                    currentStudentId: studentId,
                    mattressNumber: mattressNumber || null
                })
                .where(eq(beds.id, bedId))
                .returning();

            // 2. Fetch dorm info to update student
            if (updatedBed[0]) {
                const dorm = await db.select().from(dormitories).where(eq(dormitories.id, updatedBed[0].dormitoryId));
                if (dorm[0]) {
                    await db.update(students)
                        .set({
                            boardingStatus: 'Boarder',
                            houseOrDormitory: dorm[0].name
                        })
                        .where(eq(students.id, studentId));
                }
            }

            res.json(updatedBed[0]);
        } catch (error: any) {
            console.error("Bes assignment error:", error);
            res.status(500).json({ message: "Failed to assign bed: " + error.message });
        }
    });

    app.post("/api/beds/:id/unassign", requireAuth, async (req, res) => {
        try {
            const bedId = parseInt(req.params.id);

            // Get current student before unassigning
            const currentBed = await db.select().from(beds).where(eq(beds.id, bedId));
            if (currentBed[0] && currentBed[0].currentStudentId) {
                await db.update(students)
                    .set({ houseOrDormitory: null })
                    .where(eq(students.id, currentBed[0].currentStudentId));
            }

            const updatedBed = await db.update(beds)
                .set({ status: 'vacant', currentStudentId: null })
                .where(eq(beds.id, bedId))
                .returning();

            res.json(updatedBed[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to unassign bed: " + error.message });
        }
    });

    app.delete("/api/beds/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.delete(beds).where(eq(beds.id, id));
            res.json({ message: "Bed deleted" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete bed: " + error.message });
        }
    });

    // Boarding Attendance (Roll Calls)
    app.get("/api/boarding-roll-calls", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const conditions = [eq(boardingRollCalls.schoolId, schoolId)];

            // Filters
            if (req.query.date) {
                conditions.push(eq(boardingRollCalls.date, req.query.date as string));
            }
            if (req.query.session) {
                conditions.push(eq(boardingRollCalls.session, req.query.session as string));
            }
            if (req.query.dormitoryId) {
                conditions.push(eq(boardingRollCalls.dormitoryId, parseInt(req.query.dormitoryId as string)));
            }

            const results = await db.select({
                rollCall: boardingRollCalls,
                studentName: students.name
            })
                .from(boardingRollCalls)
                .leftJoin(students, eq(boardingRollCalls.studentId, students.id))
                .where(and(...conditions));
            // flatten
            const flatResults = results.map(r => ({
                ...r.rollCall,
                studentName: r.studentName
            }));

            res.json(flatResults);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch roll calls: " + error.message });
        }
    });

    app.post("/api/boarding-roll-calls", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const entries = Array.isArray(req.body) ? req.body : [req.body];

            const newEntries = [];
            for (const entry of entries) {
                const existing = await db.select().from(boardingRollCalls).where(
                    and(
                        eq(boardingRollCalls.studentId, entry.studentId),
                        eq(boardingRollCalls.date, entry.date),
                        eq(boardingRollCalls.session, entry.session)
                    )
                );

                if (existing.length > 0) {
                    const updated = await db.update(boardingRollCalls)
                        .set({ ...entry, status: entry.status || 'present' })
                        .where(eq(boardingRollCalls.id, existing[0].id))
                        .returning();
                    newEntries.push(updated[0]);
                } else {
                    const created = await db.insert(boardingRollCalls).values({
                        ...entry,
                        schoolId,
                        markedById: req.user?.id
                    }).returning();
                    newEntries.push(created[0]);
                }
            }

            res.json(newEntries);

        } catch (error: any) {
            res.status(500).json({ message: "Failed to submit roll call: " + error.message });
        }
    });

    // Leave Requests
    app.get("/api/leave-requests", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const conditions = [eq(leaveRequests.schoolId, schoolId)];

            if (req.query.status) {
                conditions.push(eq(leaveRequests.status, req.query.status as string));
            }
            if (req.query.studentId) {
                conditions.push(eq(leaveRequests.studentId, parseInt(req.query.studentId as string)));
            }

            const results = await db.select({
                request: leaveRequests,
                studentName: students.name,
                classLevel: students.classLevel
            })
                .from(leaveRequests)
                .leftJoin(students, eq(leaveRequests.studentId, students.id))
                .where(and(...conditions));
            const flatResults = results.map(r => ({
                ...r.request,
                studentName: r.studentName,
                classLevel: r.classLevel
            }));

            res.json(flatResults);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch leave requests: " + error.message });
        }
    });

    app.post("/api/leave-requests", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const data = {
                ...req.body,
                schoolId,
                requestedById: req.user?.id,
                status: 'pending'
            };
            const newRequest = await db.insert(leaveRequests).values(data).returning();
            res.json(newRequest[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create leave request: " + error.message });
        }
    });

    app.put("/api/leave-requests/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const data = req.body;

            const updates: any = { ...data };
            if (data.status === 'approved') {
                updates.approvedById = req.user?.id;
                updates.approvedAt = new Date();
            } else if (data.status === 'checked_out') {
                updates.checkOutById = req.user?.id;
                updates.checkOutTime = new Date().toISOString();
            } else if (data.status === 'returned') {
                updates.checkInById = req.user?.id;
                updates.checkInTime = new Date().toISOString();
            }

            const updatedRequest = await db.update(leaveRequests)
                .set(updates)
                .where(eq(leaveRequests.id, id))
                .returning();

            res.json(updatedRequest[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to update leave request: " + error.message });
        }
    });

    app.delete("/api/leave-requests/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
            res.json({ message: "Leave request deleted" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete leave request: " + error.message });
        }
    });

    // Public verification endpoint
    app.get("/api/public/verify-student/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ valid: false, message: "Invalid ID" });

            const studentData = await db.select({
                student: students,
                schoolName: schools.name
            })
                .from(students)
                .leftJoin(schools, eq(students.schoolId, schools.id))
                .where(eq(students.id, id))
                .limit(1);

            if (!studentData.length) {
                return res.json({ valid: false, message: "Student not found" });
            }

            const { student, schoolName } = studentData[0];

            res.json({
                valid: true,
                student: {
                    name: student.name,
                    photoBase64: student.photoBase64,
                    classLevel: student.classLevel,
                    stream: student.stream,
                    schoolName: schoolName || "Unknown School",
                    status: (student as any).isActive ? "Active" : "Inactive", // Handle conditional type inference
                    indexNumber: student.indexNumber
                }
            });

        } catch (error: any) {
            console.error("Verification error:", error);
            res.status(500).json({ valid: false, message: "Verification failed" });
        }
    });


    // Visitor Logs
    app.get("/api/visitor-logs", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const logs = await db.select({
                log: visitorLogs,
                studentName: students.name,
                className: students.classLevel
            })
                .from(visitorLogs)
                .leftJoin(students, eq(visitorLogs.studentId, students.id))
                .where(eq(visitorLogs.schoolId, schoolId))
                .orderBy(desc(visitorLogs.visitDate));

            const flattened = logs.map(l => ({ ...l.log, studentName: l.studentName, className: l.className }));
            res.json(flattened);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch visitor logs: " + error.message });
        }
    });

    app.post("/api/visitor-logs", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const data = {
                ...req.body,
                schoolId,
                registeredById: req.user?.id
            };
            const newLog = await db.insert(visitorLogs).values(data).returning();
            res.json(newLog[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create visitor log: " + error.message });
        }
    });

    app.put("/api/visitor-logs/:id/checkout", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { checkOutTime } = req.body;

            const updated = await db.update(visitorLogs)
                .set({ checkOutTime: checkOutTime || new Date().toLocaleTimeString() })
                .where(eq(visitorLogs.id, id))
                .returning();

            res.json(updated[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to checkout visitor: " + error.message });
        }
    });

    app.delete("/api/visitor-logs/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.delete(visitorLogs).where(eq(visitorLogs.id, id));
            res.json({ message: "Visitor log deleted" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete visitor log: " + error.message });
        }
    });

    // Boarding Settings
    app.get("/api/boarding-settings", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const settings = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

            if (settings.length === 0) {
                // Return defaults if not found, but don't create yet
                return res.json({});
            }
            res.json(settings[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch boarding settings: " + error.message });
        }
    });

    app.put("/api/boarding-settings", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const existing = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

            if (existing.length > 0) {
                const updated = await db.update(boardingSettings)
                    .set({ ...req.body, updatedAt: new Date() })
                    .where(eq(boardingSettings.id, existing[0].id))
                    .returning();
                res.json(updated[0]);
            } else {
                const created = await db.insert(boardingSettings)
                    .values({ ...req.body, schoolId })
                    .returning();
                res.json(created[0]);
            }
        } catch (error: any) {
            res.status(500).json({ message: "Failed to update boarding settings: " + error.message });
        }
    });


    // --- Admin Console Routes ---

    // 1. Stats Overview
    app.get("/api/admin/stats", requireAuth, async (req, res) => {
        try {
            // Check for super admin manually if middleware is tricky, but requireAuth adds user to req
            if (!(req.user as any)?.isSuperAdmin) {
                return res.status(403).json({ message: "Admin access required" });
            }

            const [schoolsCount] = await db.select({ count: sql<number>`count(*)` }).from(schools);
            const [activeSchools] = await db.select({ count: sql<number>`count(*)` }).from(schools).where(eq(schools.isActive, true));
            const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
            const [studentsCount] = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.isActive, true));
            const [teachersCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers).where(eq(teachers.isActive, true));

            const recentLogs = await db.select().from(auditLogs)
                .orderBy(desc(auditLogs.createdAt))
                .limit(10);

            res.json({
                totalSchools: Number(schoolsCount?.count || 0),
                activeSchools: Number(activeSchools?.count || 0),
                totalUsers: Number(usersCount?.count || 0),
                totalStudents: Number(studentsCount?.count || 0),
                totalTeachers: Number(teachersCount?.count || 0),
                recentActivity: recentLogs
            });
        } catch (error: any) {
            console.error("Admin stats error:", error);
            res.status(500).json({ message: "Failed to fetch stats" });
        }
    });

    // 2. School Management
    app.get("/api/admin/schools", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const allSchools = await db.select().from(schools).orderBy(desc(schools.createdAt));
            res.json(allSchools);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/schools/:id", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

            const [school] = await db.select().from(schools).where(eq(schools.id, id));
            if (!school) return res.status(404).json({ message: "School not found" });

            res.json(school);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.post("/api/schools", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const [newSchool] = await db.insert(schools).values({
                ...req.body,
                isActive: true
            }).returning();

            // Log action
            await db.insert(auditLogs).values({
                userId: (req.user as any).id,
                userName: (req.user as any).username,
                action: 'create_school',
                entityType: 'school',
                entityId: newSchool.id,
                entityName: newSchool.name,
                details: { name: newSchool.name, code: newSchool.code }
            });

            res.json(newSchool);
        } catch (error: any) {
            console.error("Create school error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.put("/api/schools/:id", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const id = parseInt(req.params.id);
            const [updated] = await db.update(schools).set({
                ...req.body,
                updatedAt: new Date()
            }).where(eq(schools.id, id)).returning();

            if (!updated) return res.status(404).json({ message: "School not found" });

            // Log action
            await db.insert(auditLogs).values({
                userId: (req.user as any).id,
                userName: (req.user as any).username,
                action: 'update_school',
                entityType: 'school',
                entityId: updated.id,
                entityName: updated.name,
                details: { changes: req.body }
            });

            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/admin/schools/:id", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const id = parseInt(req.params.id);

            // Fetch first to get name for log
            const [school] = await db.select().from(schools).where(eq(schools.id, id));
            if (!school) return res.status(404).json({ message: "School not found" });

            // Soft delete? User said "stays inactive". If they want hard delete:
            // await db.delete(schools).where(eq(schools.id, id));
            // But let's try true deletion for now as user seemed annoyed it "just stays inactive".
            // However, cascading deletes might wipe out students/marks!
            // SAFEST OPTION: Soft Delete, but maybe the UI was just showing 'Inactive'.
            // IF the user pressed DELETE, they might expect it gone from the list?
            // "when i delete a school, it just stays inactive" -> This implies they WANT it gone.
            // But `schools` table is critical. 
            // Let's implement SOFT DELETE via `isActive: false` but ensure we return success.
            // Or if they explicitly want to remove it, we should DELETE.
            // Given the complaint, I will stick to Soft Delete for safety BUT I will check if the user wanted it *hidden*.
            // For now, I will update it to Hard delete ONLY IF it has no data? No, unsafe.
            // I will implement Soft Delete but ensure the UI filters it out IF the user applies a filter, or maybe they just didn't see it change?
            // Actually, let's look at `isActive`.
            // I will stick to updating `isActive: false` for safety, as deleting a school wipes all students/marks (cascade).

            const [updated] = await db.update(schools).set({ isActive: false }).where(eq(schools.id, id)).returning();

            // Log action
            await db.insert(auditLogs).values({
                userId: (req.user as any).id,
                userName: (req.user as any).username,
                action: 'deactivate_school',
                entityType: 'school',
                entityId: school.id,
                entityName: school.name
            });

            res.json({ message: "School deactivated successfully", school: updated });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    // 3. User Management
    app.get("/api/admin/users", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });

            // Join with userSchools to get school count
            // Simple query for now
            const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
            // Calculate school counts (separate query to avoid complex join for now, or use map)
            // This is a bit inefficient but safe for quickly fixing 
            const usersWithCounts = await Promise.all(allUsers.map(async (u) => {
                const [count] = await db.select({ count: sql<number>`count(*)` })
                    .from(userSchools).where(eq(userSchools.userId, u.id));
                return {
                    ...u,
                    schoolCount: Number(count?.count || 0)
                };
            }));

            res.json(usersWithCounts);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    // Create User (Admin)
    app.post("/api/admin/users", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const { username, password, name, role, isSuperAdmin } = req.body;

            // Check if username exists
            const [existing] = await db.select().from(users).where(eq(users.username, username));
            if (existing) return res.status(400).json({ message: "Username already exists" });

            const hashedPassword = await hashPassword(password);
            const [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                name,
                role: role || 'teacher',
                isSuperAdmin: isSuperAdmin || false
            }).returning();

            res.json(newUser);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const id = parseInt(req.params.id);
            await db.delete(users).where(eq(users.id, id));
            res.json({ message: "User deleted" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });


    // 4. Audit Logs
    app.get("/api/admin/audit-logs", requireAuth, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const limit = parseInt(req.query.limit as string) || 100;

            const logs = await db.select().from(auditLogs)
                .orderBy(desc(auditLogs.createdAt))
                .limit(limit);

            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

}
