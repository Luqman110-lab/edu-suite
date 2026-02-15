import { Express } from "express";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray, gt, or, isNull } from "drizzle-orm";

import { students, teachers, marks, schools, feePayments, expenses, expenseCategories, gateAttendance, teacherAttendance, users, userSchools, feeStructures, financeTransactions, conversations, conversationParticipants, messages, promotionHistory, studentFeeOverrides, dormitories, beds, boardingRollCalls, leaveRequests, auditLogs, invoices, invoiceItems, paymentPlans, planInstallments, visitorLogs, boardingSettings, faceEmbeddings, insertStudentSchema, p7ExamSets, p7Scores, scholarships, studentScholarships, insertDormitorySchema, insertBedSchema, insertLeaveRequestSchema, insertVisitorLogSchema, insertBoardingSettingsSchema, insertSchoolSchema, insertUserSchema, insertP7ExamSetSchema, insertProgramItemSchema } from "../shared/schema";
import { createInsertSchema } from "drizzle-zod"; // Added import
import { z } from "zod";
import { requireAuth, requireAdmin, requireStaff, requireSuperAdmin, getActiveSchoolId, hashPassword } from "./auth";
// MobileMoneyService disabled - cash only for now
// import { MobileMoneyService } from "./services/MobileMoneyService";
import { broadcastMessage } from "./websocket";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NotificationService } from "./services/NotificationService";
import { pushSubscriptions, programItems } from "../shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { parentRoutes } from "./routes/parent";
import { guardianRoutes } from "./routes/admin/guardians";
import { academicRoutes } from "./routes/academic";

