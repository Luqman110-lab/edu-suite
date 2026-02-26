import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { Button } from '../../components/Button';

interface Expense {
    id: number;
    categoryId: number | null;
    amount: number;
    description: string;
    vendor: string | null;
    referenceNumber: string | null;
    expenseDate: string;
    paymentMethod: string | null;
    term: number | null;
    year: number | null;
    approvedBy: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    notes: string | null;
}

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    color: string;
    isActive: boolean;
}

const DEFAULT_CATEGORIES = [
    { name: 'Salaries', color: '#0052CC' },
    { name: 'Utilities', color: '#00875A' },
    { name: 'Supplies', color: '#FF991F' },
    { name: 'Maintenance', color: '#6554C0' },
    { name: 'Transport', color: '#FF5630' },
    { name: 'Food', color: '#36B37E' },
    { name: 'Other', color: '#6B7280' },
];

export default function ExpensesTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [form, setForm] = useState({
        categoryId: '',
        amount: 0,
        description: '',
        vendor: '',
        referenceNumber: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        term: '',
        year: new Date().getFullYear(),
        status: 'pending',
        approvedBy: '',
        notes: '',
    });
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#6B7280' });

    const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
        queryKey: ['/api/expenses', term, year],
        queryFn: async () => {
            const res = await fetch(`/api/expenses?term=${term}&year=${year}&limit=200`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            const result = await res.json();
            return result.data || [];
        },
    });

    const { data: categories = [] } = useQuery<ExpenseCategory[]>({
        queryKey: ['/api/expense-categories'],
        queryFn: async () => {
            const res = await fetch('/api/expense-categories', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
            const method = editingId ? 'PUT' : 'POST';
            const res = await apiRequest(method, url, form);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/hub-stats'] });
            closeModal();
            toast({ title: 'Success', description: editingId ? 'Expense updated' : 'Expense recorded' });
        },
        onError: (err: Error) => setError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest('DELETE', `/api/expenses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/hub-stats'] });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to delete expense', variant: 'destructive' }),
    });

    const addCategoryMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest('POST', '/api/expense-categories', categoryForm);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/expense-categories'] });
            setShowCategoryModal(false);
            setCategoryForm({ name: '', description: '', color: '#6B7280' });
        },
    });

    const createDefaultCategories = async () => {
        for (const cat of DEFAULT_CATEGORIES) {
            try {
                await apiRequest('POST', '/api/expense-categories', cat);
            } catch { /* ignore duplicates */ }
        }
        queryClient.invalidateQueries({ queryKey: ['/api/expense-categories'] });
        toast({ title: 'Success', description: 'Default categories created' });
    };

    const handleSubmit = () => {
        setError(null);
        if (!form.amount || !form.description || !form.expenseDate) {
            setError('Amount, description and date are required');
            return;
        }
        saveMutation.mutate();
    };

    const openEdit = (e: Expense) => {
        setEditingId(e.id);
        setForm({
            categoryId: e.categoryId?.toString() || '',
            amount: e.amount,
            description: e.description,
            vendor: e.vendor || '',
            referenceNumber: e.referenceNumber || '',
            expenseDate: e.expenseDate,
            paymentMethod: e.paymentMethod || 'Cash',
            term: e.term?.toString() || '',
            year: e.year || new Date().getFullYear(),
            status: e.status || 'pending',
            approvedBy: e.approvedBy || '',
            notes: e.notes || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setError(null);
        setForm({
            categoryId: '', amount: 0, description: '', vendor: '', referenceNumber: '',
            expenseDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash',
            term: '', year: new Date().getFullYear(), status: 'pending', approvedBy: '', notes: '',
        });
    };

    const filtered = filterCategory ? expenses.filter(e => e.categoryId?.toString() === filterCategory) : expenses;
    const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

    if (expensesLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Expense Tracking</h3>
                    <p className={`text-sm ${textSecondary}`}>Record and manage school expenses</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCategoryModal(true)}>Add Category</Button>
                    <Button onClick={() => setShowModal(true)}>Add Expense</Button>
                </div>
            </div>

            {categories.length === 0 && (
                <div className={`p-6 rounded-xl ${bgCard} shadow-sm text-center`}>
                    <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No expense categories found. Create default categories to get started.</p>
                    <Button onClick={createDefaultCategories}>Create Default Categories</Button>
                </div>
            )}

            <div className="flex flex-wrap gap-4 items-center">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filter by Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className={`ml-auto p-4 rounded-lg ${bgCard} shadow-sm`}>
                    <p className={`text-sm ${textSecondary}`}>Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {categories.map(c => {
                    const catTotal = expenses.filter(e => e.categoryId === c.id).reduce((sum, e) => sum + e.amount, 0);
                    return (
                        <div key={c.id} className={`px-4 py-2 rounded-lg ${bgCard} shadow-sm flex items-center gap-2`}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className={textPrimary}>{c.name}</span>
                            <span className={`font-medium ${textSecondary}`}>{formatCurrency(catTotal)}</span>
                        </div>
                    );
                })}
            </div>

            <div className={`rounded-xl ${bgCard} shadow-sm overflow-hidden`}>
                <table className="w-full">
                    <thead>
                        <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Date</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Description</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Category</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Vendor</th>
                            <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${textSecondary}`}>Status</th>
                            <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${textSecondary}`}>Amount</th>
                            <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${textSecondary}`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {filtered.map(e => {
                            const cat = categories.find(c => c.id === e.categoryId);
                            return (
                                <tr key={e.id}>
                                    <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{e.expenseDate}</td>
                                    <td className={`px-6 py-4 ${textPrimary}`}>{e.description}</td>
                                    <td className="px-6 py-4">
                                        {cat && (
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{cat.name}</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{e.vendor || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                           ${e.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                e.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                                    e.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800'}`}>
                                            {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Edit</Button>
                                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}>Delete</Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <p className={`px-6 py-8 text-center ${textSecondary}`}>No expenses recorded</p>
                )}
            </div>

            {/* Add/Edit Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-lg mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (UGX) *</label>
                                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date *</label>
                                    <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div className="col-span-2">
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description *</label>
                                    <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
                                    <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option>Cash</option>
                                        <option>Bank Deposit</option>
                                        <option>Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor</label>
                                    <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="paid">Paid</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Approved By</label>
                                    <input type="text" value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                            </div>
                        </div>
                        {error && <div className="px-6 pb-2"><p className="text-sm text-red-600">{error}</p></div>}
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${borderColor}`}>
                            <Button variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={saveMutation.isPending} loading={saveMutation.isPending}>Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-sm mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>Add Category</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Color</label>
                                <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} className="w-full h-10 rounded-lg border cursor-pointer" />
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${borderColor}`}>
                            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                            <Button onClick={() => addCategoryMutation.mutate()} disabled={!categoryForm.name || addCategoryMutation.isPending} loading={addCategoryMutation.isPending}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
