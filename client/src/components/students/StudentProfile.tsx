import React, { useState } from 'react';
import { Student } from '../../../../types';
import { ProfileHeader } from './ProfileHeader';
import { AcademicHistory } from './AcademicHistory';
import { PersonalInfoCard } from './PersonalInfoCard';
import { GuardianCard } from './GuardianCard';
import { MedicalInfoCard } from './MedicalInfoCard';
import { EmergencyContactsCard } from './EmergencyContactsCard';
import { useTheme } from '../../../../contexts/ThemeContext';
import { AttendanceSummaryCard, PerformanceTrendCard } from '../../../../components/StudentProfileCards';
import { Icons } from '../../lib/icons';
import { useClassNames } from '../../../../hooks/use-class-names';
import { Button } from '../../../../components/Button';

const { School, Trash2 } = Icons;

interface StudentProfileProps {
    student: Student;
    onEdit: () => void;
    onBack: () => void;
    onPrintID: () => void;
    onEnrollFace: () => void;
    hasFaceEnrolled: boolean;
    onDelete?: (id: number) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
    student,
    onEdit,
    onBack,
    onPrintID,
    onEnrollFace,
    hasFaceEnrolled,
    onDelete
}) => {
    const { isDark } = useTheme();
    const { getDisplayName } = useClassNames();
    const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'academic'>('overview');

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProfileHeader
                student={student}
                onEdit={onEdit}
                onBack={onBack}
                onPrintID={onPrintID}
                onEnrollFace={onEnrollFace}
                hasFaceEnrolled={hasFaceEnrolled}
                isDark={isDark}
            />

            {/* Tab Navigation */}
            <div className={`flex items-center gap-1 mb-6 border-b overflow-x-auto pb-1 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview'
                        ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                        : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === 'personal'
                        ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                        : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
                        }`}
                >
                    Personal Details
                </button>
                <button
                    onClick={() => setActiveTab('academic')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === 'academic'
                        ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                        : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
                        }`}
                >
                    Academic History
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AttendanceSummaryCard studentId={student.id!} isDark={isDark} />
                            <PerformanceTrendCard studentId={student.id!} isDark={isDark} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`col-span-1 md:col-span-3 rounded-lg border p-4 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                                        <School size={24} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Enrollment</p>
                                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getDisplayName(student.classLevel)} - {student.stream}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-4 border-l pl-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                                        <div className="flex gap-2 mt-1">
                                            {student.specialCases?.fees && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">Fees Due</span>}
                                            {!student.specialCases?.fees && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">Good Standing</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'personal' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <PersonalInfoCard student={student} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GuardianCard student={student} />
                            <MedicalInfoCard student={student} />
                        </div>
                        <EmergencyContactsCard student={student} />
                    </div>
                )}

                {activeTab === 'academic' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <PerformanceTrendCard studentId={student.id!} isDark={isDark} />
                        <AcademicHistory studentId={student.id!} />
                    </div>
                )}
            </div>

            {onDelete && (
                <div className={`mt-8 pt-6 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <Button variant="danger" size="sm" onClick={() => onDelete(student.id!)}>
                        <Trash2 size={14} className="mr-2" />
                        Delete Learner Record
                    </Button>
                </div>
            )}
        </div>
    );
};