export function registerExtendedRoutes(app: Express) {
    app.use("/api/parent", parentRoutes);
    app.use("/api/guardians", guardianRoutes);
    app.use("/api", academicRoutes);

    // --- Biometric Authentication (Face Recognition) ---

    // Enroll a face (Save embedding)
    app.post("/api/face-embeddings", requireAdmin, async (req, res) => {
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



    // Get all face embeddings for the school (for frontend matching)
    app.get("/api/face-embeddings", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { personType } = req.query;
            const conditions = [
                eq(faceEmbeddings.schoolId, schoolId),
                eq(faceEmbeddings.isActive, true)
            ];

            if (personType && typeof personType === 'string') {
                conditions.push(eq(faceEmbeddings.personType, personType));
            }

            const embeddings = await db.select().from(faceEmbeddings)
                .where(and(...conditions));

            res.json(embeddings);
        } catch (error: any) {
            console.error("Get face embeddings error:", error);
            res.status(500).json({ message: "Failed to fetch face embeddings: " + error.message });
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

    app.post("/api/fee-structures", requireAdmin, async (req, res) => {
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

    app.put("/api/fee-structures/:id", requireAdmin, async (req, res) => {
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

    app.delete("/api/fee-structures/:id", requireAdmin, async (req, res) => {
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
    app.post("/api/expense-categories", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { name, color, description } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ message: "Category name is required" });
            }

            const newCategory = await db.insert(expenseCategories).values({
                schoolId,
                name: name.trim(),
                color: color || '#6554C0',
                description
            }).returning();

            res.json(newCategory[0]);
        } catch (error: any) {
            console.error("Create expense category error:", error);
            res.status(500).json({ message: "Failed to create expense category" });
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
    app.post("/api/invoices/generate", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { term, year, dueDate, classLevel } = req.body;
            if (!term || !year) return res.status(400).json({ message: "Term and year are required" });
            const termNum = Number(term);
            const yearNum = Number(year);
            if (termNum < 1 || termNum > 3) return res.status(400).json({ message: "Term must be 1, 2, or 3" });
            if (yearNum < 2020 || yearNum > 2100) return res.status(400).json({ message: "Year must be between 2020 and 2100" });

            // Get active fee structures for the term/year (or those applicable to all terms)
            const structures = await db.select().from(feeStructures)
                .where(and(
                    eq(feeStructures.schoolId, schoolId),
                    or(eq(feeStructures.term, termNum), isNull(feeStructures.term)),
                    eq(feeStructures.year, yearNum),
                    eq(feeStructures.isActive, true)
                ));

            if (structures.length === 0) {
                return res.status(400).json({ message: "No fee structures found for this term/year" });
            }

            // Get active students (optionally filtered by class)
            let studentConditions = [eq(students.schoolId, schoolId), eq(students.isActive, true)];
            if (classLevel) studentConditions.push(eq(students.classLevel, classLevel));

            const activeStudents = await db.select().from(students)
                .where(and(...studentConditions));

            if (activeStudents.length === 0) {
                return res.status(400).json({ message: "No active students found" });
            }

            // Fetch all overrides for this school/year/term to apply custom amounts
            const overrides = await db.select().from(studentFeeOverrides)
                .where(and(
                    eq(studentFeeOverrides.schoolId, schoolId),
                    eq(studentFeeOverrides.year, yearNum),
                    or(eq(studentFeeOverrides.term, termNum), isNull(studentFeeOverrides.term)),
                    eq(studentFeeOverrides.isActive, true)
                ));

            // Build a lookup map: studentId-feeType -> customAmount
            const overrideMap = new Map<string, number>();
            for (const o of overrides) {
                overrideMap.set(`${o.studentId}-${o.feeType}`, o.customAmount);
            }

            // Fetch active scholarships for this school and their student assignments
            const activeScholarships = await db.select().from(scholarships)
                .where(and(
                    eq(scholarships.schoolId, schoolId),
                    eq(scholarships.isActive, true)
                ));

            const scholarshipAssignments = await db.select().from(studentScholarships)
                .where(and(
                    eq(studentScholarships.schoolId, schoolId),
                    eq(studentScholarships.year, yearNum),
                    or(eq(studentScholarships.term, termNum), isNull(studentScholarships.term)),
                    eq(studentScholarships.status, 'active')
                ));

            // Build a lookup: studentId -> list of active scholarship details
            const scholarshipMap = new Map<number, Array<{ discountType: string; discountValue: number; feeTypes: string[] }>>();
            for (const sa of scholarshipAssignments) {
                const sch = activeScholarships.find(s => s.id === sa.scholarshipId);
                if (!sch) continue;
                const existing = scholarshipMap.get(sa.studentId) || [];
                existing.push({
                    discountType: sch.discountType,
                    discountValue: sch.discountValue,
                    feeTypes: (sch.feeTypes as string[]) || [],
                });
                scholarshipMap.set(sa.studentId, existing);
            }

            // Wrap entire generation in a transaction for atomicity
            const result = await db.transaction(async (tx) => {
                let invoicesCreated = 0;
                let invoicesSkipped = 0;

                for (const student of activeStudents) {
                    // Check if invoice already exists
                    const existing = await tx.select({ id: invoices.id }).from(invoices)
                        .where(and(
                            eq(invoices.schoolId, schoolId),
                            eq(invoices.studentId, student.id),
                            eq(invoices.term, termNum),
                            eq(invoices.year, yearNum)
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

                    if (applicableStructures.length === 0) continue;

                    // Step 1: Apply fee overrides (custom amounts per student)
                    const itemsWithAmounts = applicableStructures.map(s => {
                        const overrideKey = `${student.id}-${s.feeType}`;
                        const amount = overrideMap.get(overrideKey) ?? s.amount;
                        return { feeType: s.feeType, classLevel: s.classLevel, amount };
                    });

                    // Step 2: Apply scholarship discounts
                    const studentDiscounts = scholarshipMap.get(student.id) || [];
                    for (const item of itemsWithAmounts) {
                        for (const disc of studentDiscounts) {
                            // Apply if scholarship targets all fee types (empty array) or this specific type
                            if (disc.feeTypes.length === 0 || disc.feeTypes.includes(item.feeType)) {
                                if (disc.discountType === 'percentage') {
                                    item.amount = Math.round(item.amount * (1 - disc.discountValue / 100));
                                } else if (disc.discountType === 'fixed') {
                                    item.amount = Math.max(0, item.amount - disc.discountValue);
                                }
                            }
                        }
                    }

                    const totalAmount = itemsWithAmounts.reduce((sum, item) => sum + item.amount, 0);
                    const invoiceNumber = `INV-${yearNum}-T${termNum}-${schoolId}-${student.id.toString().padStart(5, '0')}`;

                    // Create invoice
                    const [newInvoice] = await tx.insert(invoices).values({
                        schoolId,
                        studentId: student.id,
                        invoiceNumber,
                        term: termNum,
                        year: yearNum,
                        totalAmount,
                        amountPaid: 0,
                        balance: totalAmount,
                        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                        status: 'unpaid',
                    }).returning();

                    // Create invoice items (with discounts already applied)
                    for (const item of itemsWithAmounts) {
                        await tx.insert(invoiceItems).values({
                            invoiceId: newInvoice.id,
                            feeType: item.feeType,
                            description: `${item.feeType} - ${item.classLevel}`,
                            amount: item.amount,
                        });
                    }

                    invoicesCreated++;
                }

                return { invoicesCreated, invoicesSkipped };
            });

            res.json({
                message: `Generated ${result.invoicesCreated} invoices, skipped ${result.invoicesSkipped} existing`,
                invoicesCreated: result.invoicesCreated,
                invoicesSkipped: result.invoicesSkipped,
            });
        } catch (error: any) {
            console.error("Generate invoices error:", error);
            res.status(500).json({ message: "Failed to generate invoices" });
        }
    });

    // Update invoice (notes, due date only - amounts are updated via payment recording)
    app.put("/api/invoices/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const invoiceId = parseInt(req.params.id);
            if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });

            const { notes, dueDate } = req.body;

            // Only allow updating notes and dueDate. Status and amountPaid are
            // computed from actual payments to prevent client-side manipulation.
            const updateData: Record<string, any> = { updatedAt: new Date() };
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
            res.status(500).json({ message: "Failed to update invoice" });
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
                parentPhone: students.parentContact,
            }).from(invoices)
                .leftJoin(students, eq(invoices.studentId, students.id))
                .where(and(...conditions))
                .orderBy(desc(invoices.balance));

            // Calculate aging from due date (not creation date)
            const now = new Date();
            const debtors = debtorInvoices.map(d => {
                const dueDate = d.invoice.dueDate ? new Date(d.invoice.dueDate) : new Date(d.invoice.createdAt || now);
                const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

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

            // Summary stats (computed over ALL filtered results)
            const summary = {
                totalDebtors: filtered.length,
                totalOutstanding: filtered.reduce((sum, d) => sum + d.balance, 0),
                current: filtered.filter(d => d.agingCategory === 'current').reduce((sum, d) => sum + d.balance, 0),
                days1to30: filtered.filter(d => d.agingCategory === '1-30').reduce((sum, d) => sum + d.balance, 0),
                days31to60: filtered.filter(d => d.agingCategory === '31-60').reduce((sum, d) => sum + d.balance, 0),
                days61to90: filtered.filter(d => d.agingCategory === '61-90').reduce((sum, d) => sum + d.balance, 0),
                days90plus: filtered.filter(d => d.agingCategory === '90+').reduce((sum, d) => sum + d.balance, 0),
            };

            // Paginate the debtor list
            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
            const paginatedDebtors = filtered.slice(offset, offset + limit);

            res.json({ debtors: paginatedDebtors, summary, total: filtered.length, limit, offset });
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

            // Get payment totals from feePayments (exclude soft-deleted)
            let paymentConditions = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];
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
    app.post("/api/invoices/:id/remind", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const invoiceId = parseInt(req.params.id);
            if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });
            const { type = 'sms' } = req.body;

            // Scope by schoolId to prevent IDOR
            const invoice = await db.query.invoices.findFirst({
                where: and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)),
                with: {
                    student: true,
                }
            });

            if (!invoice) return res.status(404).json({ message: "Invoice not found" });

            // TODO: Integrate actual SMS/Email provider here
            console.log(`[Mock ${type.toUpperCase()}] Sending reminder for invoice ${invoice.invoiceNumber}. Amount: ${invoice.balance}`);

            // Update reminder status
            await db.update(invoices)
                .set({
                    reminderSentAt: new Date(),
                    reminderCount: (invoice.reminderCount || 0) + 1,
                    lastReminderType: type,
                })
                .where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)));

            res.json({ message: `${type.toUpperCase()} reminder sent successfully`, success: true });
        } catch (error: any) {
            console.error("Send reminder error:", error);
            res.status(500).json({ message: "Failed to send reminder" });
        }
    });

    // Bulk send reminders for overdue invoices
    app.post("/api/invoices/bulk-remind", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
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
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

            const [countResult] = await db.select({ count: sql<number>`count(*)` })
                .from(paymentPlans)
                .where(eq(paymentPlans.schoolId, schoolId));

            const plans = await db.query.paymentPlans.findMany({
                where: eq(paymentPlans.schoolId, schoolId),
                with: {
                    student: true,
                    installments: true,
                },
                orderBy: [desc(paymentPlans.createdAt)],
                limit,
                offset,
            });
            res.json({ data: plans, total: Number(countResult.count), limit, offset });
        } catch (error: any) {
            console.error("List plans error:", error);
            res.status(500).json({ message: "Failed to list plans" });
        }
    });

    // Create payment plan
    app.post("/api/payment-plans", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const { studentId, invoiceId, planName, totalAmount, downPayment, installmentCount, frequency, startDate } = req.body;

            // Input validation
            const total = Number(totalAmount);
            const down = Number(downPayment) || 0;
            const count = Number(installmentCount);
            if (isNaN(total) || total <= 0) return res.status(400).json({ message: "totalAmount must be a positive number" });
            if (down < 0 || down >= total) return res.status(400).json({ message: "downPayment must be between 0 and totalAmount" });
            if (!count || count < 1 || count > 36) return res.status(400).json({ message: "installmentCount must be between 1 and 36" });
            if (!startDate) return res.status(400).json({ message: "startDate is required" });
            if (!['weekly', 'monthly'].includes(frequency)) return res.status(400).json({ message: "frequency must be 'weekly' or 'monthly'" });

            // Verify student belongs to school
            const studentCheck = await db.select({ id: students.id }).from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);
            if (studentCheck.length === 0) return res.status(403).json({ message: "Student does not belong to the active school" });

            const amountPerInstallment = Math.round((total - down) / count);
            const start = new Date(startDate);

            // Wrap plan + installments in a transaction
            const newPlan = await db.transaction(async (tx) => {
                const [plan] = await tx.insert(paymentPlans).values({
                    schoolId,
                    studentId,
                    invoiceId,
                    planName,
                    totalAmount: total,
                    downPayment: down,
                    installmentCount: count,
                    frequency,
                    startDate: start,
                    status: 'active',
                }).returning();

                for (let i = 1; i <= count; i++) {
                    const dueDate = new Date(start);
                    if (frequency === 'weekly') {
                        dueDate.setDate(dueDate.getDate() + (i * 7));
                    } else {
                        dueDate.setMonth(dueDate.getMonth() + i);
                    }

                    await tx.insert(planInstallments).values({
                        planId: plan.id,
                        installmentNumber: i,
                        dueDate,
                        amount: amountPerInstallment,
                        status: 'pending',
                    });
                }

                return plan;
            });

            res.json(newPlan);
        } catch (error: any) {
            console.error("Create plan error:", error);
            res.status(500).json({ message: "Failed to create payment plan" });
        }
    });

    // Get payment plan details
    app.get("/api/payment-plans/:id", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid plan ID" });

            const plan = await db.query.paymentPlans.findFirst({
                where: and(eq(paymentPlans.id, id), eq(paymentPlans.schoolId, schoolId)),
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

    // Record installment payment (cash only)
    app.post("/api/payment-plans/:id/pay", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { installmentId, amount } = req.body;
            const planId = parseInt(req.params.id);

            // Input validation
            const payAmount = Number(amount);
            if (isNaN(payAmount) || payAmount <= 0) {
                return res.status(400).json({ message: "Amount must be a positive number" });
            }
            if (isNaN(planId)) return res.status(400).json({ message: "Invalid plan ID" });

            // 1. Get Installment & Plan Details
            const installment = await db.query.planInstallments.findFirst({
                where: eq(planInstallments.id, installmentId),
            });
            if (!installment) return res.status(404).json({ message: "Installment not found" });

            // Prevent overpayment on installment
            const remaining = installment.amount - (installment.paidAmount || 0);
            if (payAmount > remaining) {
                return res.status(400).json({ message: `Amount exceeds remaining balance of ${Math.round(remaining)}` });
            }

            const plan = await db.query.paymentPlans.findFirst({
                where: eq(paymentPlans.id, planId),
                with: { invoice: true }
            });
            if (!plan) return res.status(404).json({ message: "Plan not found" });

            // Security Check: Plan must belong to active school
            if (plan.schoolId !== schoolId) {
                return res.status(403).json({ message: "Access denied to payment plan from another school" });
            }

            const today = new Date();
            const termId = plan.invoice?.term || 1;
            const yearId = plan.invoice?.year || new Date().getFullYear();

            // Wrap all writes in a transaction
            await db.transaction(async (tx) => {
                // Generate sequential receipt number inside transaction
                const lastReceipt = await tx.select({ receiptNumber: feePayments.receiptNumber })
                    .from(feePayments)
                    .where(and(
                        eq(feePayments.schoolId, schoolId),
                        sql`${feePayments.receiptNumber} LIKE ${'REC-' + yearId + '-%'}`
                    ))
                    .orderBy(desc(feePayments.id))
                    .limit(1);

                let nextNum = 1;
                if (lastReceipt[0]?.receiptNumber) {
                    const parts = lastReceipt[0].receiptNumber.split('-');
                    const lastNum = parseInt(parts[parts.length - 1]);
                    if (!isNaN(lastNum)) nextNum = lastNum + 1;
                }
                const receiptNumber = `REC-${yearId}-${nextNum.toString().padStart(4, '0')}`;
                // 2. Update Installment atomically
                const newPaidAmount = (installment.paidAmount || 0) + payAmount;
                const isFull = newPaidAmount >= installment.amount;

                await tx.update(planInstallments)
                    .set({
                        paidAmount: newPaidAmount,
                        paidAt: today,
                        status: isFull ? 'paid' : 'partial',
                    })
                    .where(eq(planInstallments.id, installmentId));

                // 3. Create fee_payment record
                const [payment] = await tx.insert(feePayments).values({
                    schoolId: plan.schoolId,
                    studentId: plan.studentId,
                    amountDue: Math.round(installment.amount),
                    amountPaid: Math.round(payAmount),
                    balance: Math.max(0, Math.round(remaining - payAmount)),
                    term: termId,
                    year: yearId,
                    paymentDate: today.toISOString().split('T')[0],
                    paymentMethod: 'Cash',
                    feeType: 'Tuition',
                    receiptNumber,
                    notes: `Installment #${installment.installmentNumber} - ${plan.planName}`,
                    receivedBy: req.user?.id?.toString(),
                }).returning();

                // 4. Create finance_transaction record
                await tx.insert(financeTransactions).values({
                    schoolId: plan.schoolId,
                    studentId: plan.studentId,
                    transactionType: 'credit',
                    amount: Math.round(payAmount),
                    term: termId,
                    year: yearId,
                    description: `Payment Plan: ${plan.planName} (Inst #${installment.installmentNumber}) - ${receiptNumber}`,
                    transactionDate: today.toISOString().split('T')[0],
                });

                // 5. Update Main Invoice atomically (if linked)
                if (plan.invoiceId) {
                    await tx.update(invoices)
                        .set({
                            amountPaid: sql`${invoices.amountPaid} + ${Math.round(payAmount)}`,
                            balance: sql`GREATEST(0, ${invoices.totalAmount} - (${invoices.amountPaid} + ${Math.round(payAmount)}))`,
                            status: sql`CASE WHEN (${invoices.amountPaid} + ${Math.round(payAmount)}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                            updatedAt: today
                        })
                        .where(and(eq(invoices.id, plan.invoiceId), eq(invoices.schoolId, schoolId)));
                }
            });

            res.json({ message: "Payment recorded and ledger updated", success: true });
        } catch (error: any) {
            console.error("Pay installment error:", error);
            res.status(500).json({ message: "Failed to record payment" });
        }
    });

    // --- Mobile Money Endpoints (disabled - cash only for now) ---

    app.post("/api/finance/momo/pay", requireAuth, async (_req, res) => {
        res.status(503).json({ message: "Mobile Money payments are not available. Please use Cash, Bank Deposit, or Cheque." });
    });

    app.get("/api/finance/momo/transaction/:id", requireAuth, async (_req, res) => {
        res.status(503).json({ message: "Mobile Money is not available." });
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

            // Fetch actual payments (revenue)
            const payments = await db.select({
                date: feePayments.paymentDate,
                amount: feePayments.amountPaid
            }).from(feePayments).where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)));

            // Fetch actual expenses
            const expenseRecords = await db.select({
                date: expenses.expenseDate,
                amount: expenses.amount
            }).from(expenses).where(eq(expenses.schoolId, schoolId));

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const revenueMap: Record<string, number> = {};
            const expenseMap: Record<string, number> = {};

            months.forEach(m => { revenueMap[m] = 0; expenseMap[m] = 0; });

            payments.forEach(p => {
                if (p.date) {
                    const date = new Date(p.date);
                    if (!isNaN(date.getTime())) {
                        const month = months[date.getMonth()];
                        revenueMap[month] = (revenueMap[month] || 0) + Number(p.amount);
                    }
                }
            });

            expenseRecords.forEach(e => {
                if (e.date) {
                    const date = new Date(e.date);
                    if (!isNaN(date.getTime())) {
                        const month = months[date.getMonth()];
                        expenseMap[month] = (expenseMap[month] || 0) + Number(e.amount);
                    }
                }
            });

            const data = months.map(name => ({
                name,
                revenue: revenueMap[name] || 0,
                expenses: expenseMap[name] || 0
            }));

            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to fetch revenue trends" });
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

    app.post("/api/students", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const userId = req.user!.id;
            const userName = req.user!.name;

            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            // VALIDATION
            // Omit internal fields that shouldn't be in the body
            const validationSchema = insertStudentSchema.omit({
                id: true,
                schoolId: true,
                createdAt: true,
                updatedAt: true,
                isActive: true
            });

            const parseResult = validationSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ message: "Invalid student data: " + parseResult.error.message });
            }
            const data = parseResult.data;

            const newStudent = await db.insert(students).values({
                ...(data as Record<string, unknown>),
                schoolId,
                isActive: true
            } as typeof students.$inferInsert).returning();

            // AUDIT LOG
            await db.insert(auditLogs).values({
                userId,
                userName,
                action: 'create',
                entityType: 'student',
                entityId: newStudent[0].id,
                entityName: newStudent[0].name,
                details: { indexNumber: newStudent[0].indexNumber, class: newStudent[0].classLevel },
                ipAddress: req.ip
            });

            res.status(201).json(newStudent[0]);
        } catch (error: any) {
            console.error("Create student error:", error);
            res.status(500).json({ message: "Failed to create student: " + error.message });
        }
    });

    app.put("/api/students/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const userId = req.user!.id;
            const userName = req.user!.name;
            const studentId = parseInt(req.params.id);

            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

            const existing = await db.select().from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);

            if (existing.length === 0) return res.status(404).json({ message: "Student not found" });

            // Update Validation (Partial)
            const validationSchema = insertStudentSchema.omit({
                id: true,
                schoolId: true,
                createdAt: true,
                updatedAt: true
            });

            const parseResult = validationSchema.partial().safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ message: "Invalid update data: " + parseResult.error.message });
            }
            const data = parseResult.data;

            const updated = await db.update(students)
                .set({ ...data, schoolId }) // Ensure schoolId doesn't change implicitly (though passed in body, it's safer to overwrite or check)
                .where(eq(students.id, studentId))
                .returning();

            // AUDIT LOG
            await db.insert(auditLogs).values({
                userId,
                userName,
                action: 'update',
                entityType: 'student',
                entityId: studentId,
                entityName: updated[0].name,
                details: { changes: Object.keys(data) },
                ipAddress: req.ip
            });

            res.json(updated[0]);
        } catch (error: any) {
            console.error("Update student error:", error);
            res.status(500).json({ message: "Failed to update student: " + error.message });
        }
    });

    app.delete("/api/students/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const userId = req.user!.id;
            const userName = req.user!.name;
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

            // AUDIT LOG
            await db.insert(auditLogs).values({
                userId,
                userName,
                action: 'delete', // Soft delete
                entityType: 'student',
                entityId: studentId,
                entityName: existing[0].name,
                details: { type: 'soft_delete' },
                ipAddress: req.ip
            });

            res.json({ message: "Student deleted successfully" });
        } catch (error: any) {
            console.error("Delete student error:", error);
            res.status(500).json({ message: "Failed to delete student: " + error.message });
        }
    });

    app.delete("/api/students", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            const userId = req.user!.id;
            const userName = req.user!.name;

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

            // AUDIT LOG
            await db.insert(auditLogs).values({
                userId,
                userName,
                action: 'delete_batch',
                entityType: 'student',
                entityId: 0, // 0 for batch
                entityName: 'Batch Students',
                details: { count: ids.length, ids },
                ipAddress: req.ip
            });

            res.json({ message: "Students deleted successfully" });
        } catch (error: any) {
            console.error("Batch delete students error:", error);
            res.status(500).json({ message: "Failed to delete students: " + error.message });
        }
    });

    app.post("/api/students/batch", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { students: newStudents } = req.body;
            if (!Array.isArray(newStudents) || newStudents.length === 0) {
                return res.status(400).json({ message: "No students provided" });
            }

            // Using onConflictDoNothing to skip duplicates gracefully
            const created = await db.insert(students).values(newStudents.map((s: any) => ({
                indexNumber: s.indexNumber,
                name: s.name,
                classLevel: s.classLevel,
                stream: s.stream,
                gender: s.gender,
                parentName: s.parentName,
                parentContact: s.parentContact,
                dateOfBirth: s.dateOfBirth,
                nationality: s.nationality,
                religion: s.religion,
                photoBase64: s.photoBase64,
                admissionDate: s.admissionDate,
                admissionNumber: s.admissionNumber,
                previousSchool: s.previousSchool,
                boardingStatus: s.boardingStatus,
                houseOrDormitory: s.houseOrDormitory,
                medicalInfo: s.medicalInfo,
                emergencyContacts: s.emergencyContacts,
                specialCases: s.specialCases,
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

    app.post("/api/students/promote", requireAdmin, async (req, res) => {
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



    // --- School Management Extensions ---

    app.post("/api/schools", requireAdmin, async (req, res) => {
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

    app.put("/api/schools/:id", requireAdmin, async (req, res) => {
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

    app.delete("/api/schools/:id", requireAdmin, async (req, res) => {
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

    app.post("/api/teachers", requireAdmin, async (req, res) => {
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

    app.put("/api/teachers/:id", requireAdmin, async (req, res) => {
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

    app.delete("/api/teachers/:id", requireAdmin, async (req, res) => {
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

    app.post("/api/teachers/batch", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { teachers: newTeachers } = req.body;
            if (!Array.isArray(newTeachers) || newTeachers.length === 0) {
                return res.status(400).json({ message: "No teachers provided" });
            }

            const created = await db.insert(teachers).values(newTeachers.map((t: any) => ({
                name: t.name,
                gender: t.gender,
                phone: t.phone,
                email: t.email,
                employeeId: t.employeeId,
                roles: t.roles,
                assignedClass: t.assignedClass,
                assignedStream: t.assignedStream,
                subjects: t.subjects,
                teachingClasses: t.teachingClasses,
                qualifications: t.qualifications,
                dateJoined: t.dateJoined,
                initials: t.initials,
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

    app.post("/api/marks", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, term, year, type } = req.body;

            // Security Check: Ensure student belongs to this school
            const studentCheck = await db.select({ id: students.id }).from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);

            if (studentCheck.length === 0) {
                return res.status(403).json({ message: "Student does not belong to the active school" });
            }

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

    app.post("/api/marks/batch", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { marks: marksToSave } = req.body;
            if (!Array.isArray(marksToSave) || marksToSave.length === 0) {
                return res.status(400).json({ message: "No marks provided" });
            }

            // Security Check: Verify all students belong to school
            const studentIds = [...new Set(marksToSave.map((m: any) => m.studentId))];
            const validStudents = await db.select({ id: students.id }).from(students)
                .where(and(
                    inArray(students.id, studentIds),
                    eq(students.schoolId, schoolId)
                ));

            if (validStudents.length !== studentIds.length) {
                return res.status(403).json({ message: "One or more students do not belong to the active school" });
            }

            const results = [];
            for (const mark of marksToSave) {
                const { studentId, term, year, type } = mark;

                const existing = await db.select().from(marks)
                    .where(and(
                        eq(marks.studentId, studentId),
                        eq(marks.term, term),
                        eq(marks.year, year),
                        eq(marks.type, type)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    const updated = await db.update(marks)
                        .set({ ...mark, schoolId }) // Validated studentId ownership above
                        .where(eq(marks.id, existing[0].id))
                        .returning();
                    results.push(updated[0]);
                } else {
                    const newMark = await db.insert(marks).values({
                        studentId: mark.studentId,
                        term: mark.term,
                        year: mark.year,
                        type: mark.type,
                        marks: mark.marks,
                        comment: mark.comment,
                        status: mark.status,
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

    app.delete("/api/marks/batch", requireStaff, async (req, res) => {
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
            const paymentsCountRes = await db.select({ count: sql<number>`count(*)` }).from(feePayments).where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)));
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

            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

            const conditions = [eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)];

            const [countResult] = await db.select({ count: sql<number>`count(*)` })
                .from(feePayments)
                .where(and(...conditions));

            const payments = await db.select().from(feePayments)
                .where(and(...conditions))
                .orderBy(desc(feePayments.createdAt))
                .limit(limit)
                .offset(offset);

            res.json({ data: payments, total: Number(countResult.count), limit, offset });
        } catch (error: any) {
            console.error("Fee payments error:", error);
            res.status(500).json({ message: "Failed to fetch fee payments: " + error.message });
        }
    });

    // Get fee payments for a specific student (used by FeePaymentHistory component)
    app.get("/api/fee-payments/student/:studentId", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const studentId = parseInt(req.params.studentId);
            if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

            const payments = await db.select().from(feePayments)
                .where(and(
                    eq(feePayments.schoolId, schoolId),
                    eq(feePayments.studentId, studentId),
                    eq(feePayments.isDeleted, false)
                ))
                .orderBy(desc(feePayments.createdAt));
            res.json(payments);
        } catch (error: any) {
            console.error("Student fee payments error:", error);
            res.status(500).json({ message: "Failed to fetch student payments" });
        }
    });

    app.post("/api/fee-payments", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { studentId, feeType, amountPaid, term, year, paymentMethod, receiptNumber, notes } = req.body;

            // Input validation
            if (!studentId || !feeType || !term || !year) {
                return res.status(400).json({ message: "studentId, feeType, term, and year are required" });
            }
            const paidAmount = Number(amountPaid);
            if (isNaN(paidAmount) || paidAmount <= 0) {
                return res.status(400).json({ message: "amountPaid must be a positive number" });
            }
            const termNum = Number(term);
            const yearNum = Number(year);
            if (termNum < 1 || termNum > 3) {
                return res.status(400).json({ message: "Term must be 1, 2, or 3" });
            }
            if (yearNum < 2020 || yearNum > 2100) {
                return res.status(400).json({ message: "Year must be between 2020 and 2100" });
            }
            // Validate payment method (cash-only for now)
            const validMethods = ['Cash', 'Bank Deposit', 'Cheque'];
            const method = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';

            // Security Check: Ensure student belongs to this school
            const studentCheck = await db.select({ id: students.id }).from(students)
                .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
                .limit(1);

            if (studentCheck.length === 0) {
                return res.status(403).json({ message: "Student does not belong to the active school" });
            }

            const today = new Date().toISOString().split('T')[0];

            // Wrap all writes in a transaction for atomicity
            const result = await db.transaction(async (tx) => {
                // Generate sequential receipt number inside transaction for uniqueness
                let finalReceiptNumber = receiptNumber;
                if (!finalReceiptNumber) {
                    const lastReceipt = await tx.select({ receiptNumber: feePayments.receiptNumber })
                        .from(feePayments)
                        .where(and(
                            eq(feePayments.schoolId, schoolId),
                            sql`${feePayments.receiptNumber} LIKE ${'REC-' + yearNum + '-%'}`
                        ))
                        .orderBy(desc(feePayments.id))
                        .limit(1);

                    let nextNum = 1;
                    if (lastReceipt[0]?.receiptNumber) {
                        const parts = lastReceipt[0].receiptNumber.split('-');
                        const lastNum = parseInt(parts[parts.length - 1]);
                        if (!isNaN(lastNum)) nextNum = lastNum + 1;
                    }
                    finalReceiptNumber = `REC-${yearNum}-${nextNum.toString().padStart(4, '0')}`;
                }
                // Look up the matching invoice to get the real amountDue
                const matchingInvoice = await tx.select().from(invoices)
                    .where(and(
                        eq(invoices.schoolId, schoolId),
                        eq(invoices.studentId, studentId),
                        eq(invoices.term, termNum),
                        eq(invoices.year, yearNum)
                    )).limit(1);

                const invoice = matchingInvoice[0];
                const serverAmountDue = invoice ? invoice.balance : 0;

                // Reject overpayment if an invoice exists and payment exceeds balance
                if (invoice && paidAmount > invoice.balance && invoice.balance > 0) {
                    throw new Error(`OVERPAYMENT: Amount (${paidAmount}) exceeds invoice balance (${invoice.balance})`);
                }

                const balance = Math.max(0, serverAmountDue - paidAmount);
                const status = balance <= 0 ? 'paid' : 'partial';

                // 1. Insert fee payment record
                const [newPayment] = await tx.insert(feePayments).values({
                    schoolId,
                    studentId,
                    feeType,
                    amountDue: serverAmountDue,
                    amountPaid: paidAmount,
                    balance,
                    term: termNum,
                    year: yearNum,
                    paymentDate: today,
                    paymentMethod: method,
                    receiptNumber: finalReceiptNumber,
                    status,
                    notes,
                    receivedBy: req.user?.id?.toString()
                }).returning();

                // 2. Record transaction in Ledger (Credit)
                await tx.insert(financeTransactions).values({
                    schoolId,
                    studentId,
                    transactionType: 'credit',
                    amount: paidAmount,
                    description: `Payment - ${feeType} (T${termNum}/${yearNum}) - ${finalReceiptNumber}`,
                    term: termNum,
                    year: yearNum,
                    transactionDate: today
                });

                // 3. Update the matching invoice balance atomically
                if (invoice) {
                    await tx.update(invoices)
                        .set({
                            amountPaid: sql`${invoices.amountPaid} + ${paidAmount}`,
                            balance: sql`GREATEST(0, ${invoices.totalAmount} - (${invoices.amountPaid} + ${paidAmount}))`,
                            status: sql`CASE WHEN (${invoices.amountPaid} + ${paidAmount}) >= ${invoices.totalAmount} THEN 'paid' ELSE 'partial' END`,
                            updatedAt: new Date()
                        })
                        .where(eq(invoices.id, invoice.id));
                }

                return newPayment;
            });

            res.json(result);
        } catch (error: any) {
            console.error("Create fee payment error:", error);
            if (error.message?.startsWith('OVERPAYMENT:')) {
                return res.status(400).json({ message: error.message.replace('OVERPAYMENT: ', '') });
            }
            res.status(500).json({ message: "Failed to create fee payment" });
        }
    });

    app.get("/api/expenses", requireAuth, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

            const conditions = [eq(expenses.schoolId, schoolId)];

            const [countResult] = await db.select({ count: sql<number>`count(*)` })
                .from(expenses)
                .where(and(...conditions));

            const expenseRecords = await db.select().from(expenses)
                .where(and(...conditions))
                .orderBy(desc(expenses.expenseDate))
                .limit(limit)
                .offset(offset);

            res.json({ data: expenseRecords, total: Number(countResult.count), limit, offset });
        } catch (error: any) {
            console.error("Expenses error:", error);
            res.status(500).json({ message: "Failed to fetch expenses: " + error.message });
        }
    });

    app.post("/api/expenses", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { amount, description, categoryId, expenseDate, referenceNumber, vendor, paymentMethod } = req.body;

            // Input validation
            const expAmount = Number(amount);
            if (isNaN(expAmount) || expAmount <= 0) {
                return res.status(400).json({ message: "Amount must be a positive number" });
            }
            if (!description || typeof description !== 'string' || description.trim().length === 0) {
                return res.status(400).json({ message: "Description is required" });
            }

            // Validate payment method (cash-only for now)
            const validMethods = ['Cash', 'Bank Deposit', 'Cheque'];
            const method = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';

            const newExpense = await db.insert(expenses).values({
                schoolId,
                amount: expAmount,
                description: description.trim(),
                categoryId: categoryId || null,
                expenseDate: expenseDate || new Date().toISOString().split('T')[0],
                referenceNumber,
                vendor,
                paymentMethod: method,
                createdBy: req.user?.id
            }).returning();

            res.json(newExpense[0]);
        } catch (error: any) {
            console.error("Create expense error:", error);
            res.status(500).json({ message: "Failed to create expense" });
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

    app.post("/api/expense-categories", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { name, color, description } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ message: "Category name is required" });
            }

            const newCategory = await db.insert(expenseCategories).values({
                schoolId,
                name: name.trim(),
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

    app.post("/api/fee-structures", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const { classLevel, feeType, amount, term, year, boardingStatus, description } = req.body;

            // Input validation
            const feeAmount = Number(amount);
            if (isNaN(feeAmount) || feeAmount < 0) return res.status(400).json({ message: "Amount must be a non-negative number" });
            if (!classLevel || !feeType) return res.status(400).json({ message: "classLevel and feeType are required" });
            if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });

            const newFee = await db.insert(feeStructures).values({
                schoolId,
                classLevel,
                feeType,
                amount: feeAmount,
                term: term || null,
                year: Number(year),
                boardingStatus: boardingStatus || 'all',
                description,
                isActive: true
            }).returning();

            res.json(newFee[0]);
        } catch (error: any) {
            console.error("Create fee structure error:", error);
            res.status(500).json({ message: "Failed to create fee structure" });
        }
    });

    app.delete("/api/fee-structures/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

            // Soft delete, scoped to school
            await db.update(feeStructures).set({ isActive: false })
                .where(and(eq(feeStructures.id, id), eq(feeStructures.schoolId, schoolId)));

            res.json({ message: "Fee structure deleted" });
        } catch (error: any) {
            console.error("Delete fee structure error:", error);
            res.status(500).json({ message: "Failed to delete fee structure" });
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

    app.post("/api/student-fee-overrides", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const { studentId, feeType, customAmount, term, year, reason } = req.body;

            // Input validation
            const amount = Number(customAmount);
            if (isNaN(amount) || amount < 0) return res.status(400).json({ message: "customAmount must be a non-negative number" });
            if (!feeType) return res.status(400).json({ message: "feeType is required" });
            if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });

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

    // Delete (deactivate) a student fee override
    app.delete("/api/student-fee-overrides/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid override ID" });

            const updated = await db.update(studentFeeOverrides)
                .set({ isActive: false, updatedAt: new Date() })
                .where(and(eq(studentFeeOverrides.id, id), eq(studentFeeOverrides.schoolId, schoolId)))
                .returning();

            if (updated.length === 0) return res.status(404).json({ message: "Override not found" });
            res.json({ message: "Override removed" });
        } catch (error: any) {
            console.error("Delete override error:", error);
            res.status(500).json({ message: "Failed to remove override" });
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

    app.post("/api/gate-attendance/check-in", requireStaff, async (req, res) => {
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

    app.post("/api/gate-attendance/check-out", requireStaff, async (req, res) => {
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

    app.post("/api/gate-attendance/mark-absent", requireStaff, async (req, res) => {
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

            // Default configurations if null in DB
            const defaultStreams = {
                P1: [], P2: [], P3: [], P4: [], P5: [], P6: [], P7: []
            };
            const defaultGrading = {
                grades: [
                    { grade: "D1", minScore: 90, maxScore: 100, points: 1 },
                    { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
                    { grade: "C3", minScore: 70, maxScore: 79, points: 3 },
                    { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
                    { grade: "C5", minScore: 55, maxScore: 59, points: 5 },
                    { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
                    { grade: "P7", minScore: 45, maxScore: 49, points: 7 },
                    { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
                    { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
                ],
                divisions: [
                    { division: "I", minAggregate: 4, maxAggregate: 12 },
                    { division: "II", minAggregate: 13, maxAggregate: 24 },
                    { division: "III", minAggregate: 25, maxAggregate: 28 },
                    { division: "IV", minAggregate: 29, maxAggregate: 32 },
                    { division: "U", minAggregate: 33, maxAggregate: 36 },
                ],
                passingMark: 40,
            };
            const defaultSubjects = {
                lowerPrimary: [
                    { name: "English", code: "english", isCompulsory: true },
                    { name: "Mathematics", code: "maths", isCompulsory: true },
                    { name: "Literacy 1", code: "literacy1", isCompulsory: true },
                    { name: "Literacy 2", code: "literacy2", isCompulsory: true },
                ],
                upperPrimary: [
                    { name: "English", code: "english", isCompulsory: true },
                    { name: "Mathematics", code: "maths", isCompulsory: true },
                    { name: "Science", code: "science", isCompulsory: true },
                    { name: "Social Studies", code: "sst", isCompulsory: true },
                ],
            };
            const defaultReport = {
                headteacherName: "",
                headteacherTitle: "Headteacher",
                showClassTeacherSignature: true,
                showHeadteacherSignature: true,
                showParentSignature: true,
                commentTemplates: [
                    "Excellent performance. Keep it up!",
                    "Good work. Continue improving.",
                    "Fair performance. More effort needed.",
                    "Needs improvement. Work harder next term.",
                    "Poor performance. Requires special attention.",
                ],
                conductOptions: ["Excellent", "Very Good", "Good", "Fair", "Needs Improvement"],
            };
            const defaultSecurity = {
                passwordMinLength: 8,
                passwordRequireUppercase: true,
                passwordRequireLowercase: true,
                passwordRequireNumbers: true,
                passwordRequireSpecialChars: false,
                passwordExpiryDays: 0,
                sessionTimeoutMinutes: 60,
                maxLoginAttempts: 5,
                lockoutDurationMinutes: 15,
                require2FA: false,
                allowedIPAddresses: [],
                enforceIPWhitelist: false,
            };
            const defaultIdCard = {
                showBloodGroup: true,
                showDob: true,
                showEmergencyContact: true,
                customTerms: [
                    "Property of the school",
                    "Carry at all times",
                    "Report loss immediately",
                    "Non-transferable"
                ],
                layout: 'single'
            };

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
                streams: school[0].streams || defaultStreams,
                gradingConfig: school[0].gradingConfig || defaultGrading,
                subjectsConfig: school[0].subjectsConfig || defaultSubjects,
                reportConfig: school[0].reportConfig || defaultReport,
                securityConfig: school[0].securityConfig || defaultSecurity,
                idCardConfig: school[0].idCardConfig || defaultIdCard,
                nextTermBeginBoarders: school[0].nextTermBeginBoarders || "",
                nextTermBeginDay: school[0].nextTermBeginDay || "",
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

            const result = insertSchoolSchema.partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { schoolName, addressBox, contactPhones, email, motto, regNumber, centreNumber,
                primaryColor, secondaryColor, logoBase64, currentTerm, currentYear,
                streams, gradingConfig, subjectsConfig, reportConfig, securityConfig, idCardConfig,
                nextTermBeginBoarders, nextTermBeginDay } = result.data as any; // Cast as any because some fields might be mapped differently or just use result.data

            // We need to map 'schoolName' back to 'name' if it came in as such, or schema handles it?
            // insertSchoolSchema uses 'name', but the route uses 'schoolName'.
            // Let's check schema. schools table has 'name'. 
            // If the frontend sends 'schoolName', Zod for 'schools' (insertSchoolSchema) will fail or ignore it if strict.
            // The route destructures 'schoolName' but DB column is 'name'.
            // I should respect the route's destructuring but validate what I can.
            // Actually, best to manually validation or adapt the body.
            // The frontend seems to send 'schoolName'.

            // Let's just validate specific fields we know match, or skip full schema if it mismatches too much.
            // But we want to improve validation. 
            // Let's map schoolName -> name for validation.

            const payload = { ...req.body };
            if (payload.schoolName) payload.name = payload.schoolName;

            const validation = insertSchoolSchema.partial().safeParse(payload);
            if (!validation.success) {
                return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
            }

            // Proceed with update using the original destructured logic to map correctly to DB
            // Or just use validation.data if it mapped correctly.

            const updated = await db.update(schools)
                .set({
                    name: schoolName, // from req.body or validated?
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
                    reportConfig,
                    securityConfig,
                    idCardConfig,
                    nextTermBeginBoarders,
                    nextTermBeginDay,
                    updatedAt: new Date(),
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

            const result = insertUserSchema.omit({ id: true, createdAt: true, updatedAt: true, isSuperAdmin: true, lastLogin: true, resetToken: true, resetTokenExpiry: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { username, password, name, role, email, phone } = result.data;

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
            const result = insertUserSchema.partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { name, role, email, phone } = result.data;

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
                    .set({ role: role as any })
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
    app.post("/api/boarding-roll-calls/bulk", requireStaff, async (req, res) => {
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

    app.post("/api/dormitories", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertDormitorySchema.omit({ id: true, schoolId: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const data = { ...result.data, schoolId };
            const newDorm = await db.insert(dormitories).values(data).returning();
            res.json(newDorm[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create dormitory: " + error.message });
        }
    });

    app.put("/api/dormitories/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const id = parseInt(req.params.id);

            const result = insertDormitorySchema.omit({ id: true, schoolId: true }).partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const updatedDorm = await db.update(dormitories)
                .set(result.data)
                .where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId)))
                .returning();

            if (updatedDorm.length === 0) return res.status(404).json({ message: "Dormitory not found" });
            res.json(updatedDorm[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to update dormitory: " + error.message });
        }
    });

    app.delete("/api/dormitories/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const id = parseInt(req.params.id);

            const deleted = await db.delete(dormitories)
                .where(and(eq(dormitories.id, id), eq(dormitories.schoolId, schoolId)))
                .returning();

            if (deleted.length === 0) return res.status(404).json({ message: "Dormitory not found" });
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

    app.post("/api/beds", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertBedSchema.omit({ id: true, schoolId: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const data = { ...result.data, schoolId, status: 'vacant' }; // Default status
            const newBed = await db.insert(beds).values(data).returning();
            res.json(newBed[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create bed: " + error.message });
        }
    });

    // Bulk Create Beds
    app.post("/api/beds/bulk", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const bulkBedSchema = z.object({
                dormitoryId: z.number(),
                startNumber: z.union([z.string(), z.number()]),
                count: z.number().int().positive(),
                type: z.enum(['single', 'double', 'triple'])
            });

            const result = bulkBedSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { dormitoryId, startNumber, count, type } = result.data;


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

    app.post("/api/beds/:id/assign", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

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
                .where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId)))
                .returning();

            if (updatedBed.length === 0) return res.status(404).json({ message: "Bed not found" });

            // 2. Fetch dorm info to update student
            if (updatedBed[0]) {
                const dorm = await db.select().from(dormitories).where(eq(dormitories.id, updatedBed[0].dormitoryId));
                if (dorm[0]) {
                    // Also verify student belongs to school (optional but good)
                    await db.update(students)
                        .set({
                            boardingStatus: 'Boarder',
                            houseOrDormitory: dorm[0].name
                        })
                        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));
                }
            }

            res.json(updatedBed[0]);
        } catch (error: any) {
            console.error("Bes assignment error:", error);
            res.status(500).json({ message: "Failed to assign bed: " + error.message });
        }
    });

    app.post("/api/beds/:id/unassign", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const bedId = parseInt(req.params.id);

            // Get current student before unassigning
            const currentBed = await db.select().from(beds)
                .where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId)));

            if (currentBed.length === 0) return res.status(404).json({ message: "Bed not found" });

            if (currentBed[0] && currentBed[0].currentStudentId) {
                await db.update(students)
                    .set({ houseOrDormitory: null })
                    .where(and(eq(students.id, currentBed[0].currentStudentId), eq(students.schoolId, schoolId)));
            }

            const updatedBed = await db.update(beds)
                .set({ status: 'vacant', currentStudentId: null })
                .where(and(eq(beds.id, bedId), eq(beds.schoolId, schoolId)))
                .returning();

            res.json(updatedBed[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to unassign bed: " + error.message });
        }
    });

    app.delete("/api/beds/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const id = parseInt(req.params.id);
            const deleted = await db.delete(beds)
                .where(and(eq(beds.id, id), eq(beds.schoolId, schoolId)))
                .returning();

            if (deleted.length === 0) return res.status(404).json({ message: "Bed not found" });
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

    app.post("/api/boarding-roll-calls", requireStaff, async (req, res) => {
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

    app.post("/api/leave-requests", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertLeaveRequestSchema.omit({
                id: true, schoolId: true, approvedById: true, approvedAt: true,
                checkOutById: true, checkOutTime: true, checkInById: true, checkInTime: true,
                status: true
            }).safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const data = {
                ...result.data,
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

    app.put("/api/leave-requests/:id", requireStaff, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const data = req.body;

            // Validate update payload
            const result = insertLeaveRequestSchema.partial().safeParse(data);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const updates: any = { ...result.data };
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

    app.delete("/api/leave-requests/:id", requireAdmin, async (req, res) => {
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

    app.post("/api/visitor-logs", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertVisitorLogSchema.omit({ id: true, schoolId: true, checkOutTime: true, registeredById: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const data = {
                ...result.data,
                checkInTime: req.body.checkInTime || new Date().toLocaleTimeString(),
                schoolId,
                registeredById: req.user?.id
            };
            const newLog = await db.insert(visitorLogs).values(data).returning();
            res.json(newLog[0]);
        } catch (error: any) {
            res.status(500).json({ message: "Failed to create visitor log: " + error.message });
        }
    });

    app.put("/api/visitor-logs/:id/checkout", requireAdmin, async (req, res) => {
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

    app.delete("/api/visitor-logs/:id", requireAdmin, async (req, res) => {
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

    app.put("/api/boarding-settings", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertBoardingSettingsSchema.omit({ id: true, schoolId: true, updatedAt: true }).partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }
            const data = result.data;

            const existing = await db.select().from(boardingSettings).where(eq(boardingSettings.schoolId, schoolId)).limit(1);

            if (existing.length > 0) {
                const updated = await db.update(boardingSettings)
                    .set({ ...data, updatedAt: new Date() })
                    .where(eq(boardingSettings.id, existing[0].id))
                    .returning();
                res.json(updated[0]);
            } else {
                const created = await db.insert(boardingSettings)
                    .values({ ...data, schoolId })
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

    app.post("/api/schools", requireAdmin, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });

            const result = insertSchoolSchema.omit({ id: true, createdAt: true, updatedAt: true, isActive: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const [newSchool] = await db.insert(schools).values({
                ...result.data,
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

    app.put("/api/schools/:id", requireAdmin, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });
            const id = parseInt(req.params.id);

            const result = insertSchoolSchema.partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const [updated] = await db.update(schools).set({
                ...result.data,
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

    app.delete("/api/admin/schools/:id", requireSuperAdmin, async (req, res) => {
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
    // Create User (Admin)
    app.post("/api/admin/users", requireSuperAdmin, async (req, res) => {
        try {
            if (!(req.user as any)?.isSuperAdmin) return res.status(403).json({ message: "Forbidden" });

            // Extend user schema to include optional schoolId for assignment
            const schema = insertUserSchema.extend({
                schoolId: z.union([z.string(), z.number()]).optional(),
                role: z.string().optional(),
                isSuperAdmin: z.boolean().optional()
            });

            const result = schema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { username, password, name, role, isSuperAdmin, schoolId } = result.data;

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

            // Assign to school if schoolId provided
            if (schoolId) {
                const sid = typeof schoolId === 'string' ? parseInt(schoolId) : schoolId;
                // Check if school exists and is correct?
                const schoolDef = await db.select().from(schools).where(eq(schools.id, sid));
                if (schoolDef[0]) {
                    await db.insert(userSchools).values({
                        userId: newUser.id,
                        schoolId: sid,
                        role: role === 'admin' ? 'admin' : 'teacher', // Map system role to school role
                        isPrimary: true
                    });
                }
            }

            res.json(newUser);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
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

    // ==================== NOTIFICATIONS ====================

    app.post("/api/notifications/subscribe", requireAuth, async (req, res) => {
        try {
            const subscription = req.body;
            // Check if exists
            const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
            if (existing.length === 0) {
                await db.insert(pushSubscriptions).values({
                    userId: (req.user as any).id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth
                });
            }
            res.status(201).json({ message: "Subscribed" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to subscribe: " + error.message });
        }
    });

    app.post("/api/notifications/test", requireAuth, async (req, res) => {
        try {
            await NotificationService.sendToUser((req.user as any).id, "Test Notification", "System check successful!");
            res.json({ message: "Test notification sent" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    // ==================== EVENT PROGRAMS ====================

    app.get("/api/events/:eventId/program", requireAuth, async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);
            const items = await db.select().from(programItems)
                .where(eq(programItems.eventId, eventId))
                .orderBy(asc(programItems.sortOrder));
            res.json(items);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.post("/api/events/:eventId/program", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const eventId = parseInt(req.params.eventId);

            // IDOR Check: Ensure event belongs to the school
            const event = await db.select().from(schoolEvents)
                .where(and(eq(schoolEvents.id, eventId), eq(schoolEvents.schoolId, schoolId)))
                .limit(1);

            if (event.length === 0) {
                return res.status(404).json({ message: "Event not found or access denied" });
            }

            const result = insertProgramItemSchema.omit({ id: true, eventId: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { title, startTime, endTime, responsiblePerson, description } = result.data;

            const [newItem] = await db.insert(programItems).values({
                eventId,
                title,
                startTime,
                endTime,
                responsiblePerson,
                description,
                sortOrder: 0 // Logic to put at end?
            }).returning();

            res.json(newItem);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/program-items/:id", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const id = parseInt(req.params.id);

            // IDOR Check: Verify item belongs to an event in the school
            const item = await db.select({
                id: programItems.id,
                eventId: programItems.eventId,
                schoolId: schoolEvents.schoolId
            })
                .from(programItems)
                .innerJoin(schoolEvents, eq(programItems.eventId, schoolEvents.id))
                .where(eq(programItems.id, id))
                .limit(1);

            if (item.length === 0 || item[0].schoolId !== schoolId) {
                return res.status(404).json({ message: "Item not found or access denied" });
            }

            await db.delete(programItems).where(eq(programItems.id, id));
            res.json({ message: "Item deleted" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    app.put("/api/program-items/:id", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const id = parseInt(req.params.id);

            // IDOR Check: Verify item belongs to an event in the school
            const item = await db.select({
                id: programItems.id,
                eventId: programItems.eventId,
                schoolId: schoolEvents.schoolId
            })
                .from(programItems)
                .innerJoin(schoolEvents, eq(programItems.eventId, schoolEvents.id))
                .where(eq(programItems.id, id))
                .limit(1);

            if (item.length === 0 || item[0].schoolId !== schoolId) {
                return res.status(404).json({ message: "Item not found or access denied" });
            }

            const result = insertProgramItemSchema.partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }
            // Ensure eventId is not changed or if checks are needed
            // For now just update permitted fields

            const [updated] = await db.update(programItems).set(result.data).where(eq(programItems.id, id)).returning();
            res.json(updated);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });


    // ==================== P7 EXAM SETS ====================

    app.get("/api/p7-exam-sets", async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) {
                // Return empty if no school, or handle public access if needed (usually requires auth)
                // For safety/consistency with other routes:
                return res.json([]);
            }

            const sets = await db.select().from(p7ExamSets)
                .where(and(eq(p7ExamSets.schoolId, schoolId), eq(p7ExamSets.isActive, true)))
                .orderBy(desc(p7ExamSets.createdAt));
            res.json(sets);
        } catch (error: any) {
            console.error("Fetch P7 sets error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.post("/api/p7-exam-sets", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const result = insertP7ExamSetSchema.omit({ id: true, schoolId: true }).safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
            }

            const { setNumber, name, stream, term, year, examDate, maxMarks, isActive } = result.data;
            // Additional manual check if needed, but schema covers types

            const [newSet] = await db.insert(p7ExamSets).values({
                schoolId,
                setNumber,
                name,
                stream,
                term,
                year,
                examDate,
                maxMarks,
                isActive: isActive !== undefined ? isActive : true
            }).returning();

            res.status(201).json(newSet);
        } catch (error: any) {
            console.error("Create P7 set error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/p7-exam-sets/:id", requireAdmin, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });
            const id = parseInt(req.params.id);

            const deleted = await db.delete(p7ExamSets)
                .where(and(eq(p7ExamSets.id, id), eq(p7ExamSets.schoolId, schoolId)))
                .returning();

            if (deleted.length === 0) return res.status(404).json({ message: "Exam set not found" });
            res.json({ message: "Exam set deleted" });
        } catch (error: any) {
            console.error("Delete P7 set error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ==================== P7 SCORES ====================

    // Define schema locally since it might not be exported from shared/schema
    const insertP7ScoreSchema = createInsertSchema(p7Scores);

    app.get("/api/p7-scores", async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const examSetId = parseInt(req.query.examSetId as string);
            if (!examSetId) return res.status(400).json({ message: "Exam Set ID required" });

            // IDOR Check: Ensure exam set belongs to the school
            const examSet = await db.select().from(p7ExamSets)
                .where(and(eq(p7ExamSets.id, examSetId), eq(p7ExamSets.schoolId, schoolId)))
                .limit(1);

            if (examSet.length === 0) {
                return res.status(404).json({ message: "Exam set not found or access denied" });
            }

            const scores = await db.select().from(p7Scores)
                .where(eq(p7Scores.examSetId, examSetId));
            res.json(scores);
        } catch (error: any) {
            console.error("Fetch P7 scores error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    const batchScoreSchema = z.object({
        scores: z.array(insertP7ScoreSchema.omit({
            id: true, schoolId: true, createdAt: true, updatedAt: true
        }).extend({
            marks: z.union([z.number(), z.string(), z.null()]).optional(), // Handle potential string inputs or nulls
            studentId: z.number()
        }))
    });

    app.post("/api/p7-scores/batch", requireStaff, async (req, res) => {
        try {
            const schoolId = getActiveSchoolId(req);
            if (!schoolId) return res.status(400).json({ message: "No active school selected" });

            const validation = batchScoreSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
            }

            const { scores } = validation.data;
            if (scores.length === 0) return res.json({ message: "No scores to save", count: 0 });

            // Validate that all examSetIds belong to this school
            // Assuming all scores in a batch belong to the same exam set is a good optimization, 
            // but for safety let's check the distinct examSetIds
            const examSetIds = [...new Set(scores.map(s => s.examSetId).filter(id => id !== undefined && id !== null))];

            if (examSetIds.length > 0) {
                const validSets = await db.select({ id: p7ExamSets.id }).from(p7ExamSets)
                    .where(and(inArray(p7ExamSets.id, examSetIds as number[]), eq(p7ExamSets.schoolId, schoolId)));

                const validSetIds = new Set(validSets.map(s => s.id));
                const invalidSets = examSetIds.filter(id => !validSetIds.has(id as number));

                if (invalidSets.length > 0) {
                    return res.status(403).json({ message: "Access denied for one or more exam sets" });
                }
            }

            const results = [];
            for (const score of scores) {
                // Skip if examSetId is missing (schema allows it in partial/omit? No, we extended it but didn't make it optional? 
                // Wait, insertP7ScoreSchema has keys from table. If not null in table, it is required in schema.
                // We should probably enforce examSetId.
                if (!score.examSetId) continue;

                const { examSetId, studentId, marks, total, aggregate, division, position, comment, status } = score;

                // Check for existing score
                const existing = await db.select().from(p7Scores).where(
                    and(eq(p7Scores.examSetId, examSetId), eq(p7Scores.studentId, studentId))
                ).limit(1);

                const scoreData: any = {
                    schoolId,
                    examSetId,
                    studentId,
                    marks,
                    total: total ?? undefined,
                    aggregate: aggregate ?? undefined,
                    division: division ?? undefined,
                    position: position ?? undefined,
                    comment: comment ?? undefined,
                    status: status ?? undefined
                };

                if (existing.length > 0) {
                    const [updated] = await db.update(p7Scores)
                        .set(scoreData)
                        .where(eq(p7Scores.id, existing[0].id))
                        .returning();
                    results.push(updated);
                } else {
                    const [inserted] = await db.insert(p7Scores)
                        .values(scoreData)
                        .returning();
                    results.push(inserted);
                }
            }

            res.json({ message: "Scores saved", count: results.length });
        } catch (error: any) {
            console.error("Batch save P7 scores error:", error);
            res.status(500).json({ message: error.message });
        }
    });

}
