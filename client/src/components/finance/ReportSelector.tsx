import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ReportType } from '../../types/finance';

interface ReportOption {
    id: ReportType;
    name: string;
    icon: string;
    description: string;
}

const reports: ReportOption[] = [
    { id: 'fee-collection', name: 'Fee Collection Report', icon: '💰', description: 'All payments by term/year with totals' },
    { id: 'expense', name: 'Expense Report', icon: '📊', description: 'Expenses by category with date range' },
    { id: 'income-statement', name: 'Income Statement', icon: '📈', description: 'Revenue vs expenses summary' },
    { id: 'outstanding', name: 'Outstanding Fees', icon: '⚠️', description: 'Students with unpaid balances only' },
    { id: 'student-balances', name: 'Student Fee Balances', icon: '📋', description: 'All students with detailed fee breakdown' },
    { id: 'receipt', name: 'Payment Receipt', icon: '🧾', description: 'Individual payment receipts' }
];

interface ReportSelectorProps {
    selectedReport: ReportType;
    onSelect: (report: ReportType) => void;
}

export const ReportSelector: React.FC<ReportSelectorProps> = ({ selectedReport, onSelect }) => {
    const { isDark } = useTheme();

    return (
        <div className={`lg:col-span-1 rounded-lg shadow-sm border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Report</h2>
            <div className="space-y-2">
                {reports.map(report => (
                    <button
                        key={report.id}
                        onClick={() => onSelect(report.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedReport === report.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{report.icon}</span>
                            <div>
                                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{report.name}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{report.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
