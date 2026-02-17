import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { Button } from '../../components/Button';

interface FeeStructure {
    id: number;
    classLevel: string;
    feeType: string;
    amount: number;
    term: number | null;
    year: number;
    boardingStatus: string | null;
    description: string | null;
    isActive: boolean;
}

const FEE_TYPES = ['Tuition', 'Boarding', 'Transport', 'Uniform', 'Books', 'Exam', 'Development', 'Other'];
const CLASSES = ['N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

export default function FeeStructuresTab() {
    const { theme } = useTheme();
    const { year, formatCurrency } = useFinance();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filterYear, setFilterYear] = useState(year);
    const [filterClass, setFilterClass] = useState('');
    const [form, setForm] = useState({
        classLevel: 'P1',
        feeType: 'Tuition',
        amount: 0,
        term: '',
        year: year,
        boardingStatus: '',
        description: '',
    });

    const { data: structures = [], isLoading } = useQuery<FeeStructure[]>({
        queryKey: ['/api/fee-structures'],
        queryFn: async () => {
            const res = await fetch('/api/fee-structures', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const url = editingId ? `/api/fee-structures/${editingId}` : '/api/fee-structures';
            const method = editingId ? 'PUT' : 'POST';
            const res = await apiRequest(method, url, {
                ...form,
                term: form.term ? parseInt(form.term) : null,
                boardingStatus: form.boardingStatus || null,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/fee-structures'] });
            closeModal();
            toast({ title: 'Success', description: editingId ? 'Fee structure updated' : 'Fee structure created' });
        },
        onError: (err: Error) => {
            setError(err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest('DELETE', `/api/fee-structures/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/fee-structures'] });
        },
    });

    const handleSubmit = () => {
        setError(null);
        if (!form.classLevel || !form.feeType || !form.amount || !form.year) {
            setError('Class, fee type, amount and year are required');
            return;
        }
        saveMutation.mutate();
    };

    const handleDelete = (id: number) => {
        if (!confirm('Delete this fee structure?')) return;
        deleteMutation.mutate(id);
    };

    const openEdit = (s: FeeStructure) => {
        setEditingId(s.id);
        setForm({
            classLevel: s.classLevel,
            feeType: s.feeType,
            amount: s.amount,
            term: s.term?.toString() || '',
            year: s.year,
            boardingStatus: s.boardingStatus || '',
            description: s.description || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setError(null);
        setForm({ classLevel: 'P1', feeType: 'Tuition', amount: 0, term: '', year, boardingStatus: '', description: '' });
    };

    const filtered = structures.filter(s => {
        if (filterYear && s.year !== filterYear) return false;
        if (filterClass && s.classLevel !== filterClass) return false;
        return true;
    });

    const groupedByClass = CLASSES.reduce((acc, cls) => {
        acc[cls] = filtered.filter(s => s.classLevel === cls);
        return acc;
    }, {} as Record<string, FeeStructure[]>);

    if (isLoading) {
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
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Fee Structures</h3>
                    <p className={`text-sm ${textSecondary}`}>Define fees per class, term, and year</p>
                </div>
                <Button onClick={() => setShowModal(true)}>Add Fee Structure</Button>
            </div>

            <div className="flex gap-4 items-center">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                        <option value="">All Classes</option>
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-6">
                {CLASSES.map(cls => {
                    const classStructures = groupedByClass[cls];
                    if (filterClass && filterClass !== cls) return null;
                    if (!classStructures || classStructures.length === 0) {
                        if (filterClass) {
                            return (
                                <div key={cls} className={`rounded-xl ${bgCard} shadow-sm overflow-hidden`}>
                                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                                        <h3 className={`text-lg font-semibold ${textPrimary}`}>{cls}</h3>
                                    </div>
                                    <p className={`px-6 py-8 text-center ${textSecondary}`}>No fee structures defined for {cls}</p>
                                </div>
                            );
                        }
                        return null;
                    }
                    const total = classStructures.reduce((sum, s) => sum + s.amount, 0);

                    return (
                        <div key={cls} className={`rounded-xl ${bgCard} shadow-sm overflow-hidden`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-lg font-semibold ${textPrimary}`}>{cls}</h3>
                                    <span className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                        Total: {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className={isDark ? 'bg-gray-700/30' : 'bg-gray-50'}>
                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Fee Type</th>
                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Amount</th>
                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Term</th>
                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${textSecondary}`}>Boarding</th>
                                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${textSecondary}`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    {classStructures.map(s => (
                                        <tr key={s.id}>
                                            <td className={`px-6 py-4 ${textPrimary}`}>{s.feeType}</td>
                                            <td className={`px-6 py-4 font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>{formatCurrency(s.amount)}</td>
                                            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.term ? `Term ${s.term}` : 'All Terms'}</td>
                                            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.boardingStatus || 'All'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                                                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(s.id)}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>
                                {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                                    <select value={form.classLevel} onChange={(e) => setForm({ ...form, classLevel: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fee Type</label>
                                    <select value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (UGX)</label>
                                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                                    <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || year })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term (optional)</label>
                                    <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="">All Terms</option>
                                        <option value="1">Term 1</option>
                                        <option value="2">Term 2</option>
                                        <option value="3">Term 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boarding Status</label>
                                    <select value={form.boardingStatus} onChange={(e) => setForm({ ...form, boardingStatus: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="">All Students</option>
                                        <option value="boarding">Boarding Only</option>
                                        <option value="day">Day Only</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description (optional)</label>
                                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
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
        </div>
    );
}
