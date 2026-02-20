import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../hooks/use-auth';

export default function Budgets() {
    const { activeSchool } = useAuth();
    const currentTerm = 1;
    const currentYear = new Date().getFullYear();

    const { data: budgets, isLoading } = useQuery({
        queryKey: ['budgets', activeSchool?.id, currentTerm, currentYear],
        queryFn: async () => {
            const res = await apiRequest<any>('GET', `/accounting/budgets?term=${currentTerm}&year=${currentYear}`);
            return res;
        },
        enabled: !!activeSchool?.id,
    });

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-2">Department Budgets</h1>
                    <p className="text-gray-500 mt-2">Manage spending allocations for Term {currentTerm} {currentYear}.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow transition">
                    <Layers className="w-4 h-4" /> New Allocation
                </button>
            </div>

            <div className="bg-white border text-card-foreground shadow hover:shadow-md transition rounded-xl">
                <div className="flex flex-col space-y-1.5 p-6 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
                    <h3 className="font-semibold leading-none tracking-tight">Allocations & Utilization</h3>
                    <p className="text-sm text-muted-foreground">Track allocated amount vs actual spend per category.</p>
                </div>
                <div className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-4 border-b border-gray-100">Category</th>
                                <th className="px-6 py-4 border-b border-gray-100">Allocated (UGX)</th>
                                <th className="px-6 py-4 border-b border-gray-100">Spent (UGX)</th>
                                <th className="px-6 py-4 border-b border-gray-100">Remaining (UGX)</th>
                                <th className="px-6 py-4 border-b border-gray-100">Utilization</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {budgets?.map((budget: any) => {
                                const remaining = budget.amountAllocated - budget.amountSpent;
                                const pct = budget.amountAllocated > 0 ? (budget.amountSpent / budget.amountAllocated) * 100 : 0;
                                const isOver = pct > 100;
                                const isWarning = pct > 80 && !isOver;

                                return (
                                    <tr key={budget.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900">{budget.category?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-gray-600">{Number(budget.amountAllocated).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-600">{Number(budget.amountSpent).toLocaleString()}</td>
                                        <td className={`px-6 py-4 font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                                            {remaining.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!budgets || budgets.length === 0) && (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No budgets allocated for this term.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
