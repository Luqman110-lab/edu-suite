import React, { useState, useEffect, useMemo } from 'react';

import { Icons } from '../client/src/lib/icons';
import { useTeacherAttendance } from '../client/src/hooks/useHR';

// ============ TYPES ============
interface ClassPerformance {
    classStream: string;
    subject: string;
    averageScore: number;
    studentCount: number;
    term: string;
}

// ============ ATTENDANCE SUMMARY CARD ============
interface AttendanceSummaryCardProps {
    teacherId: number;
    isDark: boolean;
    onViewDetails?: () => void;
}

export const TeacherAttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
    teacherId,
    isDark,
    onViewDetails,
}) => {
    const { attendanceHistory: attendance, isLoading: loading } = useTeacherAttendance(teacherId);

    const stats = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthRecords = attendance.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const present = monthRecords.filter(r => ['Present', 'Late', 'Half-day'].includes(r.status)).length;
        const late = monthRecords.filter(r => r.status === 'Late').length;
        const absent = monthRecords.filter(r => r.status === 'Absent').length;
        const halfDay = monthRecords.filter(r => r.status === 'Half-day').length;
        const total = monthRecords.length || 1;
        const rate = Math.round((present / total) * 100);

        return { present, late, absent, onLeave, total, rate };
    }, [attendance]);

    // Circular progress calculation
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const progress = (stats.rate / 100) * circumference;

    if (loading) {
        return (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
                <div className="animate-pulse space-y-4">
                    <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/3`}></div>
                    <div className="h-24 flex items-center justify-center">
                        <div className={`w-24 h-24 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Attendance Summary</h3>
                </div>
                {onViewDetails && (
                    <button
                        onClick={onViewDetails}
                        className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} flex items-center gap-1`}
                    >
                        View All <Icons.ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="p-6">
                <div className="flex items-center gap-6">
                    {/* Circular Progress */}
                    <div className="relative">
                        <svg className="w-28 h-28 transform -rotate-90">
                            <circle
                                cx="56"
                                cy="56"
                                r={radius}
                                fill="none"
                                stroke={isDark ? '#374151' : '#e5e7eb'}
                                strokeWidth="8"
                            />
                            <circle
                                cx="56"
                                cy="56"
                                r={radius}
                                fill="none"
                                stroke={stats.rate >= 90 ? '#10b981' : stats.rate >= 75 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - progress}
                                className="transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.rate}%</span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This Month</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                            <div className="text-lg font-bold text-green-500">{stats.present}</div>
                            <div className={`text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>Present</div>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                            <div className="text-lg font-bold text-amber-500">{stats.late}</div>
                            <div className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Late</div>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                            <div className="text-lg font-bold text-red-500">{stats.absent}</div>
                            <div className={`text-xs ${isDark ? 'text-red-400' : 'text-red-700'}`}>Absent</div>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                            <div className="text-lg font-bold text-blue-500">{stats.halfDay}</div>
                            <div className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Half-day</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============ PERFORMANCE METRICS CARD ============
interface PerformanceMetricsCardProps {
    teacherId: number;
    teachingClasses: string[];
    subjects: string[];
    isDark: boolean;
}

export const TeacherPerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({
    teacherId,
    teachingClasses,
    subjects,
    isDark,
}) => {
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState<ClassPerformance[]>([]);

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                // Mock data for now - in production, this would call the API
                const mockData: ClassPerformance[] = teachingClasses.slice(0, 3).map((tc, idx) => ({
                    classStream: tc,
                    subject: subjects[0] || 'General',
                    averageScore: Math.round(55 + Math.random() * 30),
                    studentCount: Math.round(25 + Math.random() * 15),
                    term: 'Term 1',
                }));
                setPerformance(mockData);
            } catch (error) {
                console.error('Error fetching performance:', error);
            } finally {
                setLoading(false);
            }
        };

        if (teachingClasses.length > 0) {
            fetchPerformance();
        } else {
            setLoading(false);
        }
    }, [teacherId, teachingClasses, subjects]);

    const overallAverage = useMemo(() => {
        if (performance.length === 0) return 0;
        return Math.round(performance.reduce((sum, p) => sum + p.averageScore, 0) / performance.length);
    }, [performance]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 65) return 'text-blue-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    const getBarWidth = (score: number) => `${Math.min(score, 100)}%`;

    if (loading) {
        return (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
                <div className="animate-pulse space-y-4">
                    <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/3`}></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (teachingClasses.length === 0) {
        return (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
                    <Icons.Award className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Class Performance</h3>
                </div>
                <div className="p-6">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic text-center py-4`}>
                        No teaching classes assigned
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.Award className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Class Performance</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg:</span>
                    <span className={`text-lg font-bold ${getScoreColor(overallAverage)}`}>{overallAverage}%</span>
                    {overallAverage >= 65 ? (
                        <Icons.TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                        <Icons.TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                </div>
            </div>
            <div className="p-6 space-y-4">
                {performance.map((p, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between mb-1.5">
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {p.classStream.replace('-', ' ')}
                            </span>
                            <span className={`text-sm font-bold ${getScoreColor(p.averageScore)}`}>{p.averageScore}%</span>
                        </div>
                        <div className={`h-2.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${p.averageScore >= 80 ? 'bg-green-500' :
                                    p.averageScore >= 65 ? 'bg-blue-500' :
                                        p.averageScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                style={{ width: getBarWidth(p.averageScore) }}
                            />
                        </div>
                        <div className={`flex justify-between mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <span>{p.subject}</span>
                            <span>{p.studentCount} students</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============ QUICK STATS CARD ============
interface QuickStatsCardProps {
    totalStudents: number;
    totalClasses: number;
    totalSubjects: number;
    yearsOfService: number;
    isDark: boolean;
}

export const TeacherQuickStatsCard: React.FC<QuickStatsCardProps> = ({
    totalStudents,
    totalClasses,
    totalSubjects,
    yearsOfService,
    isDark,
}) => {
    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
                <Icons.Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Quick Stats</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'} border text-center`}>
                        <div className={`text-3xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{totalStudents}</div>
                        <div className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'} uppercase font-medium mt-1`}>Students</div>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'} border text-center`}>
                        <div className={`text-3xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{totalClasses}</div>
                        <div className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} uppercase font-medium mt-1`}>Classes</div>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'} border text-center`}>
                        <div className={`text-3xl font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>{totalSubjects}</div>
                        <div className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'} uppercase font-medium mt-1`}>Subjects</div>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-800' : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'} border text-center`}>
                        <div className={`text-3xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{yearsOfService}</div>
                        <div className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'} uppercase font-medium mt-1`}>Years</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default {
    TeacherAttendanceSummaryCard,
    TeacherPerformanceMetricsCard,
    TeacherQuickStatsCard,
};
