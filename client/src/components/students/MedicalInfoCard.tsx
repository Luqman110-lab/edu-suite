import React from 'react';
import { Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { useTheme } from '../../../../contexts/ThemeContext';

const { Heart, AlertCircle, User, Phone } = Icons;

interface MedicalInfoCardProps {
    student: Student;
}

export const MedicalInfoCard: React.FC<MedicalInfoCardProps> = ({ student }) => {
    const { isDark } = useTheme();

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-red-50/50 border-red-100'}`}>
                <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-white text-red-500 shadow-sm border border-red-100'}`}>
                    <Heart size={18} />
                </div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-red-900'}`}>Medical Information</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Blood Group</label>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                                {student.medicalInfo?.bloodGroup || '?'}
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</span>
                        </div>
                    </div>
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Allergies</label>
                        <div className={`mt-1 text-sm ${student.medicalInfo?.allergies ? (isDark ? 'text-red-300' : 'text-red-700') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                            {student.medicalInfo?.allergies ? (
                                <span className="flex items-start gap-1">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    {student.medicalInfo.allergies}
                                </span>
                            ) : 'None reported'}
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Medical Conditions</label>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{student.medicalInfo?.medicalConditions || 'None reported'}</p>
                    </div>
                    {(student.medicalInfo?.doctorName || student.medicalInfo?.doctorPhone) && (
                        <div className={`col-span-2 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Primary Physician</label>
                            <div className="flex items-center gap-3 mt-2">
                                <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <User size={14} />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                        {student.medicalInfo?.doctorName || 'Unknown Doctor'}
                                    </p>
                                    {student.medicalInfo?.doctorPhone && (
                                        <p className={`text-xs font-mono flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <Phone size={10} /> {student.medicalInfo.doctorPhone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
