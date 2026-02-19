import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { AttendanceStats as StatsType } from '../../types/attendance';

interface AttendanceStatsProps {
    stats: StatsType;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ stats }) => {
    const { isDark } = useTheme();

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Staff</p>
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
                <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>On Leave</p>
                <p className="text-2xl font-bold text-blue-600">{stats.onLeave}</p>
            </div>
        </div>
    );
};
