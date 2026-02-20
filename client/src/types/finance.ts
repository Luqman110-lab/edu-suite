import { FeePayment } from '../../types';

export interface Expense {
    id: number;
    amount: number;
    description: string;
    categoryId: number;
    expenseDate: string;
    vendorName?: string;
    receiptNumber?: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    approvedBy?: number;
}

export interface ExpenseCategory {
    id: number;
    name: string;
    color: string;
}

export interface FinancialSummary {
    totalRevenue: number;
    totalExpenses: number;
    totalOutstanding: number;
    totalDue: number;
    netIncome: number;
    collectionRate: number;
}

export type ReportType = 'fee-collection' | 'expense' | 'income-statement' | 'outstanding' | 'student-balances' | 'receipt';

export interface ReportConfig {
    schoolName: string;
    addressBox?: string;
    contactPhones?: string;
}

export interface FinancialReportFilters {
    term: number;
    year: number;
    classLevel: string;
    dateFrom?: string;
    dateTo?: string;
    paymentId?: number | null;
}

export interface Account {
    id: number;
    accountCode: string;
    accountName: string;
    accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    parentAccountId?: number;
    isActive: boolean;
}

export interface JournalLine {
    id: number;
    journalEntryId: number;
    accountId: number;
    studentId?: number;
    debit: number;
    credit: number;
    account?: Account;
}

export interface JournalEntry {
    id: number;
    entryDate: string;
    reference: string;
    description: string;
    status: 'draft' | 'posted' | 'reversed';
    lines?: JournalLine[];
}

export interface Budget {
    id: number;
    categoryId: number;
    term: number;
    year: number;
    amountAllocated: number;
    amountSpent: number;
    isLocked: boolean;
    category?: ExpenseCategory;
}

export interface PettyCashAccount {
    id: number;
    custodianId: number;
    floatAmount: number;
    currentBalance: number;
    isActive: boolean;
    custodian?: { name: string };
}
