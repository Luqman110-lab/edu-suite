import { Router, Request } from "express";
import { expenseService } from "../services/ExpenseService";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

export const expensesRoutes = Router();

// GET /api/expenses
expensesRoutes.get("/", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

        const result = await expenseService.getExpenses(schoolId, limit, offset);
        res.json({ ...result, limit, offset });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch expenses: " + error.message });
    }
});

// POST /api/expenses
expensesRoutes.post("/", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const { amount, description } = req.body;

        if (isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ message: "Amount must be a positive number" });
        if (!description || typeof description !== 'string' || description.trim().length === 0) return res.status(400).json({ message: "Description is required" });

        const newExpense = await expenseService.createExpense(schoolId, req.user?.id, req.body);
        res.json(newExpense);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create expense" });
    }
});

// GET /api/expense-categories
expensesRoutes.get("/categories", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const categories = await expenseService.getExpenseCategories(schoolId);
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
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ message: "Category name is required" });

        const newCategory = await expenseService.createExpenseCategory(schoolId, req.body);
        res.json(newCategory);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create expense category: " + error.message });
    }
});
