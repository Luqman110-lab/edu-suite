import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { Button } from '../../components/Button';
import { Download, MessageSquare, Users } from 'lucide-react';

interface Debtor {
    id: number;
    studentId: number;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
    studentName: string;
    studentClass: string;
    studentStream: string;
    parentPhone: string;
    daysOverdue: number;
    agingCategory: string;
}

interface DebtorSummary {
    totalDebtors: number;
    totalOutstanding: number;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
}

export default function DebtorsTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const { data, isLoading } = useQuery<{ debtors: Debtor[]; summary: DebtorSummary }>({
        queryKey: ['/api/finance/debtors-tab', term, year],
        queryFn: async () => {
            const res = await fetch(`/api/finance/debtors?term=${term}&year=${year}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch debtors');
            return res.json();
        },
    });

    const debtors = data?.debtors || [];
    const summary = data?.summary;

    const exportToCSV = () => {
        if (debtors.length === 0) {
            toast({ title: 'No data', description: 'No debtors to export', variant: 'destructive' });
            return;
        }

        const headers = ['Student Name', 'Class', 'Stream', 'Parent Phone', 'Balance (UGX)', 'Days Overdue', 'Aging Category'];
        const rows = debtors.map(d => [
            d.studentName || '',
            d.studentClass || '',
            d.studentStream || '',
            d.parentPhone || '',
            d.balance.toString(),
            d.daysOverdue.toString(),
            d.agingCategory === 'current' ? 'Current' : `${d.agingCategory} days`,
        ]);

        rows.push([]);
        rows.push(['Summary']);
        rows.push(['Total Debtors', summary?.totalDebtors.toString() || '0']);
        rows.push(['Total Outstanding', summary?.totalOutstanding.toString() || '0']);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `debtors_report_term${term}_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: 'Success', description: `Exported ${debtors.length} debtors to CSV` });
    };

    const sendReminder = async (invoiceId: number) => {
        try {
            await apiRequest('POST', `/api/invoices/${invoiceId}/remind`, { type: 'sms' });
            toast({ title: 'Reminder Sent', description: 'SMS reminder has been queued.' });
        } catch {
            toast({ title: 'Failed to send reminder', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    const agingCards = summary ? [
        { label: 'Current', value: summary.current, color: 'text-green-600' },
        { label: '1-30 Days', value: summary.days1to30, color: 'text-blue-600' },
        { label: '31-60 Days', value: summary.days31to60, color: 'text-yellow-600' },
        { label: '61-90 Days', value: summary.days61to90, color: 'text-orange-600' },
        { label: '90+ Days', value: summary.days90plus, color: 'text-red-600' },
    ] : [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Debtors</h3>
                <Button onClick={exportToCSV} variant="outline" size="sm" disabled={debtors.length === 0}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
            </div>

            {/* Aging Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {agingCards.map(card => (
                        <div key={card.label} className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                            <div className="text-xs text-gray-500">{card.label}</div>
                            <div className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</div>
                        </div>
                    ))}
                </div>
            )}

            {debtors.length === 0 ? (
                <div className={`${bgCard} rounded-xl p-12 border ${borderColor} text-center`}>
                    <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No outstanding balances</h3>
                    <p className={textSecondary}>All invoices have been fully paid</p>
                </div>
            ) : (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                <tr>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Student</th>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Class</th>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Parent Phone</th>
                                    <th className={`px-4 py-3 text-right text-xs font-medium ${textSecondary} uppercase`}>Balance</th>
                                    <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Days Overdue</th>
                                    <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Status</th>
                                    <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {debtors.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className={`px-4 py-3 text-sm font-medium ${textPrimary}`}>{d.studentName}</td>
                                        <td className={`px-4 py-3 text-sm ${textSecondary}`}>{d.studentClass} {d.studentStream}</td>
                                        <td className={`px-4 py-3 text-sm ${textSecondary}`}>{d.parentPhone || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{formatCurrency(d.balance)}</td>
                                        <td className={`px-4 py-3 text-sm text-center ${textPrimary}`}>{d.daysOverdue}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                d.agingCategory === 'current' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : d.agingCategory === '1-30' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : d.agingCategory === '31-60' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : d.agingCategory === '61-90' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {d.agingCategory === 'current' ? 'Current' : `${d.agingCategory} days`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => sendReminder(d.id)}
                                                className="text-green-500 hover:text-green-700"
                                                title="Send SMS Reminder"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
