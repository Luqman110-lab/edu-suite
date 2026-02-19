import React from 'react';
import { Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';

const { User, Calendar, MapPin, Hash, FileText, Clock, School, Heart, AlertCircle, Building, Home } = Icons;

interface PersonalInfoCardProps {
    student: Student;
}

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ student }) => {
    const { isDark } = useTheme();

    const isBoarding = student.boardingStatus === 'boarding';

    // Fetch bed assignment for boarders
    const { data: bedAssignment } = useQuery<{ bed: any; dormitory: any } | null>({
        queryKey: ['student-bed', student.id],
        queryFn: async () => {
            if (!student.id) return null;
            const res = await fetch(`/api/students/${student.id}/bed`, { credentials: 'include' });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: isBoarding && !!student.id,
        staleTime: 60 * 1000,
    });

    const infoItem = (icon: React.ReactNode, label: string, value: string | undefined | null) => (
        <div className="group">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{label}</label>
            </div>
            <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{value || '-'}</p>
        </div>
    );

    const iconCls = isDark ? 'text-gray-500' : 'text-gray-400';

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
                    {infoItem(<Calendar size={14} className={iconCls} />, 'Date of Birth', student.dateOfBirth)}
                    {infoItem(<MapPin size={14} className={iconCls} />, 'Nationality', student.nationality || 'Ugandan')}
                    {infoItem(<Hash size={14} className={iconCls} />, 'Religion', student.religion)}
                    {infoItem(<FileText size={14} className={iconCls} />, 'Pay Code', student.paycode)}
                    {infoItem(<Clock size={14} className={iconCls} />, 'Admission Date', student.admissionDate)}
                    {infoItem(<School size={14} className={iconCls} />, 'Previous School', student.previousSchool)}
                </div>

                {/* Boarding Section */}
                <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Home size={14} className={iconCls} />
                        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Boarding</label>
                        <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isBoarding
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                            {isBoarding ? '🏠 Boarder' : '🏫 Day Scholar'}
                        </span>
                    </div>

                    {isBoarding ? (
                        <div className={`rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 ${isDark ? 'bg-indigo-900/20 border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Building size={13} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Dormitory</span>
                                </div>
                                <p className={`text-sm font-semibold pl-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {bedAssignment?.dormitory?.name || student.houseOrDormitory || '—'}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs ml-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>🛏</span>
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Bed Number</span>
                                </div>
                                <p className={`text-sm font-semibold pl-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {bedAssignment?.bed
                                        ? `Bed ${bedAssignment.bed.bedNumber}${bedAssignment.bed.level && bedAssignment.bed.level !== 'Single' ? ` (${bedAssignment.bed.level})` : ''}`
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Hash size={13} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Status</span>
                                </div>
                                <p className={`text-sm font-semibold pl-5 ${bedAssignment?.bed
                                        ? isDark ? 'text-green-400' : 'text-green-700'
                                        : isDark ? 'text-amber-400' : 'text-amber-600'
                                    }`}>
                                    {bedAssignment?.bed ? '✓ Assigned' : 'Not Yet Assigned'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className={`text-sm pl-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            This student commutes daily.
                        </p>
                    )}
                </div>

                {/* Status Flags */}
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
