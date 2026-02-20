import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../hooks/use-auth';

export default function Accounting() {
    const { activeSchool } = useAuth();

    const { data: trialBalance, isLoading: isTbLoading } = useQuery({
        queryKey: ['trial-balance', activeSchool?.id],
        queryFn: async () => {
            const res = await apiRequest<any>('GET', '/accounting/trial-balance');
            return res;
        },
        enabled: !!activeSchool?.id,
    });

    const { data: accounts, isLoading: isAccountsLoading } = useQuery({
        queryKey: ['accounts', activeSchool?.id],
        queryFn: async () => {
            const res = await apiRequest<any>('GET', '/accounting/accounts');
            return res;
        },
        enabled: !!activeSchool?.id,
    });

    if (isTbLoading || isAccountsLoading) {
        return <div className="p-8 flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-2">Double-Entry Accounting</h1>
                    <p className="text-gray-500 mt-2">Manage your general ledger, chart of accounts, and financial statements.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition">
                        <FileText className="w-4 h-4" /> Reports
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow transition">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border text-card-foreground shadow hover:shadow-md transition rounded-xl">
                    <div className="flex flex-col space-y-1.5 p-6 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
                        <h3 className="font-semibold leading-none tracking-tight text-xl">Chart of Accounts</h3>
                        <p className="text-sm text-muted-foreground">All active accounts in your general ledger</p>
                    </div>
                    <div className="p-0">
                        <div className="max-h-96 overflow-y-auto w-full rounded-b-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 sticky top-0 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-100">Code</th>
                                        <th className="px-4 py-3 border-b border-gray-100">Name</th>
                                        <th className="px-4 py-3 border-b border-gray-100">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {accounts?.map((acc: any) => (
                                        <tr key={acc.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-gray-500">{acc.accountCode}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{acc.accountName}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium 
                                    ${acc.accountType === 'Asset' ? 'bg-blue-100 text-blue-700' :
                                                        acc.accountType === 'Liability' ? 'bg-orange-100 text-orange-700' :
                                                            acc.accountType === 'Equity' ? 'bg-purple-100 text-purple-700' :
                                                                acc.accountType === 'Revenue' ? 'bg-green-100 text-green-700' :
                                                                    'bg-red-100 text-red-700'}`}>
                                                    {acc.accountType}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!accounts || accounts.length === 0) && (
                                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No accounts configured.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="bg-white border text-card-foreground shadow hover:shadow-md transition rounded-xl">
                    <div className="flex flex-col space-y-1.5 p-6 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
                        <h3 className="font-semibold leading-none tracking-tight text-xl">Trial Balance</h3>
                        <p className="text-sm text-muted-foreground">Live check of debits vs credits</p>
                    </div>
                    <div className="p-0">
                        <div className="max-h-96 overflow-y-auto w-full rounded-b-xl">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600 sticky top-0 font-medium text-left">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-100 w-1/2">Account</th>
                                        <th className="px-4 py-3 border-b border-gray-100 text-right w-1/4">Debit</th>
                                        <th className="px-4 py-3 border-b border-gray-100 text-right w-1/4">Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {trialBalance?.map((tb: any) => (
                                        <tr key={tb.accountId} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-900 text-left">
                                                {tb.accountName} <span className="text-gray-400 font-normal ml-1">({tb.accountCode})</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{Number(tb.totalDebit).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-gray-600">{Number(tb.totalCredit).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {(!trialBalance || trialBalance.length === 0) && (
                                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No posted entries found.</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold sticky bottom-0 text-gray-900 border-t border-gray-200">
                                    <tr>
                                        <td className="px-4 py-3 text-left">Totals</td>
                                        <td className="px-4 py-3">{trialBalance?.reduce((sum: number, tb: any) => sum + Number(tb.totalDebit), 0).toLocaleString()}</td>
                                        <td className="px-4 py-3">{trialBalance?.reduce((sum: number, tb: any) => sum + Number(tb.totalCredit), 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
