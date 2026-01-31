import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    // change, // Future use
    // trend,  // Future use
    color = "blue"
}) => {

    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        pink: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
        red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    };

    const iconClass = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${iconClass}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {/* Future trend indicator placed here */}
        </div>
    );
};
