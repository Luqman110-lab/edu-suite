import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/Button';
import { FEE_TYPES } from '@/lib/constants';

interface Scholarship {
    id: number;
    name: string;
    discountType: string;
    discountValue: number;
    feeTypes: string[];
    description: string | null;
    eligibilityCriteria: string | null;
    maxBeneficiaries: number | null;
    validFrom: string | null;
    validTo: string | null;
    isActive: boolean;
}

interface StudentScholarship {
    id: number;
    studentId: number;
    scholarshipId: number;
    term: number | null;
    year: number;
    status: string;
}

interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream: string;
}

export default function ScholarshipsTab() {
    const { theme } = useTheme();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '', discountType: 'percentage', discountValue: 0, feeTypes: [] as string[],
        description: '', eligibilityCriteria: '', maxBeneficiaries: '', validFrom: '', validTo: '',
    });
    const [assignForm, setAssignForm] = useState({ studentId: '', year: new Date().getFullYear(), term: '' });

    const { data: scholarships = [] } = useQuery<Scholarship[]>({
        queryKey: ['/api/scholarships'],
        queryFn: async () => { const r = await fetch('/api/scholarships', { credentials: 'include' }); return r.json(); },
    });

    const { data: studentScholarships = [] } = useQuery<StudentScholarship[]>({
        queryKey: ['/api/student-scholarships'],
        queryFn: async () => { const r = await fetch('/api/student-scholarships', { credentials: 'include' }); return r.json(); },
    });

    const { data: students = [] } = useQuery<Student[]>({
        queryKey: ['/api/students-for-scholarships'],
        queryFn: async () => { const r = await fetch('/api/students', { credentials: 'include' }); return r.json(); },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const url = editingId ? `/api/scholarships/${editingId}` : '/api/scholarships';
            const method = editingId ? 'PUT' : 'POST';
            const res = await apiRequest(method, url, form);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/scholarships'] });
            closeModal();
            toast({ title: 'Success', description: editingId ? 'Scholarship updated' : 'Scholarship created' });
        },
        onError: (err: Error) => setError(err.message),
    });

    const assignMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest('POST', '/api/student-scholarships', {
                studentId: parseInt(assignForm.studentId),
                scholarshipId: selectedScholarship!.id,
                year: assignForm.year,
                term: assignForm.term ? parseInt(assignForm.term) : null,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/student-scholarships'] });
            setShowAssignModal(false);
            setAssignForm({ studentId: '', year: new Date().getFullYear(), term: '' });
            toast({ title: 'Success', description: 'Student assigned to scholarship' });
        },
        onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => { await apiRequest('DELETE', `/api/scholarships/${id}`); },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/scholarships'] }),
    });

    const removeAssignmentMutation = useMutation({
        mutationFn: async (id: number) => { await apiRequest('DELETE', `/api/student-scholarships/${id}`); },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/student-scholarships'] }),
    });

    const handleSubmit = () => {
        setError(null);
        if (!form.name || !form.discountType || form.discountValue === 0) {
            setError('Name, discount type and value are required');
            return;
        }
        saveMutation.mutate();
    };

    const openEdit = (s: Scholarship) => {
        setEditingId(s.id);
        setForm({
            name: s.name, discountType: s.discountType, discountValue: s.discountValue,
            feeTypes: s.feeTypes || [], description: s.description || '',
            eligibilityCriteria: s.eligibilityCriteria || '',
            maxBeneficiaries: s.maxBeneficiaries?.toString() || '',
            validFrom: s.validFrom || '', validTo: s.validTo || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setError(null);
        setForm({ name: '', discountType: 'percentage', discountValue: 0, feeTypes: [], description: '', eligibilityCriteria: '', maxBeneficiaries: '', validFrom: '', validTo: '' });
    };

    const toggleFeeType = (type: string) => {
        setForm(f => ({
            ...f,
            feeTypes: f.feeTypes.includes(type) ? f.feeTypes.filter(t => t !== type) : [...f.feeTypes, type],
        }));
    };

    const formatDiscount = (s: Scholarship) =>
        s.discountType === 'percentage' ? `${s.discountValue}%` : `UGX ${s.discountValue.toLocaleString()}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Scholarships & Discounts</h3>
                    <p className={`text-sm ${textSecondary}`}>Manage fee discounts and assign to students</p>
                </div>
                <Button onClick={() => setShowModal(true)}>Add Scholarship</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {scholarships.map(s => {
                    const beneficiaries = studentScholarships.filter(ss => ss.scholarshipId === s.id);
                    return (
                        <div key={s.id} className={`rounded-xl ${bgCard} shadow-sm overflow-hidden`}>
                            <div className={`px-6 py-4 border-b ${borderColor}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className={`text-lg font-semibold ${textPrimary}`}>{s.name}</h3>
                                        <p className={`text-sm ${textSecondary}`}>{s.description || 'No description'}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        s.discountType === 'percentage' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    }`}>{formatDiscount(s)}</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {(s.feeTypes || []).map(t => (
                                        <span key={t} className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{t}</span>
                                    ))}
                                    {(!s.feeTypes || s.feeTypes.length === 0) && <span className={`text-sm ${textSecondary}`}>All fee types</span>}
                                </div>
                                <div className={`flex items-center justify-between text-sm ${textSecondary}`}>
                                    <span>Beneficiaries: {beneficiaries.length}{s.maxBeneficiaries ? ` / ${s.maxBeneficiaries}` : ''}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => { setSelectedScholarship(s); setShowAssignModal(true); }}>Assign Student</Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('Delete this scholarship?')) deleteMutation.mutate(s.id); }}>Delete</Button>
                                </div>
                                {beneficiaries.length > 0 && (
                                    <div className={`mt-4 pt-4 border-t ${borderColor}`}>
                                        <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Students:</p>
                                        <div className="space-y-2">
                                            {beneficiaries.map(b => {
                                                const student = students.find(st => st.id === b.studentId);
                                                return (
                                                    <div key={b.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                        <div>
                                                            <span className={textPrimary}>{student?.name || 'Unknown'}</span>
                                                            <span className={`ml-2 text-sm ${textSecondary}`}>
                                                                {student?.classLevel} - {b.year}{b.term ? `, Term ${b.term}` : ''}
                                                            </span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('Remove?')) removeAssignmentMutation.mutate(b.id); }}>Remove</Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {scholarships.length === 0 && (
                <div className={`p-12 rounded-xl ${bgCard} shadow-sm text-center`}>
                    <p className={`text-lg ${textSecondary}`}>No scholarships created yet</p>
                    <Button className="mt-4" onClick={() => setShowModal(true)}>Create Your First Scholarship</Button>
                </div>
            )}

            {/* Add/Edit Scholarship Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-lg mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>{editingId ? 'Edit Scholarship' : 'Add Scholarship'}</h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Merit Scholarship" className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Discount Type *</label>
                                    <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (UGX)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Value *</label>
                                    <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseInt(e.target.value) || 0 })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Applies to Fee Types</label>
                                <div className="flex flex-wrap gap-2">
                                    {FEE_TYPES.map(type => (
                                        <button key={type} type="button" onClick={() => toggleFeeType(type)} className={`px-3 py-1 rounded-full text-sm ${
                                            form.feeTypes.includes(type) ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                        }`}>{type}</button>
                                    ))}
                                </div>
                                <p className={`text-xs mt-1 ${textSecondary}`}>Leave empty to apply to all fees</p>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Eligibility Criteria</label>
                                    <input type="text" value={form.eligibilityCriteria} onChange={(e) => setForm({ ...form, eligibilityCriteria: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Max Beneficiaries</label>
                                    <input type="number" value={form.maxBeneficiaries} onChange={(e) => setForm({ ...form, maxBeneficiaries: e.target.value })} placeholder="Unlimited" className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
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

            {/* Assign Student Modal */}
            {showAssignModal && selectedScholarship && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>Assign Student to {selectedScholarship.name}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Student *</label>
                                <select value={assignForm.studentId} onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                    <option value="">Select Student</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year *</label>
                                    <input type="number" value={assignForm.year} onChange={(e) => setAssignForm({ ...assignForm, year: parseInt(e.target.value) })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                                    <select value={assignForm.term} onChange={(e) => setAssignForm({ ...assignForm, term: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                                        <option value="">All Terms</option>
                                        <option value="1">Term 1</option>
                                        <option value="2">Term 2</option>
                                        <option value="3">Term 3</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${borderColor}`}>
                            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                            <Button onClick={() => assignMutation.mutate()} disabled={!assignForm.studentId || assignMutation.isPending} loading={assignMutation.isPending}>Assign</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
