import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { GateStats as StatsType } from '../../types/gate';

interface GateStatsProps {
    stats: StatsType;
}

export const GateStats: React.FC<GateStatsProps> = ({ stats }) => {
    const { isDark } = useTheme();

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
            </div>
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </div>
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            </div>
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </div>
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Left Early</p>
                <p className="text-2xl font-bold text-orange-600">{stats.leftEarly}</p>
            </div>
        </div>
    );
};
