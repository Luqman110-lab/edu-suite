import React, { useMemo } from 'react';
import { Student } from '../../../../types';

const StatCard = ({ label, value, subtitle, icon, color, isDark }: { label: string; value: number; subtitle: string; icon: React.ReactNode; color: string; isDark: boolean }) => (
    <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
            <div>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
                <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</div>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        </div>
    </div>
);
import { Icons } from '../../lib/icons';

const { User, Building } = Icons;

interface StudentStatsProps {
    students: Student[];
    filteredStudents: Student[];
    isDark: boolean;
}

export const StudentStats: React.FC<StudentStatsProps> = ({ students, filteredStudents, isDark }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
                label="Total Learners"
                value={filteredStudents.length}
                subtitle="100% of selected"
                icon={<User size={24} />}
                color="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                isDark={isDark}
            />

            <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gender Split</div>
                <div className="flex items-end gap-2 mt-1">
                    <div className="flex flex-col">
                        <span className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {filteredStudents.filter(s => s.gender === 'M').length}
                        </span>
                        <span className="text-[10px] uppercase text-gray-500">Male</span>
                    </div>
                    <div className={`h-8 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    <div className="flex flex-col">
                        <span className={`text-xl font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                            {filteredStudents.filter(s => s.gender === 'F').length}
                        </span>
                        <span className="text-[10px] uppercase text-gray-500">Female</span>
                    </div>
                </div>
            </div>

            <StatCard
                label="Boarding Status"
                value={filteredStudents.filter(s => s.boardingStatus === 'boarding').length}
                subtitle="Total Boarders"
                icon={<Building size={24} />}
                color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                isDark={isDark}
            />

            <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Boarders by Gender</div>
                <div className="flex items-end gap-3 mt-1">
                    <div>
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {filteredStudents.filter(s => s.boardingStatus === 'boarding' && s.gender === 'M').length}
                        </span>
                        <span className={`block text-[10px] ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Boys</span>
                    </div>
                    <div>
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {filteredStudents.filter(s => s.boardingStatus === 'boarding' && s.gender === 'F').length}
                        </span>
                        <span className={`block text-[10px] ${isDark ? 'text-pink-300' : 'text-pink-600'}`}>Girls</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
