import React from 'react';
import { Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { useTheme } from '../../../../contexts/ThemeContext';

const { User, Phone, Mail, MapPin, Briefcase } = Icons;

interface GuardianCardProps {
    student: Student;
}

export const GuardianCard: React.FC<GuardianCardProps> = ({ student }) => {
    const { isDark } = useTheme();

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
                    <User size={18} />
                </div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>Parent / Guardian</h3>
            </div>
            <div className="p-6">
                {student.parentName ? (
                    <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-600'}`}>
                            <User size={24} />
                        </div>
                        <div className="space-y-1">
                            <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.parentName}</p>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Primary Guardian</p>

                            {student.parentContact && (
                                <div className="flex items-center gap-2 mt-3 text-sm">
                                    <Phone size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{student.parentContact}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`text-center py-6 border-2 border-dashed rounded-lg ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                        <User size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No guardian information added</p>
                    </div>
                )}
            </div>
        </div>
    );
};
