import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { StudentFilter, FilterState } from '@/components/StudentFilter';
import { FeePaymentHistory } from '@/components/FeePaymentHistory';
import { StudentLedger } from '../components/StudentLedger';
import { Button } from '../../components/Button';
import { ArrowLeft, User, Edit3, Trash2, Plus } from 'lucide-react';
import { FEE_TYPES } from '@/lib/constants';

interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    boardingStatus?: string;
    indexNumber?: string;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
}

interface FeeOverride {
    id: number;
    feeType: string;
    customAmount: number;
    term: number | null;
    year: number;
    reason?: string;
    isActive?: boolean;
}

interface FeeStructure {
    id: number;
    classLevel: string;
    feeType: string;
    amount: number;
    term: number | null;
    year: number;
    boardingStatus: string | null;
    isActive: boolean;
}

const normalizeClass = (raw: string): string => {
    if (!raw) return '';
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export default function StudentAccountsTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '', classLevel: '', stream: '', boardingStatus: '',
    });
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideForm, setOverrideForm] = useState({
        feeType: '',
        standardAmount: 0,
        customAmount: '',
        term: '',
        reason: '',
    });

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const hasActiveFilters = filters.classLevel || filters.stream || filters.boardingStatus || (filters.searchQuery && filters.searchQuery.length >= 2);

    const { data: searchResults, isLoading: isSearching } = useQuery<Student[]>({
        queryKey: ['students-search-accounts', filters.searchQuery, filters.classLevel, filters.stream, filters.boardingStatus],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.searchQuery) params.append('q', filters.searchQuery);
            if (filters.classLevel) params.append('classLevel', filters.classLevel);
            if (filters.stream) params.append('stream', filters.stream);
            if (filters.boardingStatus) params.append('boardingStatus', filters.boardingStatus);
            const res = await apiRequest('GET', `/api/students/search?${params.toString()}`);
            return res.json();
        },
        enabled: Boolean(hasActiveFilters),
    });

    // Per-student data when selected
    const { data: studentInvoices } = useQuery<Invoice[]>({
        queryKey: ['student-invoices', selectedStudent?.id, term, year],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/invoices?studentId=${selectedStudent!.id}&term=${term}&year=${year}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const { data: feeOverrides } = useQuery<FeeOverride[]>({
        queryKey: ['student-fee-overrides', selectedStudent?.id],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/student-fee-overrides/${selectedStudent!.id}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const { data: allFeeStructures } = useQuery<FeeStructure[]>({
        queryKey: ['/api/fee-structures'],
        queryFn: async () => {
            const res = await fetch('/api/fee-structures', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    // Override mutations
    const createOverrideMutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const res = await apiRequest('POST', '/api/student-fee-overrides', data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-fee-overrides', selectedStudent?.id] });
            setShowOverrideModal(false);
            toast({ title: 'Custom fee saved', description: 'The fee override has been applied.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Failed to save override', description: err.message, variant: 'destructive' });
        },
    });

    const deleteOverrideMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest('DELETE', `/api/student-fee-overrides/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-fee-overrides', selectedStudent?.id] });
            toast({ title: 'Override removed', description: 'Standard fee will apply.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Failed to remove override', description: err.message, variant: 'destructive' });
        },
    });

    // Compute fee breakdown for student
    const getStudentFeeBreakdown = () => {
        if (!selectedStudent || !allFeeStructures) return [];

        const studentClass = normalizeClass(selectedStudent.classLevel);
        const studentBoarding = selectedStudent.boardingStatus;

        // Filter fee structures for this student's class, year, term, and boarding status
        const applicable = allFeeStructures.filter(fs => {
            if (normalizeClass(fs.classLevel) !== studentClass) return false;
            if (fs.year !== year) return false;
            if (fs.isActive === false) return false;
            // Term: null means all terms, otherwise must match
            if (fs.term !== null && fs.term !== term) return false;
            // Boarding: null/empty means all students
            if (fs.boardingStatus && fs.boardingStatus !== 'all' && fs.boardingStatus !== studentBoarding) return false;
            return true;
        });

        const currentOverrides = (feeOverrides || []).filter(o =>
            o.year === year && (o.isActive !== false) &&
            (o.term === null || o.term === term)
        );

        // Group by feeType, picking the most specific structure
        const feeMap = new Map<string, { standardAmount: number; override: FeeOverride | null; structureId: number }>();

        for (const fs of applicable) {
            const existing = feeMap.get(fs.feeType);
            // More specific (with term or boardingStatus) wins
            if (!existing || (fs.term !== null) || (fs.boardingStatus)) {
                const override = currentOverrides.find(o => o.feeType === fs.feeType) || null;
                feeMap.set(fs.feeType, { standardAmount: fs.amount, override, structureId: fs.id });
            }
        }

        // Also check for overrides that have no matching structure (custom fee types)
        for (const o of currentOverrides) {
            if (!feeMap.has(o.feeType)) {
                feeMap.set(o.feeType, { standardAmount: 0, override: o, structureId: 0 });
            }
        }

        return Array.from(feeMap.entries()).map(([feeType, data]) => ({
            feeType,
            standardAmount: data.standardAmount,
            customAmount: data.override?.customAmount ?? null,
            effectiveAmount: data.override ? data.override.customAmount : data.standardAmount,
            override: data.override,
        }));
    };

    const openOverrideModal = (feeType: string, standardAmount: number, existingOverride?: FeeOverride | null) => {
        setOverrideForm({
            feeType,
            standardAmount,
            customAmount: existingOverride ? existingOverride.customAmount.toString() : '',
            term: '',
            reason: existingOverride?.reason || '',
        });
        setShowOverrideModal(true);
    };

    const handleSaveOverride = () => {
        const amount = Math.round(Number(overrideForm.customAmount));
        if (isNaN(amount) || amount < 0) {
            toast({ title: 'Invalid amount', description: 'Please enter a valid amount.', variant: 'destructive' });
            return;
        }

        createOverrideMutation.mutate({
            studentId: selectedStudent!.id,
            feeType: overrideForm.feeType,
            customAmount: amount,
            term: overrideForm.term ? parseInt(overrideForm.term) : null,
            year,
            reason: overrideForm.reason || null,
        });
    };

    const handleDeleteOverride = (override: FeeOverride) => {
        if (!confirm(`Remove custom fee for ${override.feeType}?`)) return;
        deleteOverrideMutation.mutate(override.id);
    };

    // Browse mode
    if (!selectedStudent) {
        return (
            <div className="space-y-4">
                <div>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-1`}>Student Accounts</h3>
                    <p className={`text-sm ${textSecondary}`}>Search for a student to view their financial profile</p>
                </div>

                <StudentFilter onFilterChange={setFilters} />

                {isSearching && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    </div>
                )}

                {searchResults && searchResults.length > 0 && (
                    <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                    <tr>
                                        <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Name</th>
                                        <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Class</th>
                                        <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Stream</th>
                                        <th className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase`}>Index #</th>
                                        <th className={`px-4 py-3 text-center text-xs font-medium ${textSecondary} uppercase`}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {searchResults.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                            <td className={`px-4 py-3 text-sm font-medium ${textPrimary}`}>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    {student.name}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${textSecondary}`}>{student.classLevel}</td>
                                            <td className={`px-4 py-3 text-sm ${textSecondary}`}>{student.stream || '-'}</td>
                                            <td className={`px-4 py-3 text-sm ${textSecondary}`}>{student.indexNumber || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>
                                                    View Account
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {hasActiveFilters && searchResults?.length === 0 && !isSearching && (
                    <div className={`${bgCard} rounded-xl p-12 border ${borderColor} text-center`}>
                        <p className={textSecondary}>No students found matching your filters</p>
                    </div>
                )}
            </div>
        );
    }

    // Detail mode
    const currentInvoice = studentInvoices?.[0];
    const feeBreakdown = getStudentFeeBreakdown();
    const totalEffective = feeBreakdown.reduce((sum, row) => sum + row.effectiveAmount, 0);

    return (
        <div className="space-y-6">
            {/* Back button + student header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setSelectedStudent(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Search
                </Button>
                <div>
                    <h3 className={`text-lg font-bold ${textPrimary}`}>{selectedStudent.name}</h3>
                    <p className={`text-sm ${textSecondary}`}>
                        {selectedStudent.classLevel} {selectedStudent.stream || ''} {selectedStudent.boardingStatus ? `- ${selectedStudent.boardingStatus}` : ''}
                    </p>
                </div>
            </div>

            {/* Summary Card */}
            {currentInvoice && (
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <h4 className={`text-sm font-medium ${textSecondary} mb-3`}>Term {term}, {year} Summary</h4>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <div className={`text-xs uppercase ${textSecondary}`}>Total Billed</div>
                            <div className={`text-xl font-bold ${textPrimary}`}>{formatCurrency(currentInvoice.totalAmount)}</div>
                        </div>
                        <div>
                            <div className={`text-xs uppercase ${textSecondary}`}>Paid</div>
                            <div className="text-xl font-bold text-green-500">{formatCurrency(currentInvoice.amountPaid)}</div>
                        </div>
                        <div>
                            <div className={`text-xs uppercase ${textSecondary}`}>Balance</div>
                            <div className={`text-xl font-bold ${currentInvoice.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatCurrency(currentInvoice.balance)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!currentInvoice && (
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <p className="text-yellow-600 text-sm">No invoice found for Term {term}, {year}. Generate invoices first.</p>
                </div>
            )}

            {/* Fee Breakdown */}
            <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${borderColor} flex items-center justify-between`}>
                    <div>
                        <h4 className={`font-semibold ${textPrimary}`}>Fee Breakdown</h4>
                        <p className={`text-xs ${textSecondary}`}>Term {term}, {year} - Scholarships applied at invoice generation</p>
                    </div>
                </div>
                {feeBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                <tr>
                                    <th className={`px-4 py-2 text-left text-xs font-medium ${textSecondary} uppercase`}>Fee Type</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Standard</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Custom</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Effective</th>
                                    <th className={`px-4 py-2 text-center text-xs font-medium ${textSecondary} uppercase`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {feeBreakdown.map(row => (
                                    <tr key={row.feeType}>
                                        <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                                            {row.feeType}
                                            {row.override && (
                                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    Custom
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-4 py-3 text-right ${textSecondary}`}>
                                            {formatCurrency(row.standardAmount)}
                                        </td>
                                        <td className={`px-4 py-3 text-right ${row.customAmount !== null ? 'text-blue-600 dark:text-blue-400 font-medium' : textSecondary}`}>
                                            {row.customAmount !== null ? formatCurrency(row.customAmount) : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${textPrimary}`}>
                                            {formatCurrency(row.effectiveAmount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openOverrideModal(row.feeType, row.standardAmount, row.override)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    title={row.override ? 'Edit Custom Fee' : 'Set Custom Fee'}
                                                >
                                                    {row.override ? <Edit3 className="w-4 h-4 text-blue-500" /> : <Plus className="w-4 h-4 text-gray-400" />}
                                                </button>
                                                {row.override && (
                                                    <button
                                                        onClick={() => handleDeleteOverride(row.override!)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Remove Custom Fee"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                                    <td className={`px-4 py-3 font-bold ${textPrimary}`} colSpan={3}>Total</td>
                                    <td className={`px-4 py-3 text-right font-bold text-lg ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                        {formatCurrency(totalEffective)}
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={`p-8 text-center ${textSecondary}`}>
                        <p>No fee structures defined for {selectedStudent.classLevel} in {year}.</p>
                        <p className="text-xs mt-1">Add fee structures in the Fee Structures tab first.</p>
                    </div>
                )}
            </div>

            {/* Invoices for this student */}
            {studentInvoices && studentInvoices.length > 0 && (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${borderColor}`}>
                        <h4 className={`font-semibold ${textPrimary}`}>Invoices</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                <tr>
                                    <th className={`px-4 py-2 text-left text-xs font-medium ${textSecondary} uppercase`}>Invoice #</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Amount</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Paid</th>
                                    <th className={`px-4 py-2 text-right text-xs font-medium ${textSecondary} uppercase`}>Balance</th>
                                    <th className={`px-4 py-2 text-center text-xs font-medium ${textSecondary} uppercase`}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {studentInvoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td className={`px-4 py-2 ${textPrimary}`}>{inv.invoiceNumber}</td>
                                        <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatCurrency(inv.totalAmount)}</td>
                                        <td className="px-4 py-2 text-right text-green-600">{formatCurrency(inv.amountPaid)}</td>
                                        <td className="px-4 py-2 text-right text-red-600">{formatCurrency(inv.balance)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                inv.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : inv.status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>{inv.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <FeePaymentHistory
                studentId={selectedStudent.id}
                studentName={selectedStudent.name}
                classLevel={selectedStudent.classLevel}
                boardingStatus={selectedStudent.boardingStatus}
                currentYear={year}
                isDark={isDark}
            />

            {/* Student Ledger */}
            <StudentLedger studentId={selectedStudent.id} />

            {/* Override Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${bgCard}`}>
                        <div className={`px-6 py-4 border-b ${borderColor}`}>
                            <h3 className={`text-lg font-semibold ${textPrimary}`}>Set Custom Fee</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fee Type</label>
                                <div className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                                    {overrideForm.feeType}
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Standard Amount</label>
                                <div className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                                    {formatCurrency(overrideForm.standardAmount)}
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Custom Amount (UGX) *</label>
                                <input
                                    type="number"
                                    value={overrideForm.customAmount}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, customAmount: e.target.value })}
                                    placeholder="Enter custom amount"
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                                <select
                                    value={overrideForm.term}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, term: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                >
                                    <option value="">All Terms</option>
                                    <option value="1">Term 1</option>
                                    <option value="2">Term 2</option>
                                    <option value="3">Term 3</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reason</label>
                                <input
                                    type="text"
                                    value={overrideForm.reason}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                                    placeholder="e.g., Discount, Partial scholarship"
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${borderColor}`}>
                            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
                            <Button
                                onClick={handleSaveOverride}
                                disabled={createOverrideMutation.isPending || !overrideForm.customAmount}
                                loading={createOverrideMutation.isPending}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
