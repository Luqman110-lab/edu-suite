import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, Award, BarChart3, Loader2 } from 'lucide-react';

interface AssessmentStatsProps {
    stats: any;
    analyzing: boolean;
    isDark: boolean;
}

export const AssessmentStats: React.FC<AssessmentStatsProps> = ({ stats, analyzing, isDark }) => {
    const divisionColors = ['#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ef4444'];

    if (analyzing) {
        return (
            <div className={`py-16 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3 text-[#7B1113]" />
                Analyzing class data...
            </div>
        );
    }

    if (!stats || stats.totalStudents === 0) {
        return (
            <div className={`py-16 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No assessment data found</p>
                <p className="text-sm mt-1">Enter marks to see analytics</p>
            </div>
        );
    }

    return (
        <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} pt-6`}>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-blue-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalStudents}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students with Results</div>
                        </div>
                    </div>
                </div>
                <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-green-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-green-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.passRate}%</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pass Rate</div>
                        </div>
                    </div>
                </div>
                <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-purple-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-purple-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.divisions[0]?.value || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Division I</div>
                        </div>
                    </div>
                </div>
                <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-amber-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-amber-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {Math.round(stats.subjects.reduce((sum: number, s: any) => sum + s.avg, 0) / stats.subjects.length) || 0}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Division Distribution */}
                <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Division Distribution</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.divisions} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} horizontal={false} />
                                <XAxis type="number" fontSize={10} tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }} />
                                <YAxis type="category" dataKey="name" fontSize={10} tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }} width={50} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                        borderRadius: '8px',
                                        color: isDark ? '#f3f4f6' : '#111827'
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {stats.divisions.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={divisionColors[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Comparison */}
                <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-4`}>Gender Comparison (Avg Aggregate)</h3>
                    <div className="flex items-center justify-around h-32">
                        <div className="text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                                <span className="text-2xl font-bold text-blue-600">{stats.gender.maleAvg}</span>
                            </div>
                            <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boys</div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stats.gender.maleCount} students</div>
                        </div>
                        <div className={`h-16 w-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                        <div className="text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${isDark ? 'bg-pink-900/30' : 'bg-pink-100'}`}>
                                <span className="text-2xl font-bold text-pink-600">{stats.gender.femaleAvg}</span>
                            </div>
                            <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Girls</div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stats.gender.femaleCount} students</div>
                        </div>
                    </div>
                </div>

                {/* Subject Performance */}
                <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Subject Performance</h3>
                    <div className="space-y-3">
                        {stats.subjects.map((sub: any) => (
                            <div key={sub.name} className="flex items-center gap-3">
                                <span className={`w-10 text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{sub.name}</span>
                                <div className={`flex-1 h-3 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                                    <div
                                        className={`h-full rounded-full ${sub.avg >= 50 ? 'bg-green-500' : sub.avg >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${sub.avg}%` }}
                                    ></div>
                                </div>
                                <span className={`w-12 text-right text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{sub.avg}%</span>
                                <span className={`w-8 text-xs font-medium ${sub.grade.startsWith('D') ? 'text-green-500' : sub.grade.startsWith('C') ? 'text-blue-500' : sub.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-500'}`}>{sub.grade}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            {stats.topPerformers && stats.topPerformers.length > 0 && (
                <div className={`${isDark ? 'bg-gradient-to-r from-[#7B1113]/20 to-gray-800 border-[#7B1113]/30' : 'bg-gradient-to-r from-amber-50 to-white border-amber-200'} p-4 rounded-xl border`}>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'} uppercase mb-3 flex items-center gap-2`}>
                        <Award className="w-4 h-4" /> Top 5 Performers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {stats.topPerformers.map((p: any, idx: number) => (
                            <div key={p.student.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} ${idx === 0 ? 'ring-2 ring-amber-400' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{p.student.name}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Agg: {p.aggregate}</span>
                                    <span className={`font-bold ${p.division === 'I' ? 'text-green-500' : p.division === 'II' ? 'text-blue-500' : 'text-yellow-500'}`}>Div {p.division}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
