import { db } from "../db";
import { eq, and, desc, asc, sql, gt, or, isNull, inArray } from "drizzle-orm";
import {
    accounts, journalEntries, journalLines, budgets, expenseCategories, expenses,
    pettyCashAccounts, pettyCashTransactions, schools, users
} from "../../shared/schema";

export class AccountingService {
    // ==========================================
    // CHART OF ACCOUNTS
    // ==========================================

    async getAccounts(schoolId: number) {
        return await db.select().from(accounts).where(and(eq(accounts.schoolId, schoolId), eq(accounts.isActive, true))).orderBy(accounts.accountCode);
    }

    async createAccount(schoolId: number, data: any) {
        const [newAccount] = await db.insert(accounts).values({ ...data, schoolId }).returning();
        return newAccount;
    }

    // Initialize Default Chart of Accounts for a new school
    async initializeDefaultAccounts(schoolId: number) {
        const defaultAccounts = [
            { accountCode: '1000', accountName: 'Cash', accountType: 'Asset' as const },
            { accountCode: '1200', accountName: 'Accounts Receivable (Students)', accountType: 'Asset' as const },
            { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'Liability' as const },
            { accountCode: '3000', accountName: 'Retained Earnings', accountType: 'Equity' as const },
            { accountCode: '4000', accountName: 'Fee Income', accountType: 'Revenue' as const },
            { accountCode: '5000', accountName: 'General Expenses', accountType: 'Expense' as const },
        ];

        for (const acc of defaultAccounts) {
            const existing = await db.select().from(accounts).where(and(eq(accounts.schoolId, schoolId), eq(accounts.accountCode, acc.accountCode))).limit(1);
            if (existing.length === 0) {
                await db.insert(accounts).values({ ...acc, schoolId });
            }
        }
    }

    // ==========================================
    // JOURNAL ENTRIES
    // ==========================================

    async getJournalEntries(schoolId: number, limit: number, offset: number) {
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(journalEntries).where(eq(journalEntries.schoolId, schoolId));

        const entries = await db.query.journalEntries.findMany({
            where: eq(journalEntries.schoolId, schoolId),
            orderBy: [desc(journalEntries.entryDate), desc(journalEntries.createdAt)],
            limit,
            offset,
            with: {
                lines: { with: { account: true } },
                createdBy: { columns: { name: true } }
            }
        });

        return { data: entries, total: Number(countResult.count) };
    }

    async createJournalEntry(schoolId: number, data: any, userId: number) {
        const { entryDate, reference, description, lines } = data;

        // Validation
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            totalDebit += Number(line.debit) || 0;
            totalCredit += Number(line.credit) || 0;
        }

        if (totalDebit !== totalCredit) {
            throw new Error(`Debits (${totalDebit}) must equal Credits (${totalCredit})`);
        }
        if (totalDebit === 0) {
            throw new Error("Journal entry must have a non-zero amount");
        }

        const result = await db.transaction(async (tx) => {
            const [entry] = await tx.insert(journalEntries).values({
                schoolId, entryDate, reference, description, createdById: userId, status: 'posted'
            }).returning();

            for (const line of lines) {
                await tx.insert(journalLines).values({
                    journalEntryId: entry.id,
                    accountId: line.accountId,
                    studentId: line.studentId || null,
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0
                });
            }

            return entry;
        });

