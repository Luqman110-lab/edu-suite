import React from 'react';
import { P7ExamSet, Student, SubjectMarks } from '../../../../types';
import { Button } from '../../../../components/Button';
import { Download, BarChart } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface P7AnalysisProps {
    selectedSet: P7ExamSet;
    analysisStats: {
        withMarks: number;
        avgAggregate: string;
        avgTotal: string;
        passRate: string;
        divCounts: { I: number; II: number; III: number; IV: number; U: number };
        subjectAvgs: { [key: string]: number };
        topPerformers: { student: Student; marks: SubjectMarks; total: number; aggregate: number; division: string; }[];
    } | null;
    generateAssessmentSheet: () => void;
}

const divisionColors: { [key: string]: string } = {
    'I': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'II': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'III': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'IV': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'U': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    '-': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
};

const subjectNames: { [key: string]: string } = {
    english: 'English',
    maths: 'Mathematics',
    science: 'Science',
    sst: 'Social Studies'
};

export const P7Analysis: React.FC<P7AnalysisProps> = ({
    selectedSet,
    analysisStats,
    generateAssessmentSheet
}) => {
    const { isDark } = useTheme();

    if (!analysisStats) return (
        <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <BarChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No analysis data available</p>
            <p className="text-sm mt-1">Enter marks for this set to see performance analysis</p>
        </div>
    );

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedSet.name} - Performance Analysis
                </h2>
                <Button variant="outline" onClick={generateAssessmentSheet}>
                    <Download className="w-4 h-4 mr-1" />
                    Assessment Sheet
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.withMarks}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students with Marks</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.avgAggregate}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Average Aggregate</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.avgTotal}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Average Total</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold text-green-600`}>{analysisStats.passRate}%</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pass Rate</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Division Distribution</h3>
                    <div className="space-y-2">
                        {(['I', 'II', 'III', 'IV', 'U'] as const).map(div => (
                            <div key={div} className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold w-8 text-center ${divisionColors[div]}`}>{div}</span>
                                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${div === 'I' ? 'bg-green-500' : div === 'II' ? 'bg-blue-500' : div === 'III' ? 'bg-yellow-500' : div === 'IV' ? 'bg-purple-500' : 'bg-red-500'}`}
                                        style={{ width: `${analysisStats.withMarks > 0 ? (analysisStats.divCounts[div] / analysisStats.withMarks * 100) : 0}%` }}
                                    />
                                </div>
                                <span className={`text-sm w-8 text-right ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {analysisStats.divCounts[div]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Subject Performance</h3>
                    <div className="space-y-2">
                        {Object.entries(subjectNames).map(([key, name]) => (
                            <div key={key} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{name}</span>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {analysisStats.subjectAvgs[key]?.toFixed(1) || '-'}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${analysisStats.subjectAvgs[key] || 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Top Performers</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                            <tr>
                                <th className="px-3 py-2 text-left rounded-l-lg">Student</th>
                                <th className="px-3 py-2 text-center">Agg</th>
                                <th className="px-3 py-2 text-center">Total</th>
                                <th className="px-3 py-2 text-center rounded-r-lg">Div</th>
                            </tr>
                        </thead>
                        <tbody className={isDark ? 'divide-gray-700' : 'divide-gray-100'}>
                            {analysisStats.topPerformers.map((p, i) => (
                                <tr key={i} className={`border-b border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50`}>
                                    <td className="px-3 py-2 font-medium">
                                        <div className={isDark ? 'text-white' : 'text-gray-900'}>{p.student.name}</div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.student.stream}</div>
                                    </td>
                                    <td className={`px-3 py-2 text-center font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.aggregate}</td>
                                    <td className={`px-3 py-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{p.total}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${divisionColors[p.division]}`}>
                                            {p.division}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
