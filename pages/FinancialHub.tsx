import { useState, lazy, Suspense, createContext, useContext } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Lazy load finance tabs
const DashboardTab = lazy(() => import('./finance/DashboardTab'));
const StudentAccountsTab = lazy(() => import('./finance/StudentAccountsTab'));
const RecordPaymentTab = lazy(() => import('./finance/RecordPaymentTab'));
const InvoicesTab = lazy(() => import('./finance/InvoicesTab'));
const DebtorsTab = lazy(() => import('./finance/DebtorsTab'));
const FeeStructuresTab = lazy(() => import('./finance/FeeStructuresTab'));
const ExpensesTab = lazy(() => import('./finance/ExpensesTab'));
const ScholarshipsTab = lazy(() => import('./finance/ScholarshipsTab'));
const ReportsTab = lazy(() => import('./finance/ReportsTab'));

interface FinanceContextValue {
    term: number;
    year: number;
    formatCurrency: (amount: number) => string;
}

export const FinanceContext = createContext<FinanceContextValue>({
    term: 1,
    year: new Date().getFullYear(),
    formatCurrency: () => '',
});

export function useFinance() {
    return useContext(FinanceContext);
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
    }).format(amount);

type TabKey = 'dashboard' | 'accounts' | 'payments' | 'invoices' | 'debtors' | 'structures' | 'expenses' | 'scholarships' | 'reports';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'accounts', label: 'Student Accounts' },
    { key: 'payments', label: 'Record Payment' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'debtors', label: 'Debtors' },
    { key: 'structures', label: 'Fee Structures' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'scholarships', label: 'Scholarships' },
    { key: 'reports', label: 'Reports' },
];

export default function FinancialHub() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
    const [selectedTerm, setSelectedTerm] = useState(1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const isDark = theme === 'dark';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const spinner = (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
    );

    const ctxValue: FinanceContextValue = { term: selectedTerm, year: selectedYear, formatCurrency };

    const renderTab = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab />;
            case 'accounts': return <StudentAccountsTab />;
            case 'payments': return <RecordPaymentTab />;
            case 'invoices': return <InvoicesTab />;
            case 'debtors': return <DebtorsTab />;
            case 'structures': return <FeeStructuresTab />;
            case 'expenses': return <ExpensesTab />;
            case 'scholarships': return <ScholarshipsTab />;
            case 'reports': return <ReportsTab />;
        }
    };

    return (
        <FinanceContext.Provider value={ctxValue}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Financial Hub</h1>
                        <p className={textSecondary}>Unified view of school finances</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                            className={`px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                        >
                            <option value={1}>Term 1</option>
                            <option value={2}>Term 2</option>
                            <option value={3}>Term 3</option>
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className={`px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textPrimary}`}
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'border-blue-500 text-blue-500'
                                    : `border-transparent ${textSecondary} hover:text-blue-500`
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <Suspense fallback={spinner}>
                    {renderTab()}
                </Suspense>
            </div>
        </FinanceContext.Provider>
    );
}
