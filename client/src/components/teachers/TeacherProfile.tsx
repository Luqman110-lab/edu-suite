import React, { useMemo } from 'react';
import { Teacher, Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { Button } from '../../../../components/Button';
import { TeacherAttendanceSummaryCard, TeacherPerformanceMetricsCard, TeacherQuickStatsCard } from '../../../../components/TeacherProfileCards';

interface TeacherProfileProps {
    teacher: Teacher;
    students: Student[];
    onEdit: () => void;
    onDelete: () => void;
    onBack: () => void;
    onEnrollFace: () => void;
    hasFaceEnrolled: boolean;
    isDark: boolean;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({
    teacher,
    students,
    onEdit,
    onDelete,
    onBack,
    onEnrollFace,
    hasFaceEnrolled,
    isDark
}) => {
    const roles = teacher.roles || [];
    const teachingClasses = (teacher.teachingClasses || []).map(tc => String(tc));
    const subjects = teacher.subjects || [];
    const initials = teacher.initials || (teacher.name || '').split(' ').map(n => n?.[0] || '').join('').substring(0, 2);

    const studentsForTeacher = useMemo(() => {
        if (roles.includes('Class Teacher') && teacher.assignedClass && teacher.assignedStream) {
            return students.filter(s => s.classLevel === teacher.assignedClass && s.stream === teacher.assignedStream);
        }
        if (roles.includes('Subject Teacher') && teachingClasses.length > 0) {
            return students.filter(s => {
                return teachingClasses.some(tc => {
                    if (tc.includes('-')) {
                        const [cls, stream] = tc.split('-');
                        return s.classLevel === cls && s.stream === stream;
                    }
                    return s.classLevel === tc;
                });
            });
        }
        return [];
    }, [teacher, students, roles, teachingClasses]);

    const yearsOfService = useMemo(() => {
        if (!teacher.dateJoined) return 0;
        const joined = new Date(teacher.dateJoined);
        const now = new Date();
        return Math.floor((now.getTime() - joined.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }, [teacher.dateJoined]);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={onBack}
                className={`flex items-center gap-2 mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'} transition-colors`}
            >
                <Icons.ArrowLeft className="w-5 h-5" />
                <span>Back to Staff Directory</span>
            </button>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border mb-6 overflow-hidden`}>
                <div className="h-28 bg-gradient-to-r from-[#7B1113] to-[#1E3A5F]"></div>
                <div className="px-6 pb-6">
                    <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-14 mb-4 gap-4">
                        <div className="flex items-end">
                            <div className={`h-28 w-28 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'} p-1 shadow-lg overflow-hidden`}>
                                {teacher.photoBase64 ? (
                                    <img src={teacher.photoBase64} alt={teacher.name} className={`h-full w-full rounded-full object-cover border-4 ${isDark ? 'border-gray-700' : 'border-white'}`} />
                                ) : (
                                    <div className={`h-full w-full rounded-full bg-gradient-to-br from-[#7B1113] to-[#1E3A5F] flex items-center justify-center text-2xl font-bold text-white border-4 ${isDark ? 'border-gray-700' : 'border-white'}`}>
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="ml-4 mb-2">
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</h2>
                                {teacher.employeeId && (
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {teacher.employeeId}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {roles.map(role => (
                                        <span key={role} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white text-xs font-medium">
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={onEnrollFace}>
                                <Icons.Camera className="w-4 h-4 mr-1" /> {hasFaceEnrolled ? 'Update Face' : 'Enroll Face'}
                            </Button>
                            <Button size="sm" onClick={onEdit}>
                                <Icons.Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
                        <Icons.Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Contact Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Phone</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.phone || '—'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Email</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} break-all`}>{teacher.email || '—'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Gender</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.gender === 'M' ? 'Male' : 'Female'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Status</label>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${teacher.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {teacher.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
                        <Icons.GraduationCap className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Professional Details</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Qualifications</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.qualifications || '—'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Date Joined</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.dateJoined || '—'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Employee ID</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.employeeId || '—'}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Initials</label>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.initials || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
                        <Icons.Award className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Academic Assignments</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {roles.includes('Class Teacher') && (
                            <div className={`${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg border`}>
                                <h4 className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-800'} uppercase mb-2`}>Class Teacher</h4>
                                <p className={`text-xl font-bold ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>{teacher.assignedClass} {teacher.assignedStream}</p>
                                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} mt-1`}>Responsible for report card signing</p>
                            </div>
                        )}

                        {roles.includes('Subject Teacher') && (
                            <div>
                                <h4 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Subject Teaching</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Subjects</label>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {subjects.map(sub => (
                                                <span key={sub} className={`px-2.5 py-1 ${isDark ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'} text-xs rounded-lg border uppercase font-semibold`}>
                                                    {sub}
                                                </span>
                                            ))}
                                            {subjects.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>None assigned</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Classes & Streams</label>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {teachingClasses.map(cls => (
                                                <span key={cls} className={`px-2.5 py-1 ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200'} text-xs rounded-lg border font-medium`}>
                                                    {cls.includes('-') ? cls.replace('-', ' ') : cls}
                                                </span>
                                            ))}
                                            {teachingClasses.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>None assigned</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!roles.includes('Class Teacher') && !roles.includes('Subject Teacher') && (
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>Administrative role only</p>
                        )}
                    </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                            <Icons.Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Workload Summary</h3>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border text-center`}>
                                <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{studentsForTeacher.length}</div>
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium mt-1`}>Students</div>
                            </div>
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border text-center`}>
                                <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{teachingClasses.length || (teacher.assignedClass ? 1 : 0)}</div>
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium mt-1`}>Classes</div>
                            </div>
                        </div>
                        {roles.includes('Class Teacher') && studentsForTeacher.length > 0 && (
                            <div>
                                <h4 className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Student Breakdown</h4>
                                <div className="flex gap-4 text-sm">
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                                        <span className="font-medium">{studentsForTeacher.filter(s => s.gender === 'M').length}</span> Boys
                                    </span>
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                                        <span className="font-medium">{studentsForTeacher.filter(s => s.gender === 'F').length}</span> Girls
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <TeacherAttendanceSummaryCard teacherId={teacher.id!} isDark={isDark} />
                <TeacherQuickStatsCard
                    totalStudents={studentsForTeacher.length}
                    totalClasses={teachingClasses.length || (teacher.assignedClass ? 1 : 0)}
                    totalSubjects={subjects.length}
                    yearsOfService={yearsOfService}
                    isDark={isDark}
                />
            </div>

            {roles.includes('Subject Teacher') && teachingClasses.length > 0 && (
                <div className="mb-6">
                    <TeacherPerformanceMetricsCard
                        teacherId={teacher.id!}
                        teachingClasses={teachingClasses}
                        subjects={subjects}
                        isDark={isDark}
                    />
                </div>
            )}

            <div className={`flex justify-end border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
                <Button variant="danger" onClick={onDelete}>
                    <Icons.Trash className="w-4 h-4 mr-1.5" /> Delete Teacher
                </Button>
            </div>
        </div>
    );
};
