import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export interface DivisionData { division: string; count: number; }
export interface ClassPerformance { class: string; avgAggregate: number; }
export interface SubjectAverage { subject: string; average: number; }
export interface GenderData { name: string; value: number; }

interface AcademicSnapshotProps {
    divisionData: DivisionData[];
    classPerformance: ClassPerformance[];
    subjectAverages: SubjectAverage[];
    genderData: GenderData[];
    isDark?: boolean;
}

const PIE_COLORS = ['#3b82f6', '#ec4899'];

export function AcademicSnapshot({ divisionData, classPerformance, subjectAverages, genderData, isDark = false }: AcademicSnapshotProps) {
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#f3f4f6';
    const tooltipStyle = { backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#fff' : '#000' };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Academic Snapshot</h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Division Distribution */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Division Distribution</h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={divisionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="division" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? '#374151' : '#f3f4f6' }} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subject Averages */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Subject Averages (%)</h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectAverages} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} />
                                <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} width={80} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? '#374151' : '#f3f4f6' }} />
                                <Bar dataKey="average" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Gender Distribution</h4>
                    <div className="h-[200px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Class Performance Table */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Class Performance (Avg. Aggregate)</h4>
                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden h-[200px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Class</th>
                                    <th className="px-4 py-3 font-medium text-right">Avg Aggregate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {classPerformance.length > 0 ? classPerformance.map((cls, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white capitalize">{cls.class}</td>
                                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{cls.avgAggregate}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-500">No data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
