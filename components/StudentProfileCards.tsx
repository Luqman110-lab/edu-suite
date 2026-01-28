import React, { useState, useEffect } from 'react';

interface AttendanceSummaryCardProps {
    studentId: number;
    isDark: boolean;
}

interface AttendanceStats {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
}

export const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({ studentId, isDark }) => {
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttendanceStats();
    }, [studentId]);

    const fetchAttendanceStats = async () => {
        try {
            // Fetch gate attendance for this student
            const response = await fetch(`/api/gate-attendance?studentId=${studentId}`, { credentials: 'include' });
            if (response.ok) {
                const records = await response.json();

                const totalDays = records.length;
                const present = records.filter((r: any) => r.status === 'present' || r.status === 'on_time').length;
                const late = records.filter((r: any) => r.status === 'late').length;
                const absent = totalDays - present - late;
                const attendanceRate = totalDays > 0 ? Math.round((present + late) / totalDays * 100) : 100;

                setStats({ totalDays, present, absent, late, attendanceRate });
            } else {
                // No records found, show default
                setStats({ totalDays: 0, present: 0, absent: 0, late: 0, attendanceRate: 100 });
            }
        } catch (err) {
            console.error('Failed to fetch attendance:', err);
            setStats({ totalDays: 0, present: 0, absent: 0, late: 0, attendanceRate: 100 });
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4">
                        <div className={`h-4 rounded w-1/2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <div className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <div className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <div className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const getAttendanceColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600';
        if (rate >= 75) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-2 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-blue-50 border-blue-100'}`}>
                <span className="text-lg">📊</span>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-blue-800'}`}>Attendance Summary</h3>
            </div>
            <div className="p-6">
                {stats && stats.totalDays > 0 ? (
                    <>
                        {/* Attendance Rate Circle */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke={isDark ? '#374151' : '#e5e7eb'}
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke={stats.attendanceRate >= 90 ? '#10b981' : stats.attendanceRate >= 75 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - stats.attendanceRate / 100)}`}
                                        strokeLinecap="round"
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className={`text-3xl font-bold ${getAttendanceColor(stats.attendanceRate)}`}>
                                        {stats.attendanceRate}%
                                    </span>
                                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Attendance</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalDays}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Days</p>
                            </div>
                            <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Present</p>
                            </div>
                            <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late</p>
                            </div>
                            <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Absent</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p className="text-4xl mb-2">📅</p>
                        <p>No attendance records found</p>
                        <p className="text-sm">Attendance will appear here once recorded</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface PerformanceTrendCardProps {
    studentId: number;
    isDark: boolean;
}

interface TermPerformance {
    term: string;
    year: number;
    aggregate: number;
    division: string;
    type: string;
}

export const PerformanceTrendCard: React.FC<PerformanceTrendCardProps> = ({ studentId, isDark }) => {
    const [performance, setPerformance] = useState<TermPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, [studentId]);

    const fetchPerformance = async () => {
        try {
            const response = await fetch(`/api/marks`, { credentials: 'include' });
            if (response.ok) {
                const allMarks = await response.json();
                const studentMarks = allMarks
                    .filter((m: any) => m.studentId === studentId && m.aggregate)
                    .sort((a: any, b: any) => {
                        if (a.year !== b.year) return a.year - b.year;
                        return a.term - b.term;
                    })
                    .slice(-8); // Last 8 records

                const formatted = studentMarks.map((m: any) => ({
                    term: `T${m.term}/${m.year.toString().slice(-2)}`,
                    year: m.year,
                    aggregate: m.aggregate || 0,
                    division: m.division || 'U',
                    type: m.type || 'EOT'
                }));

                setPerformance(formatted);
            }
        } catch (err) {
            console.error('Failed to fetch performance:', err);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="animate-pulse h-48 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}"></div>
            </div>
        );
    }

    const maxAggregate = Math.max(...performance.map(p => p.aggregate), 60);
    const minAggregate = Math.min(...performance.map(p => p.aggregate), 0);

    const getDivisionColor = (division: string) => {
        switch (division) {
            case 'I': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
            case 'II': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
            case 'III': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
            case 'IV': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-2 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-purple-50 border-purple-100'}`}>
                <span className="text-lg">📈</span>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-purple-800'}`}>Performance Trend</h3>
            </div>
            <div className="p-6">
                {performance.length > 0 ? (
                    <>
                        {/* Simple Bar Chart */}
                        <div className="h-48 flex items-end gap-2 mb-4">
                            {performance.map((p, index) => {
                                const height = ((maxAggregate - p.aggregate) / (maxAggregate - minAggregate + 10)) * 100;
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80 relative group"
                                            style={{
                                                height: `${Math.max(20, 100 - height)}%`,
                                                backgroundColor: p.division === 'I' ? '#10b981' :
                                                    p.division === 'II' ? '#3b82f6' :
                                                        p.division === 'III' ? '#f59e0b' :
                                                            p.division === 'IV' ? '#f97316' : '#6b7280'
                                            }}
                                        >
                                            {/* Tooltip */}
                                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
                                                Agg: {p.aggregate} • Div {p.division}
                                            </div>
                                        </div>
                                        <div className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {p.term}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Recent Performance Summary */}
                        <div className={`border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Latest Result</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {performance[performance.length - 1]?.aggregate || '-'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getDivisionColor(performance[performance.length - 1]?.division)}`}>
                                            Div {performance[performance.length - 1]?.division || '-'}
                                        </span>
                                    </div>
                                </div>

                                {performance.length > 1 && (
                                    <div className="text-right">
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trend</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {performance[performance.length - 1]?.aggregate < performance[performance.length - 2]?.aggregate ? (
                                                <>
                                                    <span className="text-green-600 text-xl">↑</span>
                                                    <span className="text-green-600 font-medium">Improving</span>
                                                </>
                                            ) : performance[performance.length - 1]?.aggregate > performance[performance.length - 2]?.aggregate ? (
                                                <>
                                                    <span className="text-red-600 text-xl">↓</span>
                                                    <span className="text-red-600 font-medium">Declining</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-gray-500 text-xl">→</span>
                                                    <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stable</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p className="text-4xl mb-2">📊</p>
                        <p>No academic records found</p>
                        <p className="text-sm">Performance will appear here after marks are entered</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface BirthdayBadgeProps {
    dateOfBirth?: string;
    isDark: boolean;
}

export const BirthdayBadge: React.FC<BirthdayBadgeProps> = ({ dateOfBirth, isDark }) => {
    if (!dateOfBirth) return null;

    const today = new Date();
    const dob = new Date(dateOfBirth);

    const isBirthday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();

    if (!isBirthday) return null;

    const age = today.getFullYear() - dob.getFullYear();

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full animate-pulse ${isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
            }`}>
            <span className="text-lg">🎂</span>
            <span className="text-sm font-medium">Happy {age}th Birthday!</span>
        </div>
    );
};

export default AttendanceSummaryCard;
