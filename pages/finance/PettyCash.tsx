import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../hooks/use-auth';

export default function PettyCash() {
    const { activeSchool } = useAuth();

    const { data: accounts, isLoading } = useQuery({
        queryKey: ['petty-cash', activeSchool?.id],
        queryFn: async () => {
            const res = await apiRequest<any>('GET', '/accounting/petty-cash');
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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-2">Petty Cash Imprest</h1>
                    <p className="text-gray-500 mt-2">Manage small day-to-day cash disbursements and replenishments.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow transition">
                    <Plus className="w-4 h-4" /> Issue Cash
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts?.map((acc: any) => (
                    <div key={acc.id} className="bg-white border text-card-foreground shadow hover:shadow-md transition rounded-xl">
                        <div className="flex flex-col space-y-1.5 p-6 bg-gradient-to-br from-green-50 to-green-100 border-b border-green-200 rounded-t-xl">
                            <h3 className="font-semibold leading-none tracking-tight flex justify-between items-center text-green-900">
                                <span>{acc.custodian?.name || 'Unassigned'}</span>
                                <ClipboardList className="w-5 h-5 text-green-600 opacity-50" />
                            </h3>
                            <p className="text-sm text-green-700 font-medium pt-1.5">Custodian</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-3">
                                    <span className="text-gray-500 font-medium">Float Amount</span>
                                    <span className="text-lg font-bold text-gray-900">UGX {Number(acc.floatAmount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-end pb-1">
                                    <span className="text-gray-500 font-medium">Current Balance</span>
                                    <span className="text-2xl font-black text-primary-600 tracking-tight">UGX {Number(acc.currentBalance).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition text-sm">View Log</button>
                                <button className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 rounded-lg transition text-sm">Replenish</button>
                            </div>
                        </div>
                    </div>
                ))}

                {(!accounts || accounts.length === 0) && (
                    <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                        No active petty cash accounts found. Create one to start managing imprest.
                    </div>
                )}
            </div>
        </div>
    );
}
