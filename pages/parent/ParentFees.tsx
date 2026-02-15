import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DollarSign, AlertCircle, Users, FileText } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ParentFees() {
    const { isDark } = useTheme();
    const [selectedChild, setSelectedChild] = useState<number | null>(null);

    const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

    const { data: dashboard, isLoading: loadingDash, error: dashError } = useQuery({
        queryKey: ['parent-dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard-stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load dashboard');
            return res.json();
        }
    });

    const children = dashboard?.children || [];
    const activeChild = selectedChild || children[0]?.id;

    const { data: feeData, isLoading: loadingFees, error: feeError } = useQuery({
        queryKey: ['parent-student-fees', activeChild],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${activeChild}/fees`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load fee data');
            return res.json();
        },
        enabled: !!activeChild
    });

    if (loadingDash) return <div className={`p-8 text-center ${textSecondary}`}>Loading...</div>;

    if (dashError) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-red-500">Failed to load dashboard data. Please refresh.</p>
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className={`max-w-4xl mx-auto p-8 text-center ${textSecondary}`}>
                <Users className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>No children linked to your account.</p>
            </div>
        );
    }

    const balance = feeData?.summary?.balance ?? 0;
    const isCredit = balance < 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${textPrimary}`}>Fees & Payments</h1>
                <p className={textSecondary}>View fee balances, invoices, and payment history.</p>
            </div>

            {/* Child Selector */}
            {children.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {children.map((child: any) => (
                        <button
                            key={child.id}
                            onClick={() => setSelectedChild(child.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${activeChild === child.id
                                ? (isDark ? 'bg-blue-900/40 border-blue-600 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700')
                                : (isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
                                }`}
                        >
                            {child.name}
                        </button>
                    ))}
                </div>
            )}

            {loadingFees ? (
                <div className={`p-8 text-center ${textSecondary}`}>Loading fee data...</div>
            ) : feeError ? (
                <div className="p-8 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                    <p className="text-red-500 text-sm">Failed to load fee data. Please try again.</p>
                </div>
            ) : feeData ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`rounded-lg border p-5 shadow-sm text-center ${cardBg}`}>
                            <p className={`text-xs uppercase tracking-wider ${textSecondary}`}>Total Due</p>
                            <p className={`text-2xl font-bold mt-2 ${textPrimary}`}>UGX {feeData.summary.totalDue.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-lg border p-5 shadow-sm text-center ${cardBg}`}>
                            <p className={`text-xs uppercase tracking-wider ${textSecondary}`}>Total Paid</p>
                            <p className="text-2xl font-bold text-green-600 mt-2">UGX {feeData.summary.totalPaid.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-lg border p-5 shadow-sm text-center ${cardBg}`}>
                            <p className={`text-xs uppercase tracking-wider ${textSecondary}`}>
                                {isCredit ? 'Credit' : 'Balance'}
                            </p>
                            <p className={`text-2xl font-bold mt-2 ${isCredit ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                UGX {Math.abs(balance).toLocaleString()}
                                {isCredit && <span className="text-sm font-normal ml-1">(Overpaid)</span>}
                            </p>
                        </div>
                    </div>

                    {/* Invoices */}
                    {feeData.invoices.length > 0 && (
                        <div className={`rounded-lg border shadow-sm ${cardBg}`}>
                            <div className={`p-4 border-b flex items-center gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <FileText className="w-4 h-4 text-blue-500" />
                                <h3 className={`font-bold ${textPrimary}`}>Invoices</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={isDark ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}>
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                                            <th className="px-4 py-3 text-left font-medium">Period</th>
                                            <th className="px-4 py-3 text-right font-medium">Total</th>
                                            <th className="px-4 py-3 text-right font-medium">Paid</th>
                                            <th className="px-4 py-3 text-right font-medium">Balance</th>
                                            <th className="px-4 py-3 text-center font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        {feeData.invoices.map((inv: any) => (
                                            <tr key={inv.id} className={hoverBg}>
                                                <td className={`px-4 py-3 font-medium ${textPrimary}`}>{inv.invoiceNumber}</td>
                                                <td className={`px-4 py-3 ${textSecondary}`}>Term {inv.term}, {inv.year}</td>
                                                <td className={`px-4 py-3 text-right ${textPrimary}`}>UGX {inv.totalAmount.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-green-600">UGX {inv.amountPaid.toLocaleString()}</td>
                                                <td className={`px-4 py-3 text-right font-medium ${textPrimary}`}>UGX {inv.balance.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                        inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    <div className={`rounded-lg border shadow-sm ${cardBg}`}>
                        <div className={`p-4 border-b flex items-center gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <h3 className={`font-bold ${textPrimary}`}>Payment History</h3>
                        </div>
                        {feeData.payments.length === 0 ? (
                            <p className={`p-6 text-center text-sm ${textSecondary}`}>No payments recorded yet.</p>
                        ) : (
                            <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {feeData.payments.map((p: any) => (
                                    <div key={p.id} className={`p-4 flex items-center justify-between ${hoverBg}`}>
                                        <div>
                                            <p className={`font-medium ${textPrimary}`}>{p.feeType}</p>
                                            <p className={`text-xs ${textSecondary}`}>
                                                Term {p.term}, {p.year} &middot; {p.paymentDate || 'N/A'}
                                                {p.paymentMethod ? ` \u00b7 ${p.paymentMethod}` : ''}
                                            </p>
                                            {p.description && <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.description}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">UGX {p.amountPaid.toLocaleString()}</p>
                                            {p.receiptNumber && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{p.receiptNumber}</p>}
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'paid'
                                                ? (isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-50 text-green-700')
                                                : (isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-50 text-yellow-700')}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Fee Breakdown from Invoices */}
                    {feeData.invoices.some((inv: any) => inv.items?.length > 0) && (
                        <div className={`rounded-lg border shadow-sm ${cardBg}`}>
                            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <h3 className={`font-bold ${textPrimary}`}>Fee Breakdown</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {feeData.invoices.filter((inv: any) => inv.items?.length > 0).map((inv: any) => (
                                    <div key={inv.id}>
                                        <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {inv.invoiceNumber} - Term {inv.term}, {inv.year}
                                        </p>
                                        <div className="space-y-1">
                                            {inv.items.map((item: any) => (
                                                <div key={item.id} className={`flex justify-between text-sm py-1 px-3 rounded ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{item.feeType}{item.description ? ` - ${item.description}` : ''}</span>
                                                    <span className={`font-medium ${textPrimary}`}>UGX {item.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
