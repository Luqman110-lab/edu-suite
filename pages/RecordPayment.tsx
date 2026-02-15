import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, Input, Spinner } from '../components/UIComponents';
import { Button } from '../components/Button';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { StudentFilter, FilterState } from '@/components/StudentFilter';

// Define types locally
interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    boardingStatus?: string;
    studentId?: string; // e.g. LIN/Index
}

interface FeeStructure {
    id: number;
    classLevel: string;
    feeType: string;
    amount: number;
    term: number;
    year: number;
    boardingStatus: string;
}

interface StudentFeeOverride {
    id: number;
    studentId: number;
    feeType: string;
    customAmount: number;
    term: number;
    year: number;
}

interface FeePayment {
    id: number;
    paymentDate: string;
    amountPaid: number;
    feeType: string;
    receiptNumber: string;
}

export default function RecordPayment() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        classLevel: '',
        stream: '',
        boardingStatus: ''
    });
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Payment Form State
    const [feeType, setFeeType] = useState('Tuition');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [term, setTerm] = useState('1');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [notes, setNotes] = useState('');

    // Search Query
    const hasActiveFilters = filters.classLevel || filters.stream || filters.boardingStatus || (filters.searchQuery && filters.searchQuery.length >= 2);

    const { data: searchResults, isLoading: isSearching } = useQuery<Student[]>({
        queryKey: ['students-search', filters.searchQuery, filters.classLevel, filters.stream, filters.boardingStatus, filters.sortBy, filters.sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.searchQuery) params.append('q', filters.searchQuery);
            if (filters.classLevel) params.append('classLevel', filters.classLevel);
            if (filters.stream) params.append('stream', filters.stream);
            if (filters.boardingStatus) params.append('boardingStatus', filters.boardingStatus);
            if (filters.sortBy) params.append('sortBy', filters.sortBy);
            if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

            const res = await apiRequest('GET', `/api/students/search?${params.toString()}`);
            return res.json();
        },
        enabled: Boolean(hasActiveFilters),
    });

    // Fetch Fee Data for Selected Student
    const { data: feeStructures } = useQuery<FeeStructure[]>({
        queryKey: ['fee-structures'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/fee-structures');
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const { data: overrides } = useQuery<StudentFeeOverride[]>({
        queryKey: ['student-fee-overrides', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const res = await apiRequest('GET', `/api/student-fee-overrides/${selectedStudent.id}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    // Fetch Invoice for Selected Student
    const { data: invoices } = useQuery<any[]>({
        queryKey: ['student-invoices', selectedStudent?.id, term, year],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const res = await apiRequest('GET', `/api/invoices?studentId=${selectedStudent.id}&term=${term}&year=${year}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const activeInvoice = invoices?.[0];

    const createPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest('POST', '/api/fee-payments', data);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Payment Recorded",
                description: "Transaction has been saved successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
            queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
            // Reset form
            setAmountPaid('');
            setNotes('');
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to record payment",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSearchSelect = (student: Student) => {
        setSelectedStudent(student);
    };

    const getAmountDue = () => {
        return activeInvoice ? activeInvoice.balance : 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const amount = Math.round(Number(amountPaid));
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a positive amount.", variant: "destructive" });
            return;
        }

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
            toast({ title: "Invalid Year", description: "Year must be between 2020 and 2100.", variant: "destructive" });
            return;
        }

        // Warn if overpaying
        const due = getAmountDue();
        if (due > 0 && amount > due) {
            if (!confirm(`Amount (${amount.toLocaleString()} UGX) exceeds balance due (${due.toLocaleString()} UGX). Continue?`)) {
                return;
            }
        }

        createPaymentMutation.mutate({
            studentId: selectedStudent.id,
            feeType,
            amountPaid: amount,
            term: parseInt(term),
            year: parseInt(year),
            paymentMethod,
            notes
        });
    };

    // Helper for Select elements
    const renderSelect = (label: string, value: string, onChange: (val: string) => void, options: { value: string, label: string }[]) => (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <select
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none transition-all"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => selectedStudent ? setSelectedStudent(null) : navigate('/app/finance')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {selectedStudent ? 'Back to Search' : 'Back to Finance'}
                </Button>
                <h1 className="text-2xl font-bold">Record Payment</h1>
            </div>

            {!selectedStudent ? (
                <Card>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold">Find Student</h3>
                        <p className="text-sm text-gray-500">Search to record a payment</p>
                    </div>

                    <StudentFilter onFilterChange={setFilters} />
                    {isSearching && <div className="p-4 text-center"><Spinner /></div>}

                    {searchResults && searchResults.length > 0 && (
                        <div className="mt-4 border rounded-md divide-y">
                            {searchResults.map(student => (
                                <div
                                    key={student.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                    onClick={() => handleSearchSelect(student)}
                                >
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-gray-500">{student.classLevel} {student.stream} • {student.studentId || 'No ID'}</p>
                                    </div>
                                    <Button variant="outline" size="sm">Select</Button>
                                </div>
                            ))}
                        </div>
                    )}
                    {hasActiveFilters && searchResults?.length === 0 && !isSearching && (
                        <div className="text-center p-4 text-gray-500">No students found</div>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Student Info Card */}
                    <Card className="md:col-span-1 h-fit">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold">{selectedStudent.name}</h3>
                            <p className="text-sm text-gray-500">Student Details</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Class:</span>
                                <span className="font-medium">{selectedStudent.classLevel} {selectedStudent.stream}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Boarding Status:</span>
                                <span className="font-medium">{selectedStudent.boardingStatus || 'N/A'}</span>
                            </div>
                            <div className="pt-4 border-t mt-4">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Invoice Status ({term}/{year})</div>
                                {activeInvoice ? (
                                    <>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Total Billed:</span>
                                            <span>{activeInvoice.totalAmount?.toLocaleString()} UGX</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-1 text-green-600">
                                            <span>Paid:</span>
                                            <span>{activeInvoice.amountPaid?.toLocaleString()} UGX</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg mt-2 text-red-600">
                                            <span>Balance Due:</span>
                                            <span>{activeInvoice.balance?.toLocaleString()} UGX</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                                        No invoice found for this Term/Year. <br />
                                        <span className="text-xs">Please generate invoices first.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Payment Form */}
                    <Card className="md:col-span-2">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold">New Transaction</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {renderSelect("Term", term, setTerm, [
                                    { value: "1", label: "Term 1" },
                                    { value: "2", label: "Term 2" },
                                    { value: "3", label: "Term 3" }
                                ])}
                                <Input
                                    label="Year"
                                    type="number"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    min={2020}
                                    max={2100}
                                />
                            </div>

                            {renderSelect("Fee Type", feeType, setFeeType, [
                                { value: "Tuition", label: "Tuition" },
                                { value: "Transport", label: "Transport" },
                                { value: "Uniform", label: "Uniform" },
                                { value: "Meals", label: "Meals" },
                                { value: "Development", label: "Development" },
                                { value: "Registration", label: "Registration" },
                                { value: "Other", label: "Other" }
                            ])}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount Due (Auto)</label>
                                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-right border border-transparent">
                                        {getAmountDue().toLocaleString()} UGX
                                    </div>
                                    {overrides?.some(o => o.feeType === feeType && o.term === parseInt(term) && o.year === parseInt(year)) && (
                                        <p className="text-xs text-amber-600">Custom amount applied</p>
                                    )}
                                </div>
                                <Input
                                    label="Amount Paid *"
                                    type="number"
                                    value={amountPaid}
                                    onChange={e => setAmountPaid(e.target.value)}
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>

                            {renderSelect("Payment Method", paymentMethod, setPaymentMethod, [
                                { value: "Cash", label: "Cash" },
                                { value: "Bank Deposit", label: "Bank Deposit" },
                                { value: "Cheque", label: "Cheque" }
                            ])}

                            <Input
                                label="Notes"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Receipt number, breakdown, etc."
                            />

                            <Button type="submit" fullWidth disabled={createPaymentMutation.isPending} loading={createPaymentMutation.isPending}>
                                Record Payment
                            </Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
