import React, { ReactNode } from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    subtitle?: string;
    icon: ReactNode;
    color?: string; // e.g. "text-blue-500 bg-blue-100" or just a text color class if icon handles bg
    isDark: boolean;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subtitle,
    icon,
    color = 'text-primary-500',
    isDark,
    className = ''
}) => {
    return (
        <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {value}
                    </p>
                    {subtitle && <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${color}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};
