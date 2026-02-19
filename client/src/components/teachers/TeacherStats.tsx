import React from 'react';
import { Teacher } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';

interface TeacherStatsProps {
    stats: {
        total: number;
        active: number;
        male: number;
        female: number;
        classTeachers: number;
        subjectTeachers: number;
        headteachers: number;
    };
    isDark: boolean;
}

export const TeacherStats: React.FC<TeacherStatsProps> = ({ stats, isDark }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Total Staff</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Active</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-blue-500">{stats.male}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Male</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-pink-500">{stats.female}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Female</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-purple-500">{stats.classTeachers}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Class Teachers</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-orange-500">{stats.subjectTeachers}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Subject Teachers</div>
            </div>
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="text-2xl font-bold text-[#7B1113]">{stats.headteachers}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Headteachers</div>
            </div>
        </div>
    );
};
