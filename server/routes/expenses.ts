import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { expenses, expenseCategories } from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const expensesRoutes = Router();

// GET /api/expenses
expensesRoutes.get("/", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        const conditions = [eq(expenses.schoolId, schoolId)];
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(and(...conditions));
        const expenseRecords = await db.select().from(expenses).where(and(...conditions))
            .orderBy(desc(expenses.expenseDate)).limit(limit).offset(offset);
        res.json({ data: expenseRecords, total: Number(countResult.count), limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch expenses: " + error.message });
    }
});

// POST /api/expenses
expensesRoutes.post("/", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { amount, description, categoryId, expenseDate, referenceNumber, vendor, paymentMethod } = req.body;
        const expAmount = Number(amount);
        if (isNaN(expAmount) || expAmount <= 0) return res.status(400).json({ message: "Amount must be a positive number" });
        if (!description || typeof description !== 'string' || description.trim().length === 0) return res.status(400).json({ message: "Description is required" });
        const validMethods = ['Cash', 'Bank Deposit', 'Cheque'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';
        const newExpense = await db.insert(expenses).values({
            schoolId, amount: expAmount, description: description.trim(),
            categoryId: categoryId || null, expenseDate: expenseDate || new Date().toISOString().split('T')[0],
            referenceNumber, vendor, paymentMethod: method, createdBy: req.user?.id
        }).returning();
        res.json(newExpense[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create expense" });
    }
});

// GET /api/expense-categories
expensesRoutes.get("/categories", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const categories = await db.select().from(expenseCategories)
            .where(and(eq(expenseCategories.schoolId, schoolId), eq(expenseCategories.isActive, true)));
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch expense categories: " + error.message });
    }
});

// POST /api/expense-categories
expensesRoutes.post("/categories", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { name, color, description } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ message: "Category name is required" });
        const newCategory = await db.insert(expenseCategories).values({
            schoolId, name: name.trim(), color: color || '#6554C0', description
        }).returning();
        res.json(newCategory[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create expense category: " + error.message });
    }
});
