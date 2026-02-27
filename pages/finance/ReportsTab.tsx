import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { Button } from '../../components/Button';
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download } from 'lucide-react';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface FeePayment {
    id: number;
    studentId: number;
    feeType: string;
    amountDue: number;
    amountPaid: number;
    term: number;
    year: number;
    status: string;
    paymentDate: string;
    paymentMethod: string;
}

interface Expense {
    id: number;
    amount: number;
    description: string;
    categoryId: number;
    expenseDate: string;
}

interface ExpenseCategory {
    id: number;
    name: string;
    color: string;
}

interface FinancialSummary {
    totalRevenue: number;
    totalExpenses: number;
    totalOutstanding: number;
    totalDue: number;
    netIncome: number;
    collectionRate: number;
}

const COLORS = ['#0052CC', '#00875A', '#FF5630', '#6554C0', '#FF991F', '#36B37E', '#00B8D9', '#EF4444'];

export default function ReportsTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const [filterClass, setFilterClass] = useState('All');
    const classLevels = ['All', 'N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

    const { data: summary } = useQuery<FinancialSummary>({
        queryKey: ['/api/financial-summary', term, year],
        queryFn: async () => {
            const res = await fetch('/api/financial-summary', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
    });

    const { data: payments = [] } = useQuery<FeePayment[]>({
        queryKey: ['/api/fee-payments', term, year],
        queryFn: async () => {
            const res = await fetch('/api/fee-payments?limit=500', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            return result.data || [];
        },
    });

    const { data: expenses = [] } = useQuery<Expense[]>({
        queryKey: ['/api/expenses', term, year],
        queryFn: async () => {
            const res = await fetch('/api/expenses?limit=500', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            return result.data || [];
        },
    });

    const { data: categories = [] } = useQuery<ExpenseCategory[]>({
        queryKey: ['/api/expense-categories'],
        queryFn: async () => {
            const res = await fetch('/api/expense-categories', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
    });

    // Revenue by fee type
    const revenueByFeeType = payments
        .filter(p => p.term === term && p.year === year)
        .reduce((acc, p) => {
            const existing = acc.find(x => x.name === p.feeType);
            if (existing) existing.value += p.amountPaid || 0;
            else acc.push({ name: p.feeType, value: p.amountPaid || 0 });
            return acc;
        }, [] as { name: string; value: number }[]);

    // Expenses by category
    const expensesByCategory = expenses.reduce((acc, e) => {
        const cat = categories.find(c => c.id === e.categoryId);
        const name = cat?.name || 'Uncategorized';
        const existing = acc.find(x => x.name === name);
        if (existing) existing.value += e.amount || 0;
        else acc.push({ name, value: e.amount || 0, color: cat?.color || '#6B7280' });
        return acc;
    }, [] as { name: string; value: number; color: string }[]);

    // Monthly revenue vs expenses trend
    const monthlyData = () => {
        const months: Record<string, { revenue: number; expenses: number }> = {};
        payments.forEach(p => {
            const key = `T${p.term} ${p.year}`;
            if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
            months[key].revenue += p.amountPaid || 0;
        });
        expenses.forEach(e => {
            const date = new Date(e.expenseDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
            months[key].expenses += e.amount || 0;
        });
        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-8)
            .map(([key, data]) => ({ name: key, ...data }));
    };

    const exportToCSV = (type: 'revenue' | 'expenses') => {
        let csvContent = '';
        let fileName = '';

        if (type === 'revenue') {
            const headers = ['Fee Type', 'Amount Collected'];
            const rows = revenueByFeeType.map(r => [r.name, r.value.toString()]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            fileName = `Revenue_by_FeeType_T${term}_${year}.csv`;
        } else {
            const headers = ['Category', 'Amount'];
            const rows = expensesByCategory.map(e => [e.name, e.value.toString()]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            fileName = `Expenses_by_Category_${year}.csv`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: 'Exported', description: `${fileName} downloaded` });
    };

    const generatePDFReport = () => {
        try {
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Financial Summary Report', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Term ${term}, ${year} | Generated: ${new Date().toLocaleDateString('en-UG')}`, 105, 28, { align: 'center' });

            let y = 45;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Summary', 14, y);
            y += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const summaryLines = [
                ['Total Revenue', `UGX ${(summary?.totalRevenue || 0).toLocaleString()}`],
                ['Total Expenses', `UGX ${(summary?.totalExpenses || 0).toLocaleString()}`],
                ['Outstanding', `UGX ${(summary?.totalOutstanding || 0).toLocaleString()}`],
                ['Net Income', `UGX ${(summary?.netIncome || 0).toLocaleString()}`],
                ['Collection Rate', `${summary?.collectionRate || 0}%`],
            ];
            summaryLines.forEach(([label, value]) => {
                doc.text(label, 20, y);
                doc.text(value, 120, y);
                y += 7;
            });

            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Revenue by Fee Type', 14, y);
            y += 8;
            doc.setFont('helvetica', 'normal');
            revenueByFeeType.forEach(r => {
                doc.text(r.name, 20, y);
                doc.text(`UGX ${r.value.toLocaleString()}`, 120, y);
                y += 7;
            });

            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Expenses by Category', 14, y);
            y += 8;
            doc.setFont('helvetica', 'normal');
            expensesByCategory.forEach(e => {
                doc.text(e.name, 20, y);
                doc.text(`UGX ${e.value.toLocaleString()}`, 120, y);
                y += 7;
            });

            doc.save(`Financial_Report_T${term}_${year}.pdf`);
            toast({ title: 'Success', description: 'PDF report downloaded' });
        } catch {
            toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Financial Reports</h3>
                    <p className={`text-sm ${textSecondary}`}>Visual analytics and exportable reports</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={generatePDFReport}>
                        <Download className="w-4 h-4 mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
                        <div className={`text-xs uppercase ${textSecondary}`}>Revenue</div>
                        <div className="text-lg font-bold text-green-500">{formatCurrency(summary.totalRevenue)}</div>
                    </div>
                    <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
                        <div className={`text-xs uppercase ${textSecondary}`}>Expenses</div>
                        <div className="text-lg font-bold text-red-500">{formatCurrency(summary.totalExpenses)}</div>
                    </div>
                    <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
                        <div className={`text-xs uppercase ${textSecondary}`}>Outstanding</div>
                        <div className="text-lg font-bold text-yellow-500">{formatCurrency(summary.totalOutstanding)}</div>
                    </div>
                    <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
                        <div className={`text-xs uppercase ${textSecondary}`}>Net Income</div>
                        <div className={`text-lg font-bold ${summary.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(summary.netIncome)}</div>
                    </div>
                    <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
                        <div className={`text-xs uppercase ${textSecondary}`}>Collection</div>
                        <div className="text-lg font-bold text-blue-500">{summary.collectionRate}%</div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Fee Type */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className={`font-semibold ${textPrimary}`}>Revenue by Fee Type (T{term}/{year})</h4>
                        <button onClick={() => exportToCSV('revenue')} className="text-blue-500 hover:text-blue-700 text-sm">
                            <Download className="w-4 h-4 inline mr-1" /> CSV
                        </button>
                    </div>
                    {revenueByFeeType.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={revenueByFeeType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                    {revenueByFeeType.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={`text-center py-8 ${textSecondary}`}>No payment data for this term</div>
                    )}
                </div>

                {/* Expenses by Category */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className={`font-semibold ${textPrimary}`}>Expenses by Category</h4>
                        <button onClick={() => exportToCSV('expenses')} className="text-blue-500 hover:text-blue-700 text-sm">
                            <Download className="w-4 h-4 inline mr-1" /> CSV
                        </button>
                    </div>
                    {expensesByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={expensesByCategory}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                                <XAxis dataKey="name" tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                                <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="value" fill="#0052CC" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={`text-center py-8 ${textSecondary}`}>No expense data</div>
                    )}
                </div>
            </div>

            {/* Revenue vs Expenses Trend */}
            <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                <h4 className={`font-semibold ${textPrimary} mb-4`}>Revenue vs Expenses Trend</h4>
                {monthlyData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                            <XAxis dataKey="name" tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                            <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#00875A" strokeWidth={2} name="Revenue" />
                            <Line type="monotone" dataKey="expenses" stroke="#FF5630" strokeWidth={2} name="Expenses" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className={`text-center py-8 ${textSecondary}`}>No trend data yet</div>
                )}
            </div>
        </div>
    );
}