        return this.getJournalEntryById(result.id, schoolId);
    }

    async getJournalEntryById(id: number, schoolId: number) {
        return await db.query.journalEntries.findFirst({
            where: and(eq(journalEntries.id, id), eq(journalEntries.schoolId, schoolId)),
            with: { lines: { with: { account: true, student: { columns: { name: true } } } }, createdBy: { columns: { name: true } } }
        });
    }

    // ==========================================
    // LEDGER & REPORTS
    // ==========================================

    async getGeneralLedger(schoolId: number, startDate: string, endDate: string, accountId?: number) {
        // Query to get lines with their entry headers
        let conditions: any[] = [
            eq(journalEntries.schoolId, schoolId),
            eq(journalEntries.status, 'posted')
        ];

        if (startDate) conditions.push(gt(journalEntries.entryDate, startDate) || eq(journalEntries.entryDate, startDate));
        if (endDate) conditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);

        let lineConditions: any[] = [];
        if (accountId) lineConditions.push(eq(journalLines.accountId, accountId));

        const lines = await db.select({
            lineId: journalLines.id,
            debit: journalLines.debit,
            credit: journalLines.credit,
            accountId: journalLines.accountId,
            accountName: accounts.accountName,
            accountCode: accounts.accountCode,
            accountType: accounts.accountType,
            entryDate: journalEntries.entryDate,
            description: journalEntries.description,
            reference: journalEntries.reference
        })
            .from(journalLines)
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .where(and(...conditions, ...lineConditions))
            .orderBy(asc(accounts.accountCode), asc(journalEntries.entryDate));

        return lines;
    }

    async getTrialBalance(schoolId: number) {
        // Sum debits and credits per account for posted entries
        const balances = await db.select({
            accountId: accounts.id,
            accountCode: accounts.accountCode,
            accountName: accounts.accountName,
            accountType: accounts.accountType,
            totalDebit: sql<number>`COALESCE(SUM(${journalLines.debit}), 0)`,
            totalCredit: sql<number>`COALESCE(SUM(${journalLines.credit}), 0)`
        })
            .from(accounts)
            .leftJoin(journalLines, eq(accounts.id, journalLines.accountId))
            .leftJoin(journalEntries, and(
                eq(journalLines.journalEntryId, journalEntries.id),
                eq(journalEntries.schoolId, schoolId),
                eq(journalEntries.status, 'posted')
            ))
            .where(eq(accounts.schoolId, schoolId))
            .groupBy(accounts.id, accounts.accountCode, accounts.accountName, accounts.accountType)
            .orderBy(asc(accounts.accountCode));

        return balances.filter(b => Number(b.totalDebit) > 0 || Number(b.totalCredit) > 0);
    }

    // ==========================================
    // BUDGETS
    // ==========================================

    async getBudgets(schoolId: number, term: number, year: number) {
        const results = await db.select({
            id: budgets.id,
            schoolId: budgets.schoolId,
            categoryId: budgets.categoryId,
            term: budgets.term,
            year: budgets.year,
            amountAllocated: budgets.amountAllocated,
            amountSpent: budgets.amountSpent,
            isLocked: budgets.isLocked,
            notes: budgets.notes,
            category: expenseCategories
        })
            .from(budgets)
            .leftJoin(expenseCategories, eq(budgets.categoryId, expenseCategories.id))
            .where(
                and(
                    eq(budgets.schoolId, schoolId),
                    eq(budgets.term, term),
                    eq(budgets.year, year)
                )
            );
        return results;
    }

    async setBudget(schoolId: number, data: any) {
        const { categoryId, term, year, amountAllocated } = data;
        const existing = await db.select().from(budgets).where(and(
            eq(budgets.schoolId, schoolId), eq(budgets.categoryId, categoryId), eq(budgets.term, term), eq(budgets.year, year)
        )).limit(1);

        if (existing.length > 0) {
            const [updated] = await db.update(budgets).set({ amountAllocated, updatedAt: new Date() }).where(eq(budgets.id, existing[0].id)).returning();
            return updated;
        }

        const [newBudget] = await db.insert(budgets).values({
            schoolId, categoryId, term, year, amountAllocated
        }).returning();
        return newBudget;
    }

    // ==========================================
    // PETTY CASH
    // ==========================================

    async getPettyCashAccounts(schoolId: number) {
        const results = await db.select({
            id: pettyCashAccounts.id,
            schoolId: pettyCashAccounts.schoolId,
            custodianId: pettyCashAccounts.custodianId,
            floatAmount: pettyCashAccounts.floatAmount,
            currentBalance: pettyCashAccounts.currentBalance,
            isActive: pettyCashAccounts.isActive,
            custodian: {
                name: users.name
            }
        })
            .from(pettyCashAccounts)
            .leftJoin(users, eq(pettyCashAccounts.custodianId, users.id))
            .where(
                and(
                    eq(pettyCashAccounts.schoolId, schoolId),
                    eq(pettyCashAccounts.isActive, true)
                )
            );

        return results;
    }

    async createPettyCashAccount(schoolId: number, custodianId: number, floatAmount: number) {
        const [acc] = await db.insert(pettyCashAccounts).values({
            schoolId, custodianId, floatAmount, currentBalance: floatAmount
        }).returning();
        return acc;
    }

    async recordPettyCashTransaction(accountId: number, data: any, userId: number) {
        const { transactionType, amount, description, reference, transactionDate } = data;

        return await db.transaction(async (tx) => {
            const acc = await tx.query.pettyCashAccounts.findFirst({ where: eq(pettyCashAccounts.id, accountId) });
            if (!acc) throw new Error("Petty cash account not found");

            const numAmount = Number(amount);
            let newBalance = acc.currentBalance;

            if (transactionType === 'disburse') {
                if (numAmount > acc.currentBalance) throw new Error("Insufficient petty cash balance");
                newBalance -= numAmount;
            } else if (transactionType === 'replenish') {
                newBalance += numAmount;
                if (newBalance > acc.floatAmount) throw new Error("Replenishment exceeds float amount");
            }

            const [txn] = await tx.insert(pettyCashTransactions).values({
                accountId, transactionType, amount: numAmount, description, reference, transactionDate, createdById: userId
            }).returning();

            await tx.update(pettyCashAccounts).set({ currentBalance: newBalance, updatedAt: new Date() }).where(eq(pettyCashAccounts.id, accountId));

            return txn;
        });
    }
}

export const accountingService = new AccountingService();
