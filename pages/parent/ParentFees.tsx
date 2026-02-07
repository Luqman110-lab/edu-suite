import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DollarSign, AlertCircle, Users, ChevronRight, FileText } from "lucide-react";

export default function ParentFees() {
    const [selectedChild, setSelectedChild] = useState<number | null>(null);

    const { data: dashboard, isLoading: loadingDash } = useQuery({
        queryKey: ['parent-dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard-stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    const children = dashboard?.children || [];
    const activeChild = selectedChild || children[0]?.id;

    const { data: feeData, isLoading: loadingFees } = useQuery({
        queryKey: ['parent-student-fees', activeChild],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${activeChild}/fees`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!activeChild
    });

    if (loadingDash) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    if (children.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No children linked to your account.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>
                <p className="text-gray-500">View fee balances, invoices, and payment history.</p>
            </div>

            {/* Child Selector */}
            {children.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {children.map((child: any) => (
                        <button
                            key={child.id}
                            onClick={() => setSelectedChild(child.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${activeChild === child.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {child.name}
                        </button>
                    ))}
                </div>
            )}

            {loadingFees ? (
                <div className="p-8 text-center text-gray-500">Loading fee data...</div>
            ) : feeData ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg border p-5 shadow-sm text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Due</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">UGX {feeData.summary.totalDue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg border p-5 shadow-sm text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</p>
                            <p className="text-2xl font-bold text-green-700 mt-2">UGX {feeData.summary.totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg border p-5 shadow-sm text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Balance</p>
                            <p className={`text-2xl font-bold mt-2 ${feeData.summary.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                UGX {Math.abs(feeData.summary.balance).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Invoices */}
                    {feeData.invoices.length > 0 && (
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="p-4 border-b flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <h3 className="font-bold text-gray-900">Invoices</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                                            <th className="px-4 py-3 text-left font-medium">Period</th>
                                            <th className="px-4 py-3 text-right font-medium">Total</th>
                                            <th className="px-4 py-3 text-right font-medium">Paid</th>
                                            <th className="px-4 py-3 text-right font-medium">Balance</th>
                                            <th className="px-4 py-3 text-center font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {feeData.invoices.map((inv: any) => (
                                            <tr key={inv.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                                                <td className="px-4 py-3">Term {inv.term}, {inv.year}</td>
                                                <td className="px-4 py-3 text-right">UGX {inv.totalAmount.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-green-700">UGX {inv.amountPaid.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-medium">UGX {inv.balance.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
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
                    <div className="bg-white rounded-lg border shadow-sm">
                        <div className="p-4 border-b flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <h3 className="font-bold text-gray-900">Payment History</h3>
                        </div>
                        {feeData.payments.length === 0 ? (
                            <p className="p-6 text-center text-gray-500 text-sm">No payments recorded yet.</p>
                        ) : (
                            <div className="divide-y">
                                {feeData.payments.map((p: any) => (
                                    <div key={p.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{p.feeType}</p>
                                            <p className="text-xs text-gray-500">
                                                Term {p.term}, {p.year} &middot; {p.paymentDate || 'N/A'}
                                                {p.paymentMethod ? ` &middot; ${p.paymentMethod}` : ''}
                                            </p>
                                            {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-700">UGX {p.amountPaid.toLocaleString()}</p>
                                            {p.receiptNumber && <p className="text-xs text-gray-400">#{p.receiptNumber}</p>}
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
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
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="font-bold text-gray-900">Fee Breakdown</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {feeData.invoices.filter((inv: any) => inv.items?.length > 0).map((inv: any) => (
                                    <div key={inv.id}>
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            {inv.invoiceNumber} - Term {inv.term}, {inv.year}
                                        </p>
                                        <div className="space-y-1">
                                            {inv.items.map((item: any) => (
                                                <div key={item.id} className="flex justify-between text-sm py-1 px-3 bg-gray-50 rounded">
                                                    <span className="text-gray-600">{item.feeType}{item.description ? ` - ${item.description}` : ''}</span>
                                                    <span className="font-medium">UGX {item.amount.toLocaleString()}</span>
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
