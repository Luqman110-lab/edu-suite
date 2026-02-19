import React from 'react';
import { Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { useTheme } from '../../../../contexts/ThemeContext';

const { User, Calendar, MapPin, Hash, FileText, Clock, School, Heart, AlertCircle } = Icons;

interface PersonalInfoCardProps {
    student: Student;
}

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ student }) => {
    const { isDark } = useTheme();

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
                    <User size={18} />
                </div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>Personal Details</h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Date of Birth</label>
                        </div>
                        <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.dateOfBirth || '-'}</p>
                    </div>
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Nationality</label>
                        </div>
                        <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.nationality || 'Ugandan'}</p>
                    </div>
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <Hash size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Religion</label>
                        </div>
                        <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.religion || '-'}</p>
                    </div>
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Pay Code</label>
                        </div>
                        <p className={`text-sm font-mono font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.paycode || '-'}</p>
                    </div>
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Admission Date</label>
                        </div>
                        <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.admissionDate || '-'}</p>
                    </div>
                    <div className="group">
                        <div className="flex items-center gap-2 mb-1">
                            <School size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Previous School</label>
                        </div>
                        <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.previousSchool || '-'}</p>
                    </div>
                </div>

                <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <label className={`text-xs font-semibold uppercase mb-3 block ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Status Flags</label>
                    <div className="flex flex-wrap gap-2">
                        {(!student.specialCases?.fees && !student.specialCases?.sickness && !student.specialCases?.absenteeism) ? (
                            <span className={`text-sm italic flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                No active flags
                            </span>
                        ) : (
                            <>
                                {student.specialCases?.sickness && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full font-medium border border-red-200 dark:border-red-800">
                                        <Heart size={12} className="fill-current" /> Medical Attention
                                    </span>
                                )}
                                {student.specialCases?.absenteeism && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full font-medium border border-orange-200 dark:border-orange-800">
                                        <AlertCircle size={12} /> Chronic Absenteeism
                                    </span>
                                )}
                                {student.specialCases?.fees && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full font-medium border border-yellow-200 dark:border-yellow-800">
                                        <span className="text-lg leading-none">💰</span> Fees Outstanding
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
