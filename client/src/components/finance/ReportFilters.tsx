import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { ReportType, FinancialReportFilters } from '../../types/finance';
import { Student, FeePayment } from '../../../../types';

interface ReportFiltersProps {
    selectedReport: ReportType;
    filters: FinancialReportFilters;
    onFilterChange: (filters: FinancialReportFilters) => void;
    payments: FeePayment[];
    students: Student[];
    generating: boolean;
    onGenerate: () => void;
    onExportExcel: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
    selectedReport,
    filters,
    onFilterChange,
    payments,
    students,
    generating,
    onGenerate,
    onExportExcel
}) => {
    const { isDark } = useTheme();

    const classLevels = ['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFilterChange({
            ...filters,
            [name]: name === 'term' || name === 'year' || name === 'paymentId' ? parseInt(value) || (name === 'paymentId' ? null : 0) : value
        });
    };

    const getStudentName = (studentId: number) => {
        const student = students.find(s => s.id === studentId);
        return student ? student.name : 'Unknown';
    };

    const formatCurrency = (amount: number) => {
        return `UGX ${amount.toLocaleString()}`;
    };

    return (
        <div className={`lg:col-span-2 rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Options</h2>

            {(selectedReport === 'fee-collection' || selectedReport === 'income-statement' || selectedReport === 'outstanding' || selectedReport === 'student-balances') && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                        <select
                            name="term"
                            value={filters.term}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                            <option value={1}>Term 1</option>
                            <option value={2}>Term 2</option>
                            <option value={3}>Term 3</option>
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                        <input
                            type="number"
                            name="year"
                            value={filters.year}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                        <select
                            name="classLevel"
                            value={filters.classLevel}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                            {classLevels.map(cl => (
                                <option key={cl} value={cl}>{cl === 'All' ? 'All Classes' : cl}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {selectedReport === 'expense' && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>From Date</label>
                        <input
                            type="date"
                            name="dateFrom"
                            value={filters.dateFrom || ''}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>To Date</label>
                        <input
                            type="date"
                            name="dateTo"
                            value={filters.dateTo || ''}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                    </div>
                </div>
            )}

            {selectedReport === 'receipt' && (
                <div className="mb-6">
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Payment</label>
                    <select
                        name="paymentId"
                        value={filters.paymentId || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                        <option value="">-- Select a payment --</option>
                        {payments.slice(0, 50).map(p => (
                            <option key={p.id} value={p.id}>
                                {getStudentName(p.studentId!)} - {p.feeType} - Term {p.term}, {p.year} - {formatCurrency(p.amountPaid)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Report Preview</h3>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedReport === 'fee-collection' && (
                        <p>This report will show all fee payments for {filters.classLevel === 'All' ? 'all classes' : filters.classLevel}, Term {filters.term}, {filters.year}, grouped by fee type with subtotals.</p>
                    )}
                    {selectedReport === 'expense' && (
                        <p>This report will list all expenses{filters.dateFrom || filters.dateTo ? ` from ${filters.dateFrom || 'start'} to ${filters.dateTo || 'present'}` : ''}, grouped by category.</p>
                    )}
                    {selectedReport === 'income-statement' && (
                        <p>This report will show revenue vs expenses for Term {filters.term}, {filters.year}, with net income calculation.</p>
                    )}
                    {selectedReport === 'outstanding' && (
                        <p>This report will list only students with unpaid balances for {filters.classLevel === 'All' ? 'all classes' : filters.classLevel}, Term {filters.term}, {filters.year}, sorted by amount owed.</p>
                    )}
                    {selectedReport === 'student-balances' && (
                        <p>This report shows ALL students with payment records for {filters.classLevel === 'All' ? 'all classes' : filters.classLevel}, Term {filters.term}, {filters.year}, with detailed fee breakdown showing what each student owes.</p>
                    )}
                    {selectedReport === 'receipt' && (
                        <p>Generate a printable receipt for a specific payment transaction.</p>
                    )}
                </div>
            </div>

            <Button
                onClick={onGenerate}
                disabled={generating || (selectedReport === 'receipt' && !filters.paymentId)}
                className="w-full"
            >
                {generating ? 'Generating...' : 'Generate & Download PDF'}
            </Button>

            <button
                onClick={onExportExcel}
                disabled={selectedReport === 'receipt'}
                className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-3 ${selectedReport === 'receipt'
                    ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isDark ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                    }`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
            </button>
        </div>
    );
};
