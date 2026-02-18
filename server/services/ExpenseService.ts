import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { expenses, expenseCategories } from "../../shared/schema";

export class ExpenseService {

    async getExpenses(schoolId: number, limit: number, offset: number) {
        const conditions = [eq(expenses.schoolId, schoolId)];
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(and(...conditions));
        const expenseRecords = await db.select().from(expenses).where(and(...conditions))
            .orderBy(desc(expenses.expenseDate)).limit(limit).offset(offset);

        return { data: expenseRecords, total: Number(countResult.count) };
    }

    async createExpense(schoolId: number, userId: number | undefined, data: any) {
        const { amount, description, categoryId, expenseDate, referenceNumber, vendor, paymentMethod } = data;
        const expAmount = Number(amount);

        const validMethods = ['Cash', 'Bank Deposit', 'Cheque'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';

        const newExpense = await db.insert(expenses).values({
            schoolId, amount: expAmount, description: description.trim(),
            categoryId: categoryId || null, expenseDate: expenseDate || new Date().toISOString().split('T')[0],
            referenceNumber, vendor, paymentMethod: method, createdBy: userId
        }).returning();

        return newExpense[0];
    }

    async getExpenseCategories(schoolId: number) {
        return await db.select().from(expenseCategories)
            .where(and(eq(expenseCategories.schoolId, schoolId), eq(expenseCategories.isActive, true)));
    }

    async createExpenseCategory(schoolId: number, data: any) {
        const { name, color, description } = data;
        const newCategory = await db.insert(expenseCategories).values({
            schoolId, name: name.trim(), color: color || '#6554C0', description, isActive: true
        }).returning();

        return newCategory[0];
    }
}

export const expenseService = new ExpenseService();
