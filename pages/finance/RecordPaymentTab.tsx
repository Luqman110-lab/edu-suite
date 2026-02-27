import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { StudentFilter, FilterState } from '@/components/StudentFilter';
import { Button } from '../../components/Button';
import { Card, Input, Spinner } from '../../components/UIComponents';
import { ArrowLeft, ChevronDown, CheckCircle, Printer } from 'lucide-react';
import { FEE_TYPES } from '@/lib/constants';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    boardingStatus?: string;
}

export default function RecordPaymentTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isDark = theme === 'dark';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '', classLevel: '', stream: '', boardingStatus: '',
    });
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [feeType, setFeeType] = useState('Tuition');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [lastReceipt, setLastReceipt] = useState<{ studentName: string; amount: number; feeType: string; receiptNumber?: string } | null>(null);

    const hasActiveFilters = filters.classLevel || filters.stream || filters.boardingStatus || (filters.searchQuery && filters.searchQuery.length >= 2);

    const { data: searchResults, isLoading: isSearching } = useQuery<Student[]>({
        queryKey: ['students-search-payment', filters.searchQuery, filters.classLevel, filters.stream, filters.boardingStatus],
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

    const { data: invoices } = useQuery<any[]>({
        queryKey: ['student-invoices-payment', selectedStudent?.id, term, year],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/invoices?studentId=${selectedStudent!.id}&term=${term}&year=${year}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const activeInvoice = invoices?.[0];

    const createPaymentMutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const res = await apiRequest('POST', '/api/fee-payments', data);
            return res.json();
        },
        onSuccess: (result) => {
            setLastReceipt({
                studentName: selectedStudent!.name,
                amount: parseInt(amountPaid),
                feeType,
                receiptNumber: result.receiptNumber,
            });
            toast({ title: 'Payment Recorded', description: 'Transaction saved successfully.' });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
            queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/hub-stats'] });
            setAmountPaid('');
            setNotes('');
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to record payment', description: error.message, variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const amount = Math.round(Number(amountPaid));
        if (isNaN(amount) || amount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a positive amount.', variant: 'destructive' });
            return;
        }

        createPaymentMutation.mutate({
            studentId: selectedStudent.id,
            feeType,
            amountPaid: amount,
            term,
            year,
            paymentMethod,
            notes,
        });
    };

    const renderSelect = (label: string, value: string, onChange: (val: string) => void, options: { value: string; label: string }[]) => (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
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

    // Success receipt view
    if (lastReceipt) {
        return (
            <div className="max-w-lg mx-auto text-center space-y-6 py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className={`text-xl font-bold ${textPrimary}`}>Payment Recorded</h3>
                <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`text-sm ${textSecondary} mb-1`}>Student</div>
                    <div className={`font-medium ${textPrimary} mb-3`}>{lastReceipt.studentName}</div>
                    <div className={`text-sm ${textSecondary} mb-1`}>Amount</div>
                    <div className="text-2xl font-bold text-green-500 mb-3">{formatCurrency(lastReceipt.amount)}</div>
                    <div className={`text-sm ${textSecondary} mb-1`}>Fee Type</div>
                    <div className={`font-medium ${textPrimary} mb-3`}>{lastReceipt.feeType}</div>
                    {lastReceipt.receiptNumber && (
                        <>
                            <div className={`text-sm ${textSecondary} mb-1`}>Receipt #</div>
                            <div className={`font-mono ${textPrimary}`}>{lastReceipt.receiptNumber}</div>
                        </>
                    )}
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => {
                        try {
                            const doc = new jsPDF({ format: 'a5' });

                            doc.setFontSize(18);
                            doc.setFont('helvetica', 'bold');
                            doc.text('PAYMENT RECEIPT', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

                            doc.setFontSize(10);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Date: ${new Date().toLocaleDateString('en-UG')}`, 14, 40);
                            if (lastReceipt.receiptNumber) {
                                doc.text(`Receipt #: ${lastReceipt.receiptNumber}`, 14, 47);
                            }

                            doc.setFontSize(12);
                            doc.text(`Student:      ${lastReceipt.studentName}`, 14, 60);
                            doc.text(`Fee Type:     ${lastReceipt.feeType}`, 14, 68);

                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(14);
                            doc.text(`Amount Paid: UGX ${lastReceipt.amount.toLocaleString()}`, 14, 85);

                            doc.setFontSize(10);
                            doc.setFont('helvetica', 'italic');
                            doc.text('Thank you for your payment!', doc.internal.pageSize.getWidth() / 2, 110, { align: 'center' });

                            doc.save(`Receipt_${lastReceipt.receiptNumber || 'Payment'}.pdf`);
                        } catch {
                            toast({ title: 'Error', description: 'Failed to generate receipt PDF. Ensure jspdf is loaded.', variant: 'destructive' });
                        }
                    }}>
                        <Printer className="w-4 h-4 mr-2" /> Print Receipt
                    </Button>
                    <Button variant="outline" onClick={() => { setLastReceipt(null); setSelectedStudent(null); }}>
                        New Payment
                    </Button>
                    <Button onClick={() => setLastReceipt(null)}>
                        Record Another for {selectedStudent?.name}
                    </Button>
                </div>
            </div>
        );
    }

    if (!selectedStudent) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Record Payment</h3>
                    <p className={`text-sm ${textSecondary}`}>Search for a student to record a payment</p>
                </div>

                <StudentFilter onFilterChange={setFilters} />
                {isSearching && <div className="p-4 text-center"><Spinner /></div>}

                {searchResults && searchResults.length > 0 && (
                    <div className="border rounded-md divide-y dark:border-gray-700 dark:divide-gray-700">
                        {searchResults.map(student => (
                            <div
                                key={student.id}
                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex justify-between items-center"
                                onClick={() => setSelectedStudent(student)}
                            >
                                <div>
                                    <p className={`font-medium ${textPrimary}`}>{student.name}</p>
                                    <p className={`text-sm ${textSecondary}`}>{student.classLevel} {student.stream}</p>
                                </div>
                                <Button variant="outline" size="sm">Select</Button>
                            </div>
                        ))}
                    </div>
                )}
                {hasActiveFilters && searchResults?.length === 0 && !isSearching && (
                    <div className={`text-center p-4 ${textSecondary}`}>No students found</div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setSelectedStudent(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
                </Button>
            </div>

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
                            <span className="text-gray-500">Boarding:</span>
                            <span className="font-medium">{selectedStudent.boardingStatus || 'N/A'}</span>
                        </div>
                        <div className="pt-4 border-t mt-4">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Invoice Status (T{term}/{year})</div>
                            {activeInvoice ? (
                                <>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Total Billed:</span>
                                        <span>{formatCurrency(activeInvoice.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1 text-green-600">
                                        <span>Paid:</span>
                                        <span>{formatCurrency(activeInvoice.amountPaid)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg mt-2 text-red-600">
                                        <span>Balance Due:</span>
                                        <span>{formatCurrency(activeInvoice.balance)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
                                    No invoice found for this Term/Year.
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
                        {renderSelect('Fee Type', feeType, setFeeType,
                            FEE_TYPES.map(t => ({ value: t, label: t }))
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount Due (Auto)</label>
                                <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-right border border-transparent">
                                    {formatCurrency(activeInvoice?.balance || 0)}
                                </div>
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

                        {renderSelect('Payment Method', paymentMethod, setPaymentMethod, [
                            { value: 'Cash', label: 'Cash' },
                            { value: 'Bank Deposit', label: 'Bank Deposit' },
                            { value: 'Cheque', label: 'Cheque' },
                            { value: 'Mobile Money', label: 'Mobile Money' },
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
        </div>
    );
}
