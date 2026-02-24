import React from "react";
import { useClassStats } from "../../hooks/useClassStats";
import {
    Users,
    X,
    BookOpen,
    Activity,
    TrendingUp
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";

interface ClassOverviewProps {
    isOpen: boolean;
    onClose: () => void;
    classLevel: string;
    stream: string;
    term: number;
    year: number;
}

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];

export function ClassOverview({ isOpen, onClose, classLevel, stream, term, year }: ClassOverviewProps) {
    const { data: stats, isLoading, error } = useClassStats(classLevel, stream, term, year);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
                            Class Overview
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {classLevel} {stream} • Term {term}, {year}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white dark:bg-gray-700 text-gray-400 hover:text-gray-500 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-all hover:scale-105">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                            <p className="text-gray-500 font-medium animate-pulse">Loading class statistics...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
                            Failed to load data. Please try again.
                        </div>
                    ) : stats ? (
                        <div className="space-y-6">
                            {/* Top Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Enrollment Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Users className="w-24 h-24 text-blue-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Enrollment</h3>
                                        </div>
                                        <div className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                            {stats.enrollment.total}
                                        </div>

                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden flex">
                                            <div
                                                className="bg-blue-500 h-2.5"
                                                style={{ width: `${stats.enrollment.total > 0 ? (stats.enrollment.boys / stats.enrollment.total) * 100 : 0}%` }}
                                            ></div>
                                            <div
                                                className="bg-pink-500 h-2.5"
                                                style={{ width: `${stats.enrollment.total > 0 ? (stats.enrollment.girls / stats.enrollment.total) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium text-gray-500">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {stats.enrollment.boys} Boys</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span> {stats.enrollment.girls} Girls</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Activity className="w-24 h-24 text-green-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Today's Attendance</h3>
                                        </div>
                                        <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                            {stats.attendance.rate}%
                                        </div>
                                        <div className="flex items-center gap-4 text-sm mt-4">
                                            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg font-medium flex-1 text-center">
                                                {stats.attendance.presentToday} Present
                                            </div>
                                            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium flex-1 text-center">
                                                {stats.attendance.absentToday} Absent
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Setup for upcoming feature or extra metric */}
                                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-sm relative overflow-hidden text-white flex flex-col justify-center">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl transform -translate-x-5 translate-y-5"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                                <BookOpen className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="font-medium text-violet-100">Subjects</h3>
                                        </div>
                                        <div className="text-4xl font-bold mb-2">
                                            {stats.academic.length}
                                        </div>
                                        <p className="text-sm font-medium text-violet-200">
                                            Subjects with recorded marks
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Performance Chart */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">Academic Performance Average</h3>
                                            <p className="text-xs text-gray-500">Based on recorded marks for current term</p>
                                        </div>
                                    </div>
                                </div>

                                {stats.academic.length === 0 ? (
                                    <div className="h-[300px] flex items-center justify-center flex-col text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                                        <BookOpen className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No academic marks recorded yet for this term.</p>
                                    </div>
                                ) : (
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.academic} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis
                                                    dataKey="subject"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                                                    contentStyle={{
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                        fontWeight: 600
                                                    }}
                                                    formatter={(value) => [`${value}%`, 'Average']}
                                                />
                                                <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                                    {stats.academic.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
