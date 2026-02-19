import React from 'react';
import { Student } from '../../../../types';
import { Button } from '../../../../components/Button';
import { Icons } from '../../lib/icons';
import { BirthdayBadge } from '../../../../components/StudentProfileCards';
import { useClassNames } from '../../../../hooks/use-class-names';

const { School, User, Building, Printer } = Icons;

interface ProfileHeaderProps {
    student: Student;
    onEdit: () => void;
    onBack: () => void;
    onPrintID: () => void;
    onEnrollFace: () => void;
    hasFaceEnrolled: boolean;
    isDark: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    student,
    onEdit,
    onBack,
    onPrintID,
    onEnrollFace,
    hasFaceEnrolled,
    isDark
}) => {
    const { getDisplayName } = useClassNames();

    return (
        <div className={`rounded-2xl shadow-sm border overflow-hidden mb-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Animated Gradient Banner */}
            <div className="h-48 relative bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

                {/* Decorative Blur Circles */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="absolute top-4 left-6">
                    <Button variant="ghost" size="sm" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                        <div className="flex items-center gap-1">
                            <span className="text-lg">←</span>
                            <span>Back to Directory</span>
                        </div>
                    </Button>
                </div>
            </div>

            <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row justify-between items-end -mt-16 gap-6">

                    {/* Avatar and Main Info */}
                    <div className="flex flex-col md:flex-row items-end md:items-end gap-6">
                        <div className="relative group">
                            <div className={`h-32 w-32 rounded-full p-1.5 shadow-xl ${isDark ? 'bg-gray-800 ring-4 ring-gray-800' : 'bg-white ring-4 ring-white'}`}>
                                {student.photoBase64 ? (
                                    <img
                                        src={student.photoBase64}
                                        alt={student.name}
                                        className="h-full w-full rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                    />
                                ) : (
                                    <div className={`h-full w-full rounded-full flex items-center justify-center text-4xl font-bold border-2 ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-500 border-white'}`}>
                                        {student.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-white dark:border-gray-900 bg-green-500 shadow-sm" title="Active Student"></div>
                        </div>

                        <div className="mb-2 text-center md:text-left z-10 relative pt-2">
                            <h1 className={`text-4xl md:text-5xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-gray-900 drop-shadow-sm'}`}>{student.name}</h1>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${isDark ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                    <School size={14} />
                                    <span>{getDisplayName(student.classLevel)} {student.stream}</span>
                                </div>

                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${student.gender === 'M' ? (isDark ? 'bg-sky-900/30 border-sky-800 text-sky-300' : 'bg-sky-50 border-sky-100 text-sky-700') : (isDark ? 'bg-pink-900/30 border-pink-800 text-pink-300' : 'bg-pink-50 border-pink-100 text-pink-700')}`}>
                                    <User size={14} />
                                    <span>{student.gender === 'M' ? 'Male' : 'Female'}</span>
                                </div>

                                {student.boardingStatus && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${student.boardingStatus === 'boarding' ? (isDark ? 'bg-purple-900/30 border-purple-800 text-purple-300' : 'bg-purple-50 border-purple-100 text-purple-700') : (isDark ? 'bg-gray-800/80 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600')}`}>
                                        <Building size={14} />
                                        <span>{student.boardingStatus === 'boarding' ? 'Boarder' : 'Day Scholar'}</span>
                                    </div>
                                )}

                                <BirthdayBadge dateOfBirth={student.dateOfBirth} isDark={isDark} />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-2 flex-wrap justify-center md:justify-end w-full md:w-auto">
                        <Button
                            variant="outline"
                            className={`${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50'}`}
                            onClick={onPrintID}
                        >
                            <Printer size={16} className="mr-2" />
                            Print ID
                        </Button>

                        <Button
                            variant={hasFaceEnrolled ? "outline" : "secondary"}
                            className={hasFaceEnrolled ? (isDark ? 'border-green-800 text-green-400' : 'border-green-200 text-green-700 bg-green-50') : ''}
                            onClick={onEnrollFace}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${hasFaceEnrolled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                {hasFaceEnrolled ? 'Face Enrolled' : 'Enroll Face'}
                            </div>
                        </Button>

                        <Button onClick={onEdit} className="shadow-lg shadow-primary-600/20">
                            Edit Profile
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};
