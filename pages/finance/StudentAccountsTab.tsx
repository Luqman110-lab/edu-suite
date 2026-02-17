import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { apiRequest } from '@/lib/queryClient';
import { StudentFilter, FilterState } from '@/components/StudentFilter';
import { FeePaymentHistory } from '@/components/FeePaymentHistory';
import { StudentLedger } from '../components/StudentLedger';
import { Button } from '../../components/Button';
import { ArrowLeft, User, CreditCard } from 'lucide-react';

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
    term: number;
    year: number;
}

export default function StudentAccountsTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '', classLevel: '', stream: '', boardingStatus: '',
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
    const currentOverrides = (feeOverrides || []).filter(o => o.year === year);

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

            {/* Fee Overrides */}
            {currentOverrides.length > 0 && (
                <div className={`${bgCard} rounded-xl border ${borderColor} overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${borderColor}`}>
                        <h4 className={`font-semibold ${textPrimary}`}>Fee Overrides ({year})</h4>
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-3">
                            {currentOverrides.map(o => (
                                <div key={o.id} className={`px-3 py-2 rounded-lg border ${borderColor} text-sm`}>
                                    <span className={textSecondary}>{o.feeType}:</span>{' '}
                                    <span className={`font-medium ${textPrimary}`}>{formatCurrency(o.customAmount)}</span>
                                    {o.term ? <span className={`text-xs ${textSecondary}`}> (T{o.term})</span> : null}
                                </div>
                            ))}
                        </div>
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
        </div>
    );
}
