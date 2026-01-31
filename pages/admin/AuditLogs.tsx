import React, { useEffect, useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper
} from '@tanstack/react-table';
import { Search, Activity, User, Building2, Trash2, Edit, Key } from 'lucide-react';
import { Button } from '../../../components/Button';
import { format } from 'date-fns';

export interface AuditLog {
    id: number;
    userName: string;
    action: string;
    entityType: string;
    entityName: string;
    createdAt: string;
}

export const AuditLogs: React.FC = () => {
    const [data, setData] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs?limit=500', { credentials: 'include' });
            if (res.ok) {
                const logs = await res.json();
                // Handle different API response structures if needed (AdminDashboard had data.logs or array)
                setData(logs.logs || logs || []); // Adapt based on actual API
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const columnHelper = createColumnHelper<AuditLog>();

    const columns = useMemo(() => [
        columnHelper.accessor('userName', {
            header: 'Actor',
            cell: info => (
                <div className="font-medium text-gray-900 dark:text-white">
                    {info.getValue() || 'System'}
                </div>
            )
        }),
        columnHelper.accessor('action', {
            header: 'Action',
            cell: info => (
                <span className="capitalize text-gray-600 dark:text-gray-400">
                    {info.getValue().replace(/_/g, ' ')}
                </span>
            )
        }),
        columnHelper.accessor('entityType', {
            header: 'Target Type',
            cell: info => (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {info.getValue()}
                </span>
            )
        }),
        columnHelper.accessor('entityName', {
            header: 'Target Name',
            cell: info => <span className="text-gray-900 dark:text-white">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('createdAt', {
            header: 'Time',
            cell: info => <span className="text-gray-500 whitespace-nowrap">{format(new Date(info.getValue()), 'MMM d, p')}</span>
        }),
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: 20,
            },
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                    <p className="text-gray-500 mt-1">Track system activity and security events</p>
                </div>
                <Button variant="outline" onClick={fetchLogs} loading={loading}>
                    <Activity className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    placeholder="Search logs..."
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium border-b border-gray-100 dark:border-gray-700">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-6 py-4">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                                        No logs found.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
