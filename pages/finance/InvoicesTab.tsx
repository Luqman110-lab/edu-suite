import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { Button } from '../../components/Button';
import { FileText, MessageSquare, Download } from 'lucide-react';

declare const jspdf: any;

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

const STATUS_COLORS: Record<string, string> = {
    unpaid: '#EF4444',
    partial: '#F59E0B',
    paid: '#10B981',
    overdue: '#DC2626',
};

export default function InvoicesTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateConfig, setGenerateConfig] = useState({
        term,
        year,
        dueDate: '',
        classLevel: '',
    });

    const { data: invoices, isLoading } = useQuery<Invoice[]>({
        queryKey: ['/api/invoices', term, year],
        queryFn: async () => {
            const res = await fetch(`/api/invoices?term=${term}&year=${year}&limit=100`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch invoices');
            return res.json();
        },
    });

    const generateMutation = useMutation({
        mutationFn: async (config: typeof generateConfig) => {
            const res = await apiRequest('POST', '/api/invoices/generate', config);
            return res.json();
        },
        onSuccess: (result) => {
            toast({ title: 'Success', description: result.message });
            setShowGenerateModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/hub-stats'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    const downloadInvoicePDF = async (inv: Invoice) => {
        try {
            const response = await fetch(`/api/invoices/${inv.id}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch invoice');
            const data = await response.json();

            const { jsPDF } = jspdf;
            const doc = new jsPDF();

            doc.setFontSize(20);
            doc.setTextColor(0, 82, 204);
            doc.text('INVOICE', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Invoice #: ${inv.invoiceNumber}`, 20, 40);
            doc.text(`Date: ${new Date(inv.createdAt).toLocaleDateString()}`, 20, 46);
            doc.text(`Term: ${inv.term} | Year: ${inv.year}`, 20, 52);
            if (inv.dueDate) doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 20, 58);

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text('Bill To:', 130, 40);
            doc.setFontSize(10);
            doc.text(inv.studentName || 'Student', 130, 46);
            doc.text(`Class: ${inv.studentClass} ${inv.studentStream || ''}`, 130, 52);

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

            y += 15;
            doc.setFontSize(12);
            const statusColor = inv.status === 'paid' ? [0, 128, 0] : inv.status === 'partial' ? [245, 158, 11] : [239, 68, 68];
            doc.setTextColor(...statusColor);
            doc.text(`Status: ${inv.status.toUpperCase()}`, 105, y, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('Thank you for your prompt payment.', 105, 280, { align: 'center' });

            doc.save(`${inv.invoiceNumber}.pdf`);
            toast({ title: 'Success', description: `Invoice ${inv.invoiceNumber} downloaded` });
        } catch {
            toast({ title: 'Error', description: 'Failed to download invoice PDF', variant: 'destructive' });
        }
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Invoices</h3>
                <Button onClick={() => { setGenerateConfig({ term, year, dueDate: '', classLevel: '' }); setShowGenerateModal(true); }} size="sm">
                    Generate Invoices
                </Button>
            </div>

            {(!invoices || invoices.length === 0) ? (
                <div className={`${bgCard} rounded-xl p-12 border ${borderColor} text-center`}>
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No invoices yet</h3>
                    <p className={`${textSecondary} mb-4`}>Generate invoices for students based on fee structures</p>
                    <Button onClick={() => setShowGenerateModal(true)}>Generate Invoices</Button>
                </div>
            ) : (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
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
                                                    backgroundColor: `${STATUS_COLORS[inv.status] || '#6B7280'}20`,
                                                    color: STATUS_COLORS[inv.status] || '#6B7280',
                                                }}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => downloadInvoicePDF(inv)}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => sendReminder(inv.id)}
                                                    className="text-green-500 hover:text-green-700"
                                                    title="Send SMS Reminder"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
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
                                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Class (Optional)</label>
                                <select
                                    value={generateConfig.classLevel}
                                    onChange={(e) => setGenerateConfig({ ...generateConfig, classLevel: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                                >
                                    <option value="">All Classes</option>
                                    {['N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button onClick={() => setShowGenerateModal(false)} variant="outline" className="flex-1" disabled={generateMutation.isPending}>
                                Cancel
                            </Button>
                            <Button onClick={() => generateMutation.mutate(generateConfig)} className="flex-1" disabled={generateMutation.isPending} loading={generateMutation.isPending}>
                                Generate
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
