import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface FinanceTransaction {
    id: number;
    transaction_type: 'debit' | 'credit';
    amount: number;
    description: string;
    term: number;
    year: number;
    transaction_date: string;
    running_balance: number;
}

interface StudentLedgerProps {
    studentId: number;
}

export const StudentLedger: React.FC<StudentLedgerProps> = ({ studentId }) => {
    const { data: transactions, isLoading, error } = useQuery<FinanceTransaction[]>({
        queryKey: ['studentLedger', studentId],
        queryFn: async () => {
            const res = await fetch(`/api/finance-transactions/${studentId}`);
            if (!res.ok) throw new Error('Failed to fetch ledger');
            return res.json();
        }
    });

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;
    if (error) return <div className="text-red-500 p-4">Error loading ledger: {(error as Error).message}</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Ledger (Statement of Account)</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3">Term/Year</th>
                            <th className="px-6 py-3 text-right text-red-600 dark:text-red-400">Debit (Charge)</th>
                            <th className="px-6 py-3 text-right text-green-600 dark:text-green-400">Credit (Payment)</th>
                            <th className="px-6 py-3 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {transactions?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No transactions found.
                                </td>
                            </tr>
                        ) : (
                            transactions?.map((tx) => (
                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">
                                        {new Date(tx.transaction_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                        {tx.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        T{tx.term} {tx.year}
                                    </td>
                                    <td className="px-6 py-4 text-right text-red-600 dark:text-red-400 font-medium">
                                        {tx.transaction_type === 'debit' ? formatCurrency(tx.amount) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-medium">
                                        {tx.transaction_type === 'credit' ? formatCurrency(tx.amount) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(tx.running_balance)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
