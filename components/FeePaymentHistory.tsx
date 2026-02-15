import React, { useState, useEffect } from 'react';
import { FeePayment, FeeStructure, SchoolSettings, StudentFeeOverride } from '../types';

// Helper for loose class matching (e.g. "P 1" == "P1")
const normalizeClassHelper = (raw: string): string => {
    if (!raw) return '';
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export const FeePaymentHistory = ({ studentId, studentName, classLevel, boardingStatus, currentYear, schoolSettings, isDark }: {
    studentId: number;
    studentName: string;
    classLevel: string;
    boardingStatus?: string;
    currentYear: number;
    schoolSettings?: SchoolSettings | null;
    isDark: boolean;
}) => {
    const [payments, setPayments] = useState<FeePayment[]>([]);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [overrides, setOverrides] = useState<StudentFeeOverride[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAllData();
    }, [studentId, classLevel]);

    const fetchAllData = async () => {
        setError(null);
        try {
            const [paymentsRes, structuresRes, overridesRes] = await Promise.all([
                fetch(`/api/fee-payments/student/${studentId}`, { credentials: 'include' }),
                fetch('/api/fee-structures', { credentials: 'include' }),
                fetch(`/api/student-fee-overrides/${studentId}`, { credentials: 'include' })
            ]);

            if (paymentsRes.ok) setPayments(await paymentsRes.json());
            if (structuresRes.ok) {
                const allStructures = await structuresRes.json();
                const filtered = allStructures.filter((fs: FeeStructure) =>
                    normalizeClassHelper(fs.classLevel) === normalizeClassHelper(classLevel) && fs.isActive !== false &&
                    (!fs.boardingStatus || fs.boardingStatus === 'all' || fs.boardingStatus === boardingStatus)
                );
                setFeeStructures(filtered);
            }
            if (overridesRes.ok) setOverrides(await overridesRes.json());
        } catch (err) {
            console.error('Failed to fetch data', err);
            setError('Failed to load fee data');
        }
        setLoading(false);
    };

    const getExpectedFeeAmount = (feeType: string, year?: number) => {
        const yr = year || currentYear;
        const override = overrides.find(o => o.feeType === feeType && o.year === yr && o.isActive !== false);
        if (override) return override.customAmount;
        const structure = feeStructures.find(fs => fs.feeType === feeType && (!fs.year || fs.year === yr));
        return structure?.amount || 0;
    };

    const calculateExpectedTotal = () => {
        const feeTypes = [...new Set([...feeStructures.map(fs => fs.feeType), ...overrides.filter(o => o.year === currentYear).map(o => o.feeType)])];
        return feeTypes.reduce((sum, feeType) => sum + getExpectedFeeAmount(feeType), 0);
    };

    const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

    // Scope payments to current year only for balance calculation
    const currentYearPayments = payments.filter(p => p.year === currentYear);
    const expectedTotal = calculateExpectedTotal();
    const recordedDue = currentYearPayments.reduce((sum, p) => sum + (p.amountDue || 0), 0);
    const totalDue = expectedTotal > 0 ? expectedTotal : recordedDue;
    const totalPaid = currentYearPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalBalance = Math.max(0, totalDue - totalPaid);

    if (loading) return <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading payments...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-green-50 border-green-100'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-green-800'}`}>Fee Payment History ({currentYear})</h3>
                </div>
            </div>

            <div className={`grid grid-cols-3 gap-4 p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                <div className="text-center">
                    <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Due</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{formatCurrency(totalDue)}</p>
                </div>
                <div className="text-center">
                    <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Paid</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="text-center">
                    <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Balance</p>
                    <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totalBalance)}</p>
                </div>
            </div>

            {payments.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No payment records found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                            <tr>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receipt</th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Term</th>
                                <th className={`px-4 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Due</th>
                                <th className={`px-4 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paid</th>
                                <th className={`px-4 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                            {payments.map((payment) => (
                                <tr key={payment.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{payment.paymentDate || '-'}</td>
                                    <td className={`px-4 py-3 text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{payment.receiptNumber || '-'}</td>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{payment.feeType}</td>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>T{payment.term} {payment.year}</td>
                                    <td className={`px-4 py-3 text-sm text-right ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{formatCurrency(payment.amountDue)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(payment.amountPaid)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                            payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                            {payment.status === 'paid' ? 'Paid' : payment.status === 'partial' ? 'Partial' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
