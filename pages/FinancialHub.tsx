import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { lazy, Suspense } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Lazy load finance sub-modules
const FeeStructuresContent = lazy(() => import('./FeeStructures'));
const RecordPaymentContent = lazy(() => import('./RecordPayment'));
const ExpensesContent = lazy(() => import('./Expenses'));
const ScholarshipsContent = lazy(() => import('./Scholarships'));
const FinancialReportsContent = lazy(() => import('./FinancialReports'));
const PaymentPlansContent = lazy(() => import('./PaymentPlans'));

declare const jspdf: any;

interface HubStats {
    totalDue: number;
    totalCollected: number;
    totalOutstanding: number;
    totalExpenses: number;
    netIncome: number;
    collectionRate: number;
    invoiceCount: number;
}

interface Invoice {
    id: number;
    studentId: number;
    invoiceNumber: string;
    term: number;
    year: number;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    dueDate: string | null;
    status: string;
    studentName: string;
    studentClass: string;
    studentStream: string;
    createdAt: string;
}

interface Debtor extends Invoice {
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

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
const STATUS_COLORS: Record<string, string> = {
    unpaid: '#EF4444',
    partial: '#F59E0B',
    paid: '#10B981',
    overdue: '#DC2626',
};

export default function FinancialHub() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'debtors' | 'structures' | 'payments' | 'plans' | 'expenses' | 'scholarships' | 'reports'>('overview');
    const [loading, setLoading] = useState(true);
    const [hubStats, setHubStats] = useState<HubStats | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [debtorSummary, setDebtorSummary] = useState<DebtorSummary | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedTerm, setSelectedTerm] = useState(1);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceItems, setInvoiceItems] = useState<{ feeType: string; description: string; amount: number }[]>([]);
    const [generateConfig, setGenerateConfig] = useState({
        term: 1,
        year: new Date().getFullYear(),
        dueDate: '',
        classLevel: '',
    });

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    useEffect(() => {
        fetchData();
    }, [selectedYear, selectedTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, invoicesRes, debtorsRes] = await Promise.all([
                fetch(`/api/finance/hub-stats?term=${selectedTerm}&year=${selectedYear}`),
                fetch(`/api/invoices?term=${selectedTerm}&year=${selectedYear}&limit=20`),
                fetch(`/api/finance/debtors?term=${selectedTerm}&year=${selectedYear}`),
            ]);

            if (statsRes.ok) {
                const stats = await statsRes.json();
                setHubStats(stats);
            }

            if (invoicesRes.ok) {
                const inv = await invoicesRes.json();
                setInvoices(inv);
            }

            if (debtorsRes.ok) {
                const data = await debtorsRes.json();
                setDebtors(data.debtors || []);
                setDebtorSummary(data.summary || null);
            }
        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleGenerateInvoices = async () => {
        setGenerating(true);
        try {
            const response = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generateConfig),
            });

            const result = await response.json();
            if (response.ok) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
                setShowGenerateModal(false);
                fetchData();
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to generate invoices',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    // View invoice details and items
    const viewInvoiceDetails = async (inv: Invoice) => {
        try {
            const response = await fetch(`/api/invoices/${inv.id}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedInvoice(inv);
                setInvoiceItems(data.items || []);
            }
        } catch (error) {
            console.error('Error fetching invoice details:', error);
        }
    };

    // Generate and download invoice PDF
    const downloadInvoicePDF = async (inv: Invoice) => {
        try {
            // Fetch invoice details with items
            const response = await fetch(`/api/invoices/${inv.id}`);
            if (!response.ok) throw new Error('Failed to fetch invoice');
            const data = await response.json();

            const { jsPDF } = jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(0, 82, 204);
            doc.text('INVOICE', 105, 20, { align: 'center' });

            // Invoice details
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Invoice #: ${inv.invoiceNumber}`, 20, 40);
            doc.text(`Date: ${new Date(inv.createdAt).toLocaleDateString()}`, 20, 46);
            doc.text(`Term: ${inv.term} | Year: ${inv.year}`, 20, 52);
            if (inv.dueDate) {
                doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 20, 58);
            }

            // Student details
            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text('Bill To:', 130, 40);
            doc.setFontSize(10);
            doc.text(inv.studentName || 'Student', 130, 46);
            doc.text(`Class: ${inv.studentClass} ${inv.studentStream || ''}`, 130, 52);

            // Line items table
            let y = 75;
            doc.setFillColor(240, 240, 240);
            doc.rect(20, y - 5, 170, 10, 'F');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Description', 22, y);
            doc.text('Amount', 170, y, { align: 'right' });

            y += 15;
            const items = data.items || [];
            for (const item of items) {
                doc.text(item.description || item.feeType, 22, y);
                doc.text(formatCurrency(item.amount), 170, y, { align: 'right' });
                y += 8;
            }

            // Totals
            y += 10;
            doc.line(120, y - 5, 190, y - 5);
            doc.text('Total Amount:', 120, y);
            doc.text(formatCurrency(inv.totalAmount), 170, y, { align: 'right' });

            y += 8;
            doc.text('Amount Paid:', 120, y);
            doc.setTextColor(0, 128, 0);
            doc.text(formatCurrency(inv.amountPaid), 170, y, { align: 'right' });

            y += 8;
            doc.setTextColor(200, 0, 0);
            doc.text('Balance Due:', 120, y);
            doc.text(formatCurrency(inv.balance), 170, y, { align: 'right' });

            // Status badge
            y += 15;
            doc.setFontSize(12);
            const statusColor = inv.status === 'paid' ? [0, 128, 0] : inv.status === 'partial' ? [245, 158, 11] : [239, 68, 68];
            doc.setTextColor(...statusColor);
            doc.text(`Status: ${inv.status.toUpperCase()}`, 105, y, { align: 'center' });

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('Thank you for your prompt payment.', 105, 280, { align: 'center' });

            doc.save(`${inv.invoiceNumber}.pdf`);

            toast({
                title: 'Success',
                description: `Invoice ${inv.invoiceNumber} downloaded`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to download invoice PDF',
                variant: 'destructive',
            });
        }
    };

    // Export debtors to Excel/CSV
    const exportDebtorsToExcel = () => {
        if (debtors.length === 0) {
            toast({
                title: 'No data',
                description: 'No debtors to export',
                variant: 'destructive',
            });
            return;
        }

        setExporting(true);

        try {
            // Create CSV content
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

            // Add summary row
            rows.push([]);
            rows.push(['Summary']);
            rows.push(['Total Debtors', debtorSummary?.totalDebtors.toString() || '0']);
            rows.push(['Total Outstanding', debtorSummary?.totalOutstanding.toString() || '0']);
            rows.push(['Current', debtorSummary?.current.toString() || '0']);
            rows.push(['1-30 Days', debtorSummary?.days1to30.toString() || '0']);
            rows.push(['31-60 Days', debtorSummary?.days31to60.toString() || '0']);
            rows.push(['61-90 Days', debtorSummary?.days61to90.toString() || '0']);
            rows.push(['90+ Days', debtorSummary?.days90plus.toString() || '0']);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `debtors_report_term${selectedTerm}_${selectedYear}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'Success',
                description: `Exported ${debtors.length} debtors to CSV`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to export debtors',
                variant: 'destructive',
            });
        } finally {
            setExporting(false);
        }
    };

    const agingChartData = debtorSummary ? [
        { name: 'Current', value: debtorSummary.current, color: '#10B981' },
        { name: '1-30 Days', value: debtorSummary.days1to30, color: '#3B82F6' },
        { name: '31-60 Days', value: debtorSummary.days31to60, color: '#F59E0B' },
        { name: '61-90 Days', value: debtorSummary.days61to90, color: '#EF4444' },
        { name: '90+ Days', value: debtorSummary.days90plus, color: '#DC2626' },
    ].filter(d => d.value > 0) : [];

    const sendReminder = async (invoiceId: number, type: 'sms' | 'email') => {
        try {
            await apiRequest('POST', `/api/invoices/${invoiceId}/remind`, { type });
            toast({
                title: "Reminder Sent",
                description: `${type.toUpperCase()} reminder has been queued/sent.`
            });
            // Refresh data
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to send reminder", variant: "destructive" });
        }
    };

    const renderOverviewTab = () => (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className={`text-sm font-medium ${textSecondary}`}>Total Due</div>
                    <div className={`text-2xl font-bold ${textPrimary} mt-1`}>
                        {formatCurrency(hubStats?.totalDue || 0)}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">{hubStats?.invoiceCount || 0} invoices</div>
                </div>

                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className={`text-sm font-medium ${textSecondary}`}>Collected</div>
                    <div className="text-2xl font-bold text-green-500 mt-1">
                        {formatCurrency(hubStats?.totalCollected || 0)}
                    </div>
                    <div className="text-xs text-green-500 mt-1">{hubStats?.collectionRate || 0}% collection rate</div>
                </div>

                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className={`text-sm font-medium ${textSecondary}`}>Outstanding</div>
                    <div className="text-2xl font-bold text-red-500 mt-1">
                        {formatCurrency(hubStats?.totalOutstanding || 0)}
                    </div>
                    <div className="text-xs text-red-500 mt-1">{debtorSummary?.totalDebtors || 0} debtors</div>
                </div>

                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <div className={`text-sm font-medium ${textSecondary}`}>Net Income</div>
                    <div className={`text-2xl font-bold mt-1 ${(hubStats?.netIncome || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(hubStats?.netIncome || 0)}
                    </div>
                    <div className={`text-xs ${textSecondary} mt-1`}>Expenses: {formatCurrency(hubStats?.totalExpenses || 0)}</div>
                </div>

                <div className={`${bgCard} rounded-xl p-6 border ${borderColor} bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10`}>
                    <div className={`text-sm font-bold text-yellow-700 dark:text-yellow-500 flex items-center gap-2`}>
                        📱 Mobile Money
                        <span className="bg-yellow-200 text-yellow-800 text-[10px] px-1.5 rounded-full">BETA</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                        {formatCurrency(0)}
                    </div>
                    <div className="text-xs text-yellow-600/80 mt-1">Wallet Balance (Mock)</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection Progress */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Collection Progress</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className={textSecondary}>Collection Rate</span>
                            <span className={textPrimary}>{hubStats?.collectionRate || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                            <div
                                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(hubStats?.collectionRate || 0, 100)}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-green-600 font-bold">{formatCurrency(hubStats?.totalCollected || 0)}</div>
                                <div className="text-xs text-green-600">Collected</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="text-red-600 font-bold">{formatCurrency(hubStats?.totalOutstanding || 0)}</div>
                                <div className="text-xs text-red-600">Pending</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aging Distribution */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Outstanding by Age</h3>
                    {agingChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={agingChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {agingChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-gray-500">
                            No outstanding balances
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setShowGenerateModal(true)} className="gap-2">
                        📄 Generate Invoices
                    </Button>
                    <Button onClick={() => navigate('/record-payment')} variant="outline" className="gap-2">
                        💳 Record Payment
                    </Button>
                    <Button onClick={() => navigate('/expenses')} variant="outline" className="gap-2">
                        📊 Manage Expenses
                    </Button>
                    <Button onClick={() => navigate('/financial-reports')} variant="outline" className="gap-2">
                        📈 Financial Reports
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderInvoicesTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Invoices</h3>
                <Button onClick={() => setShowGenerateModal(true)} size="sm">
                    + Generate Invoices
                </Button>
            </div>

            {invoices.length === 0 ? (
                <div className={`${bgCard} rounded-xl p-12 border ${borderColor} text-center`}>
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No invoices yet</h3>
                    <p className={`${textSecondary} mb-4`}>Generate invoices for students based on fee structures</p>
                    <Button onClick={() => setShowGenerateModal(true)}>Generate Invoices</Button>
                </div>
            ) : (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <tr>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Invoice #</th>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Student</th>
                                    <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Class</th>
                                    <th className={`px-4 py-3 text-right text-xs font-medium ${textSecondary} uppercase`}>Amount</th>
                                    <th className={`px-4 py-3 text-right text-xs font-medium ${textSecondary} uppercase`}>Paid</th>
                                    <th className={`px-4 py-3 text-right text-xs font-medium ${textSecondary} uppercase`}>Balance</th>
                                    <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Status</th>
                                    <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className={`px-4 py-3 text-sm font-medium ${textPrimary}`}>{inv.invoiceNumber}</td>
                                        <td className={`px-4 py-3 text-sm ${textPrimary}`}>{inv.studentName}</td>
                                        <td className={`px-4 py-3 text-sm ${textSecondary}`}>{inv.studentClass} {inv.studentStream}</td>
                                        <td className={`px-4 py-3 text-sm text-right ${textPrimary}`}>{formatCurrency(inv.totalAmount)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(inv.amountPaid)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(inv.balance)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className="px-2 py-1 text-xs rounded-full font-medium"
                                                style={{
                                                    backgroundColor: `${STATUS_COLORS[inv.status]}20`,
                                                    color: STATUS_COLORS[inv.status],
                                                }}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => downloadInvoicePDF(inv)}
                                                className="text-blue-500 hover:text-blue-700 text-sm font-medium mr-3"
                                                title="Download PDF"
                                            >
                                                📄 PDF
                                            </button>
                                            <button
                                                onClick={() => sendReminder(inv.id, 'sms')}
                                                className="text-green-500 hover:text-green-700 text-sm font-medium"
                                                title="Send SMS Reminder"
                                            >
                                                <MessageSquare className="w-4 h-4 inline" />
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

    const renderDebtorsTab = () => (
        <div className="space-y-4">
            {/* Export Button */}
            <div className="flex justify-end">
                <Button
                    onClick={exportDebtorsToExcel}
                    variant="outline"
                    size="sm"
                    disabled={exporting || debtors.length === 0}
                >
                    {exporting ? 'Exporting...' : '📥 Export to CSV'}
                </Button>
            </div>

            {/* Aging Summary Cards */}
            {debtorSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                        <div className="text-xs text-gray-500">Current</div>
                        <div className="text-lg font-bold text-green-600">{formatCurrency(debtorSummary.current)}</div>
                    </div>
                    <div className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                        <div className="text-xs text-gray-500">1-30 Days</div>
                        <div className="text-lg font-bold text-blue-600">{formatCurrency(debtorSummary.days1to30)}</div>
                    </div>
                    <div className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                        <div className="text-xs text-gray-500">31-60 Days</div>
                        <div className="text-lg font-bold text-yellow-600">{formatCurrency(debtorSummary.days31to60)}</div>
                    </div>
                    <div className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                        <div className="text-xs text-gray-500">61-90 Days</div>
                        <div className="text-lg font-bold text-orange-600">{formatCurrency(debtorSummary.days61to90)}</div>
                    </div>
                    <div className={`${bgCard} rounded-lg p-4 border ${borderColor}`}>
                        <div className="text-xs text-gray-500">90+ Days</div>
                        <div className="text-lg font-bold text-red-600">{formatCurrency(debtorSummary.days90plus)}</div>
                    </div>
                </div>
            )}

            {/* Debtors List */}
            {debtors.length === 0 ? (
                <div className={`${bgCard} rounded-xl p-12 border ${borderColor} text-center`}>
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No outstanding balances</h3>
                    <p className={textSecondary}>All invoices have been fully paid</p>
                </div>
            ) : (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full font-medium ${d.agingCategory === 'current' ? 'bg-green-100 text-green-700' :
                                                    d.agingCategory === '1-30' ? 'bg-blue-100 text-blue-700' :
                                                        d.agingCategory === '31-60' ? 'bg-yellow-100 text-yellow-700' :
                                                            d.agingCategory === '61-90' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {d.agingCategory === 'current' ? 'Current' : `${d.agingCategory} days`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => downloadInvoicePDF(d)}
                                                className="text-blue-500 hover:text-blue-700 text-sm font-medium mr-3"
                                                title="Download PDF"
                                            >
                                                📄
                                            </button>
                                            <button
                                                onClick={() => sendReminder(d.id, 'sms')}
                                                className="text-green-500 hover:text-green-700 text-sm font-medium"
                                                title="Send SMS Reminder"
                                            >
                                                <MessageSquare className="w-4 h-4 inline" />
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${textPrimary}`}>💰 Financial Hub</h1>
                    <p className={textSecondary}>Unified view of school finances</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                        className={`px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                    >
                        <option value={1}>Term 1</option>
                        <option value={2}>Term 2</option>
                        <option value={3}>Term 3</option>
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className={`px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {[
                    { key: 'overview', label: '📊 Overview' },
                    { key: 'invoices', label: '📄 Invoices' },
                    { key: 'debtors', label: '🔴 Debtors' },
                    { key: 'structures', label: '📋 Fee Structures' },
                    { key: 'payments', label: '💳 Payments' },
                    { key: 'plans', label: '📅 Payment Plans' },
                    { key: 'expenses', label: '💸 Expenses' },
                    { key: 'scholarships', label: '🎓 Scholarships' },
                    { key: 'reports', label: '📈 Reports' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.key
                            ? 'border-blue-500 text-blue-500'
                            : `border-transparent ${textSecondary} hover:text-blue-500`
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverviewTab()}
                    {activeTab === 'invoices' && renderInvoicesTab()}
                    {activeTab === 'debtors' && renderDebtorsTab()}
                    {activeTab === 'plans' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <PaymentPlansContent />
                        </Suspense>
                    )}
                    {activeTab === 'structures' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <FeeStructuresContent />
                        </Suspense>
                    )}
                    {activeTab === 'payments' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <RecordPaymentContent />
                        </Suspense>
                    )}
                    {activeTab === 'expenses' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <ExpensesContent />
                        </Suspense>
                    )}
                    {activeTab === 'scholarships' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <ScholarshipsContent />
                        </Suspense>
                    )}
                    {activeTab === 'reports' && (
                        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
                            <FinancialReportsContent />
                        </Suspense>
                    )}
                </>
            )}

            {/* Generate Invoice Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`${bgCard} rounded-xl p-6 w-full max-w-md mx-4`}>
                        <h2 className={`text-xl font-bold ${textPrimary} mb-4`}>Generate Invoices</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Term</label>
                                    <select
                                        value={generateConfig.term}
                                        onChange={(e) => setGenerateConfig({ ...generateConfig, term: parseInt(e.target.value) })}
                                        className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                                    >
                                        <option value={1}>Term 1</option>
                                        <option value={2}>Term 2</option>
                                        <option value={3}>Term 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Year</label>
                                    <select
                                        value={generateConfig.year}
                                        onChange={(e) => setGenerateConfig({ ...generateConfig, year: parseInt(e.target.value) })}
                                        className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Due Date (Optional)</label>
                                <input
                                    type="date"
                                    value={generateConfig.dueDate}
                                    onChange={(e) => setGenerateConfig({ ...generateConfig, dueDate: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Class (Optional - leave blank for all)</label>
                                <select
                                    value={generateConfig.classLevel}
                                    onChange={(e) => setGenerateConfig({ ...generateConfig, classLevel: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                                >
                                    <option value="">All Classes</option>
                                    {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => setShowGenerateModal(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={generating}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerateInvoices}
                                className="flex-1"
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
