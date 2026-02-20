import { Router, Request } from "express";
import { accountingService } from "../services/AccountingService";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const accountingRoutes = Router();

// ==========================================
// CHART OF ACCOUNTS
// ==========================================

accountingRoutes.get("/accounts", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const accounts = await accountingService.getAccounts(schoolId);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Initialize default accounts manually (usually done on school create, but good to have)
accountingRoutes.post("/accounts/init", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        await accountingService.initializeDefaultAccounts(schoolId);
        res.json({ message: "Default accounts initialized" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.post("/accounts", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const account = await accountingService.createAccount(schoolId, req.body);
        res.json(account);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// JOURNAL ENTRIES
// ==========================================

accountingRoutes.get("/journals", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const results = await accountingService.getJournalEntries(schoolId, limit, offset);
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.post("/journals", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const userId = req.user!.id;
        const entry = await accountingService.createJournalEntry(schoolId, req.body, userId);
        res.json(entry);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// ==========================================
// REPORTS & LEDGERS
// ==========================================

accountingRoutes.get("/ledger", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

        const ledger = await accountingService.getGeneralLedger(schoolId, startDate, endDate, accountId);
        res.json(ledger);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.get("/trial-balance", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const tb = await accountingService.getTrialBalance(schoolId);
        res.json(tb);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// BUDGETS
// ==========================================

accountingRoutes.get("/budgets", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const term = parseInt(req.query.term as string);
        const year = parseInt(req.query.year as string);

        if (!term || !year) return res.status(400).json({ message: "Term and year are required" });

        const budgets = await accountingService.getBudgets(schoolId, term, year);
        res.json(budgets);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.post("/budgets", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const budget = await accountingService.setBudget(schoolId, req.body);
        res.json(budget);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// PETTY CASH
// ==========================================

accountingRoutes.get("/petty-cash", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const accounts = await accountingService.getPettyCashAccounts(schoolId);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.post("/petty-cash", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { custodianId, floatAmount } = req.body;
        const account = await accountingService.createPettyCashAccount(schoolId, custodianId, floatAmount);
        res.json(account);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

accountingRoutes.post("/petty-cash/:accountId/transaction", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req); // just for context/validation later
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const accountId = parseInt(param(req, 'accountId'));
        const txn = await accountingService.recordPettyCashTransaction(accountId, req.body, req.user!.id);
        res.json(txn);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});
