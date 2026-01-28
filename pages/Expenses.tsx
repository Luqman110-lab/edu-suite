import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';

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
  { name: 'Other', color: '#6B7280' }
];

export default function Expenses() {
  const { isDark } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    approvedBy: '',
    notes: ''
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#6B7280' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        fetch('/api/expenses', { credentials: 'include' }),
        fetch('/api/expense-categories', { credentials: 'include' })
      ]);
      if (expRes.ok) setExpenses(await expRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.amount || !form.description || !form.expenseDate) {
      setError('Amount, description and date are required');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        await fetchData();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('Network error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) return;
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(categoryForm)
      });
      if (res.ok) {
        await fetchData();
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '', color: '#6B7280' });
      }
    } catch (err) {
      console.error('Failed to add category', err);
    }
  };

  const createDefaultCategories = async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      try {
        await fetch('/api/expense-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cat)
        });
      } catch (err) {
        console.error('Failed to create category', err);
      }
    }
    await fetchData();
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
      approvedBy: e.approvedBy || '',
      notes: e.notes || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError(null);
    setForm({
      categoryId: '',
      amount: 0,
      description: '',
      vendor: '',
      referenceNumber: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      term: '',
      year: new Date().getFullYear(),
      approvedBy: '',
      notes: ''
    });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const filtered = filterCategory ? expenses.filter(e => e.categoryId?.toString() === filterCategory) : expenses;
  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Expense Tracking</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Record and manage school expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>Add Category</Button>
          <Button onClick={() => setShowModal(true)}>Add Expense</Button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm text-center`}>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No expense categories found. Create default categories to get started.</p>
          <Button onClick={createDefaultCategories}>Create Default Categories</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filter by Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={`ml-auto p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Expenses</p>
          <p className={`text-2xl font-bold text-red-600`}>{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(c => {
          const catTotal = expenses.filter(e => e.categoryId === c.id).reduce((sum, e) => sum + e.amount, 0);
          return (
            <div key={c.id} className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{c.name}</span>
              <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatCurrency(catTotal)}</span>
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Category</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Vendor</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filtered.map(e => {
              const cat = categories.find(c => c.id === e.categoryId);
              return (
                <tr key={e.id}>
                  <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{e.expenseDate}</td>
                  <td className={`px-6 py-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.description}</td>
                  <td className={`px-6 py-4`}>
                    {cat && (
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{cat.name}</span>
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{e.vendor || '-'}</td>
                  <td className={`px-6 py-4 text-right font-medium text-red-600`}>{formatCurrency(e.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(e.id)}>Delete</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No expenses recorded</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-lg mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (UGX) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date *</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description *</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Mobile Money</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor</label>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reference #</label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Approved By</label>
                  <input
                    type="text"
                    value={form.approvedBy}
                    onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
            {error && (
              <div className="px-6 pb-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-sm mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Category</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Color</label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-full h-10 rounded-lg border cursor-pointer"
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
              <Button onClick={handleAddCategory}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
