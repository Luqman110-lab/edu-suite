import { Router, Request } from "express";
import { feeService } from "../services/FeeService";
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

        const fees = await feeService.getFeeStructures(schoolId);
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
        const { classLevel, feeType, amount, term, year } = req.body;

        const feeAmount = Number(amount);
        if (isNaN(feeAmount) || feeAmount < 0) return res.status(400).json({ message: "Amount must be a non-negative number" });
        if (!classLevel || !feeType) return res.status(400).json({ message: "classLevel and feeType are required" });
        if (!year || Number(year) < 2020) return res.status(400).json({ message: "Valid year is required" });

        const newFee = await feeService.createFeeStructure(schoolId, { ...req.body, amount: feeAmount, year: Number(year) });
        res.json(newFee);
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

        const updated = await feeService.updateFeeStructure(id, schoolId, req.body);
        if (!updated) return res.status(404).json({ message: "Fee structure not found" });
        res.json(updated);
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

        await feeService.deleteFeeStructure(id, schoolId);
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

        const result = await feeService.getFeePayments(schoolId, limit, offset);
        res.json({ ...result, limit, offset });
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

        const payments = await feeService.getStudentPayments(studentId, schoolId);
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

        const { studentId, feeType, amountPaid, term, year } = req.body;
        if (!studentId || !feeType || !term || !year) return res.status(400).json({ message: "studentId, feeType, term, and year are required" });
        const paidAmount = Number(amountPaid);
        if (isNaN(paidAmount) || paidAmount <= 0) return res.status(400).json({ message: "amountPaid must be a positive number" });
        const termNum = Number(term);
        const yearNum = Number(year);
        if (termNum < 1 || termNum > 3) return res.status(400).json({ message: "Term must be 1, 2, or 3" });
        if (yearNum < 2020 || yearNum > 2100) return res.status(400).json({ message: "Year must be between 2020 and 2100" });

        const newPayment = await feeService.createFeePayment(schoolId, req.user!.id, req.body);
        res.json(newPayment);
    } catch (error: any) {
        console.error("Create fee payment error:", error);
        if (error.message?.startsWith('OVERPAYMENT:')) return res.status(400).json({ message: error.message.replace('OVERPAYMENT: ', '') });
        if (error.message === "Student does not belong to the active school") return res.status(403).json({ message: error.message });
        res.status(500).json({ message: "Failed to create fee payment" });
    }
});

// POST /api/fee-payments/:id/void
feesRoutes.post("/fee-payments/:id/void", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const paymentId = parseInt(param(req, 'id'));
        if (isNaN(paymentId)) return res.status(400).json({ message: "Invalid payment ID" });

        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: "Void reason is required" });

        await feeService.voidFeePayment(paymentId, schoolId, req.user!.id, reason);
        res.json({ message: "Payment voided successfully", success: true });
    } catch (error: any) {
        console.error("Void fee payment error:", error);
        if (error.message === "Payment not found" || error.message === "Payment is already voided") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to void fee payment" });
    }
});

// GET /api/financial-summary
feesRoutes.get("/financial-summary", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const summary = await feeService.getFinancialSummary(schoolId);
        res.json(summary);
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

        const transactions = await feeService.getStudentTransactions(studentId, schoolId);
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch transactions: " + error.message });
    }
});

// GET /api/invoices
feesRoutes.get("/invoices", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { studentId, term, year, status } = req.query;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const filters = {
            studentId: studentId ? parseInt(studentId as string) : undefined,
            term: term ? parseInt(term as string) : undefined,
            year: year ? parseInt(year as string) : undefined,
            status: status as string
        };

        const results = await feeService.getInvoices(schoolId, filters, limit, offset);
        res.json(results);
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

        const invoice = await feeService.getInvoiceById(invoiceId, schoolId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        res.json(invoice);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch invoice: " + error.message });
    }
});

// POST /api/invoices/generate
feesRoutes.post("/invoices/generate", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { term, year } = req.body;
        if (!term || !year) return res.status(400).json({ message: "Term and year are required" });
        const termNum = Number(term);
        const yearNum = Number(year);
        if (termNum < 1 || termNum > 3) return res.status(400).json({ message: "Term must be 1, 2, or 3" });
        if (yearNum < 2020 || yearNum > 2100) return res.status(400).json({ message: "Year must be between 2020 and 2100" });

        const result = await feeService.generateInvoices(schoolId, req.body);
        res.json({ message: `Generated ${result.invoicesCreated} invoices, skipped ${result.invoicesSkipped} existing`, ...result });
    } catch (error: any) {
        console.error("Generate invoices error:", error);
        res.status(500).json({ message: "Failed to generate invoices: " + error.message });
    }
});

// PUT /api/invoices/:id
feesRoutes.put("/invoices/:id", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const invoiceId = parseInt(param(req, 'id'));
        if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });

        const updated = await feeService.updateInvoice(invoiceId, schoolId, req.body);
        if (!updated) return res.status(404).json({ message: "Invoice not found" });
        res.json(updated);
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

        const success = await feeService.sendInvoiceReminder(invoiceId, schoolId, req.body.type);
        if (!success) return res.status(404).json({ message: "Invoice not found" });

        res.json({ message: `${(req.body.type || 'sms').toUpperCase()} reminder sent successfully`, success: true });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to send reminder" });
    }
});

// POST /api/invoices/bulk-remind
feesRoutes.post("/invoices/bulk-remind", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const sentCount = await feeService.bulkSendReminders(schoolId, req.body.type, req.body.minBalance);
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

        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

        const result = await feeService.getDebtors(schoolId, req.query, limit, offset);
        res.json({ ...result, limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch debtors: " + error.message });
    }
});

// GET /api/finance/hub-stats
feesRoutes.get("/finance/hub-stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const term = req.query.term ? parseInt(req.query.term as string) : undefined;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;

        const stats = await feeService.getHubStats(schoolId, term, year);
        res.json(stats);
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

        const result = await feeService.getPaymentPlans(schoolId, limit, offset);
        res.json({ ...result, limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list plans" });
    }
});

// POST /api/payment-plans
feesRoutes.post("/payment-plans", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { totalAmount, downPayment, installmentCount, frequency, startDate } = req.body;

        const total = Number(totalAmount);
        const count = Number(installmentCount);
        if (isNaN(total) || total <= 0) return res.status(400).json({ message: "totalAmount must be a positive number" });
        if (!count || count < 1 || count > 36) return res.status(400).json({ message: "installmentCount must be between 1 and 36" });
        if (!startDate) return res.status(400).json({ message: "startDate is required" });
        if (!['weekly', 'monthly'].includes(frequency)) return res.status(400).json({ message: "frequency must be 'weekly' or 'monthly'" });

        const newPlan = await feeService.createPaymentPlan(schoolId, req.body);
        res.json(newPlan);
    } catch (error: any) {
        if (error.message === "Student does not belong to the active school") return res.status(403).json({ message: error.message });
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

        const plan = await feeService.getPaymentPlanById(id, schoolId);
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

        await feeService.payInstallment(planId, installmentId, payAmount, schoolId, req.user?.id);
        res.json({ message: "Payment recorded and ledger updated", success: true });
    } catch (error: any) {
        const msg = error.message;
        if (msg === "Installment not found" || msg === "Plan not found") return res.status(404).json({ message: msg });
        if (msg.startsWith("Amount exceeds remaining balance") || msg === "Access denied to payment plan from another school") return res.status(400).json({ message: msg });
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
