import React, { useEffect, useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper
} from '@tanstack/react-table';
import { Search, Plus, Pencil, Trash2, Shield, Building2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { UserForm, UserFormData } from '../../../components/admin/users/UserForm';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
    id: number;
    username: string;
    name: string;
    email?: string;
    role: string;
    isSuperAdmin: boolean;
    schoolCount: number;
}

interface SchoolOption {
    id: number;
    name: string;
}

export const UserList: React.FC = () => {
    const [data, setData] = useState<AdminUser[]>([]);
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const { toast } = useToast();

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { credentials: 'include' });
            if (res.ok) {
                const users = await res.json();
                setData(users);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/admin/schools', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSchools(data.map((s: any) => ({ id: s.id, name: s.name })));
            }
        } catch (err) { }
    };

    useEffect(() => {
        fetchUsers();
        fetchSchools();
    }, []);

    const handleSave = async (formData: UserFormData) => {
        try {
            const method = editingUser ? 'PUT' : 'POST';
            const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast({ title: 'Success', description: editingUser ? 'User updated' : 'User created' });
                setIsModalOpen(false);
                fetchUsers();
            } else {
                const errData = await res.json();
                toast({ title: 'Error', description: errData.message || 'Operation failed', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to save user', variant: 'destructive' });
        }
    };

    const handleDelete = async (user: AdminUser) => {
        if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'User deleted' });
                fetchUsers();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
        }
    };

    const columnHelper = createColumnHelper<AdminUser>();

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'User',
            cell: info => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">{info.getValue()}</div>
                    <div className="text-xs text-gray-500">@{info.row.original.username}</div>
                </div>
            )
        }),
        columnHelper.accessor('role', {
            header: 'Role',
            cell: info => {
                const role = info.getValue();
                const isSuper = info.row.original.isSuperAdmin;
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSuper ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                            role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                        {isSuper && <Shield className="w-3 h-3 mr-1" />}
                        {isSuper ? 'Super Admin' : role}
                    </span>
                );
            }
        }),
        columnHelper.accessor('schoolCount', {
            header: 'Schools',
            cell: info => (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    <span>{info.getValue()}</span>
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
                            setEditingUser(props.row.original);
                            setIsModalOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-500 mt-1">Manage system access and roles</p>
                </div>
                <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        placeholder="Search users..."
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    />
                </div>
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
                                        Loading users...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                                        No users found.
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
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {editingUser ? 'Edit User' : 'Add New User'}
                        </h2>
                        <UserForm
                            initialData={editingUser}
                            onSubmit={handleSave}
                            onCancel={() => setIsModalOpen(false)}
                            isLoading={loading}
                            isEdit={!!editingUser}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
