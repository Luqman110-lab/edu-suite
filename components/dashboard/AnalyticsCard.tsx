
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon?: LucideIcon;
    trend?: number;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    chartData?: any[]; // Simple sparkline data
    isDark?: boolean;
}

const COLORS = {
    primary: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', stroke: '#3b82f6' },
    success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', stroke: '#10b981' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', stroke: '#f59e0b' },
    danger: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', stroke: '#ef4444' },
    info: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', stroke: '#06b6d4' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', stroke: '#8b5cf6' },
};

export function AnalyticsCard({
    title,
    value,
    subtext,
    icon: Icon,
    trend,
    color = 'primary',
    chartData,
    isDark = false
}: AnalyticsCardProps) {
    const styles = COLORS[color];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2.5 rounded-xl ${styles.bg} ${styles.text}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
                    </div>
                </div>

                {trend !== undefined && (
                    <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between">
                <div className="text-xs text-gray-400 dark:text-gray-500">
                    {subtext && <span>{subtext}</span>}
                </div>

                {chartData && (
                    <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={styles.stroke} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={styles.stroke} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={styles.stroke}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#gradient-${color})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
