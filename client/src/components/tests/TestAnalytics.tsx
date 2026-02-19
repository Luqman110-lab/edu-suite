import React from 'react';
import { TestSession, Student, TestScore, SUBJECTS_LOWER, SUBJECTS_UPPER, SchoolSettings } from '../../../../types';
import { FileText, Award } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { calculateGrade } from '../../../../services/grading';

interface TestAnalyticsProps {
    session: TestSession;
    students: Student[];
    testScores: { [studentId: number]: TestScore };
    onBack: () => void;
    onGenerateReport: (student: Student) => void;
    settings: SchoolSettings | null;
}

export const TestAnalytics: React.FC<TestAnalyticsProps> = ({
    session,
    students,
    testScores,
    onBack,
    onGenerateReport,
    settings
}) => {
    const { isDark } = useTheme();

    const getDivisionColor = (div: string) => {
        if (div === 'I') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (div === 'II') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        if (div === 'III') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        if (div === 'IV') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    };

    const sortedStudents = [...students].sort((a, b) => {
        const scoreA = testScores[a.id!];
        const scoreB = testScores[b.id!];
        const aggA = scoreA?.aggregate || 999;
        const aggB = scoreB?.aggregate || 999;
        return aggA - aggB;
    });

    const stats = React.useMemo(() => {
        const scores = Object.values(testScores).filter(s => s.aggregate && s.aggregate > 0);
        if (scores.length === 0) return null;

        const totalAgg = scores.reduce((sum, s) => sum + (s.aggregate || 0), 0);
        const avgAgg = (totalAgg / scores.length).toFixed(1);

        const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
        scores.forEach(s => {
            if (s.division && s.division in divCounts) {
                divCounts[s.division as keyof typeof divCounts]++;
            }
        });

        const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
        const passRate = ((passCount / scores.length) * 100).toFixed(1);

        return { avgAgg, divCounts, passRate, count: scores.length };
    }, [testScores]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <button
                        onClick={onBack}
                        className={`text-sm hover:underline mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}
                    >
                        ← Back to Tests
                    </button>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{session.name} - Results</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {session.classLevel}{session.stream ? ` - ${session.stream}` : ''} • Term {session.term}, {session.year}
                    </p>
                    <p className={`text-xs mt-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        💡 Click on a student's name to generate their term progress report
                    </p>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.count}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students with Scores</div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.avgAgg}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Average Aggregate</div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border ${isDark ? 'border-green-900/30' : 'border-green-100'}`}>
                        <div className="text-2xl font-bold text-green-600">{stats.passRate}%</div>
                        <div className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>Pass Rate</div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex gap-2 items-end">
                            {Object.entries(stats.divCounts).map(([div, count]) => (
                                <div key={div} className="flex flex-col items-center flex-1">
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-sm relative h-12 flex items-end justify-center">
                                        <div
                                            className={`w-full rounded-t-sm ${div === 'I' ? 'bg-green-500' : div === 'II' ? 'bg-blue-500' : div === 'III' ? 'bg-yellow-500' : div === 'IV' ? 'bg-purple-500' : 'bg-red-500'}`}
                                            style={{ height: `${stats.count > 0 ? (count / stats.count) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className={`text-[10px] font-bold mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{div}</div>
                                    <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                            <tr>
                                <th className={`px-4 py-3 text-left w-12 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Pos</th>
                                <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Student</th>
                                <th className={`px-4 py-3 text-center w-24 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>AGG</th>
                                <th className={`px-4 py-3 text-center w-24 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>DIV</th>
                                <th className={`px-4 py-3 text-center w-24 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {sortedStudents.map((student, idx) => {
                                const score = testScores[student.id!];
                                if (!score || Object.values(score.convertedMarks).every(v => v === undefined)) return null;

                                let pos = idx + 1;
                                // Simple ranking logic (can be improved to handle ties if needed, but sort handles order)

                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className={`px-4 py-3 font-medium ${pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-gray-400' : pos === 3 ? 'text-orange-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {pos <= 3 ? <Award className="w-4 h-4" /> : pos}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => onGenerateReport(student)}
                                                className={`hover:underline font-medium text-left ${isDark ? 'text-white' : 'text-gray-900'}`}
                                            >
                                                {student.name}
                                            </button>
                                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.classLevel} - {student.stream}</div>
                                        </td>
                                        <td className={`px-4 py-3 text-center font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {score.aggregate}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getDivisionColor(score.division || '-')}`}>
                                                {score.division}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onGenerateReport(student)}
                                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'}`}
                                                title="Generate Report"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
