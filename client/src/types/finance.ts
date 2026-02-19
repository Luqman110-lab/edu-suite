import { FeePayment } from '../../types';

export interface Expense {
    id: number;
    amount: number;
    description: string;
    categoryId: number;
    expenseDate: string;
    vendorName?: string;
    receiptNumber?: string;
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
