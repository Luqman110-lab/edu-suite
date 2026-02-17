import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../FinancialHub';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Percent } from 'lucide-react';

interface HubStats {
    totalDue: number;
    totalCollected: number;
    totalOutstanding: number;
    totalExpenses: number;
    netIncome: number;
    collectionRate: number;
    invoiceCount: number;
}

interface DebtorSummary {
    totalDebtors: number;
    totalOutstanding: number;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
}

export default function DashboardTab() {
    const { theme } = useTheme();
    const { term, year, formatCurrency } = useFinance();

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

    const { data: hubStats, isLoading: statsLoading } = useQuery<HubStats>({
        queryKey: ['/api/finance/hub-stats', term, year],
        queryFn: async () => {
            const res = await fetch(`/api/finance/hub-stats?term=${term}&year=${year}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
    });

    const { data: debtorData, isLoading: debtorsLoading } = useQuery<{ debtors: unknown[]; summary: DebtorSummary }>({
        queryKey: ['/api/finance/debtors', term, year],
        queryFn: async () => {
            const res = await fetch(`/api/finance/debtors?term=${term}&year=${year}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch debtors');
            return res.json();
        },
    });

    const debtorSummary = debtorData?.summary;

    const isLoading = statsLoading || debtorsLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    const agingChartData = debtorSummary ? [
        { name: 'Current', value: debtorSummary.current, color: '#10B981' },
        { name: '1-30 Days', value: debtorSummary.days1to30, color: '#3B82F6' },
        { name: '31-60 Days', value: debtorSummary.days31to60, color: '#F59E0B' },
        { name: '61-90 Days', value: debtorSummary.days61to90, color: '#EF4444' },
        { name: '90+ Days', value: debtorSummary.days90plus, color: '#DC2626' },
    ].filter(d => d.value > 0) : [];

    const kpiCards = [
        {
            label: 'Total Due',
            value: formatCurrency(hubStats?.totalDue || 0),
            sub: `${hubStats?.invoiceCount || 0} invoices`,
            icon: <FileText className="w-5 h-5" />,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
        },
        {
            label: 'Collected',
            value: formatCurrency(hubStats?.totalCollected || 0),
            sub: `${hubStats?.collectionRate || 0}% collection rate`,
            icon: <TrendingUp className="w-5 h-5" />,
            iconBg: 'bg-green-100 dark:bg-green-900/30 text-green-600',
            valueColor: 'text-green-500',
        },
        {
            label: 'Outstanding',
            value: formatCurrency(hubStats?.totalOutstanding || 0),
            sub: `${debtorSummary?.totalDebtors || 0} debtors`,
            icon: <TrendingDown className="w-5 h-5" />,
            iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600',
            valueColor: 'text-red-500',
        },
        {
            label: 'Net Income',
            value: formatCurrency(hubStats?.netIncome || 0),
            sub: `Expenses: ${formatCurrency(hubStats?.totalExpenses || 0)}`,
            icon: <DollarSign className="w-5 h-5" />,
            iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
            valueColor: (hubStats?.netIncome || 0) >= 0 ? 'text-green-500' : 'text-red-500',
        },
        {
            label: 'Collection Rate',
            value: `${hubStats?.collectionRate || 0}%`,
            sub: `${hubStats?.invoiceCount || 0} invoices`,
            icon: <Percent className="w-5 h-5" />,
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
            valueColor: (hubStats?.collectionRate || 0) >= 80 ? 'text-green-500' : (hubStats?.collectionRate || 0) >= 50 ? 'text-yellow-500' : 'text-red-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiCards.map((card) => (
                    <div key={card.label} className={`${bgCard} rounded-xl p-5 border ${borderColor}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${card.iconBg}`}>{card.icon}</div>
                            <span className={`text-sm font-medium ${textSecondary}`}>{card.label}</span>
                        </div>
                        <div className={`text-xl font-bold ${card.valueColor || textPrimary}`}>{card.value}</div>
                        <div className={`text-xs ${textSecondary} mt-1`}>{card.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection Progress */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Collection Progress</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className={textSecondary}>Collection Rate</span>
                            <span className={textPrimary}>{hubStats?.collectionRate || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                            <div
                                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(hubStats?.collectionRate || 0, 100)}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-green-600 font-bold">{formatCurrency(hubStats?.totalCollected || 0)}</div>
                                <div className="text-xs text-green-600">Collected</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="text-red-600 font-bold">{formatCurrency(hubStats?.totalOutstanding || 0)}</div>
                                <div className="text-xs text-red-600">Pending</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aging Distribution */}
                <div className={`${bgCard} rounded-xl p-6 border ${borderColor}`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Outstanding by Age</h3>
                    {agingChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={agingChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {agingChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-gray-500">
                            No outstanding balances
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
