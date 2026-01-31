import React, { useEffect, useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper
} from '@tanstack/react-table';
import { Search, Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { School } from '../../../types';
import { Button } from '../../../components/Button';
import { SchoolForm } from '../../../components/admin/schools/SchoolForm';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export const SchoolList: React.FC = () => {
    const [data, setData] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const { toast } = useToast();

    // Fetch Schools
    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/admin/schools', { credentials: 'include' });
            if (res.ok) {
                const schools = await res.json();
                setData(schools);
            }
        } catch (err) {
            console.error('Failed to fetch schools:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    // Create / Update Logic
    const handleSave = async (formData: any) => {
        try {
            const url = editingSchool ? `/api/schools/${editingSchool.id}` : '/api/schools';
            const method = editingSchool ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast({ title: 'Success', description: editingSchool ? 'School updated' : 'School created' });
                setIsModalOpen(false);
                fetchSchools();
            } else {
                const errData = await res.json();
                toast({ title: 'Error', description: errData.message || 'Operation failed', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to save school', variant: 'destructive' });
        }
    };

    const handleDelete = async (school: School) => {
        if (!window.confirm(`Delete ${school.name}?`)) return;
        try {
            const res = await fetch(`/api/admin/schools/${school.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'School deleted' });
                fetchSchools();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete school', variant: 'destructive' });
        }
    };

    // Table Config
    const columnHelper = createColumnHelper<School>();

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Name',
            cell: info => (
                <div className="font-medium text-gray-900 dark:text-white">
                    {info.getValue()}
                </div>
            )
        }),
        columnHelper.accessor('code', {
            header: 'Code',
            cell: info => <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{info.getValue()}</span>
        }),
        columnHelper.accessor('isActive', {
            header: 'Status',
            cell: info => (
                <div className={`flex items-center gap-1.5 ${info.getValue() ? 'text-green-600' : 'text-red-500'}`}>
                    {info.getValue() ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span className="text-sm">{info.getValue() ? 'Active' : 'Inactive'}</span>
                </div>
            )
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: props => (
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setEditingSchool(props.row.original);
                            setIsModalOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Link to={`/app/admin/schools/${props.row.original.id}`}>
                        <Button variant="ghost" size="sm">
                            View
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(props.row.original)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        })
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
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schools</h1>
                    <p className="text-gray-500 mt-1">Manage all schools in the system</p>
                </div>
                <Button onClick={() => { setEditingSchool(null); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add School
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    placeholder="Search schools..."
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
                                        Loading schools...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                                        No schools found.
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

                {/* Pagination Controls */}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {editingSchool ? 'Edit School' : 'Add New School'}
                        </h2>
                        <SchoolForm
                            initialData={editingSchool}
                            onSubmit={handleSave}
                            onCancel={() => setIsModalOpen(false)}
                            isLoading={loading} // Potentially separate saving state
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
