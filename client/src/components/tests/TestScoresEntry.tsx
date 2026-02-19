import React, { useState } from 'react';
import { TestSession, Student, TestScore, SUBJECTS_LOWER, SUBJECTS_UPPER, SchoolSettings } from '../../../../types';
import { Save, Search } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { calculateGrade } from '../../../../services/grading';

interface TestScoresEntryProps {
    session: TestSession;
    students: Student[];
    testScores: { [studentId: number]: TestScore };
    loading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    handleRawMarkChange: (studentId: number, subject: string, value: string) => void;
    saveAllScores: () => void;
    onBack: () => void;
    settings: SchoolSettings | null;
}

export const TestScoresEntry: React.FC<TestScoresEntryProps> = ({
    session,
    students,
    testScores,
    loading,
    isSaving,
    hasUnsavedChanges,
    handleRawMarkChange,
    saveAllScores,
    onBack,
    settings
}) => {
    const { isDark } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const subjects = ['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

    const getSubjectLabel = (sub: string) => {
        const labels: { [key: string]: string } = {
            english: 'ENG',
            maths: 'MTC',
            science: 'SCI',
            sst: 'SST',
            literacy1: 'LIT1',
            literacy2: 'LIT2'
        };
        return labels[sub] || sub.toUpperCase();
    };

    const getGradeColor = (grade: string) => {
        if (grade === 'D1' || grade === 'D2') return 'text-green-600 dark:text-green-400';
        if (['C3', 'C4', 'C5', 'C6'].includes(grade)) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getDivisionColor = (div: string) => {
        if (div === 'I') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (div === 'II') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        if (div === 'III') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        if (div === 'IV') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <button
                        onClick={onBack}
                        className={`text-sm hover:underline mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}
                    >
                        ← Back to Tests
                    </button>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{session.name}</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {session.classLevel}{session.stream ? ` - ${session.stream}` : ''} • {session.testType} • Term {session.term}, {session.year}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={saveAllScores}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${hasUnsavedChanges
                            ? 'bg-primary-600 hover:bg-primary-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save All'}
                    </button>
                </div>
            </div>

            <div className={`p-4 rounded-xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {students.length} students • {Object.values(testScores).filter((s: TestScore) => Object.values(s.rawMarks).some(v => v !== undefined)).length} with scores
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
            ) : (
                <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                                <tr>
                                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-16 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Student</th>
                                    {subjects.map(sub => (
                                        <th key={sub} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`} style={{ minWidth: '100px' }}>
                                            <div>{getSubjectLabel(sub)}</div>
                                            <div className="text-gray-400 font-normal">/{(session.maxMarks as any)[sub] || 10}</div>
                                        </th>
                                    ))}
                                    <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>AGG</th>
                                    <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>DIV</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {filteredStudents.map((student, idx) => {
                                    const score = testScores[student.id!] || { rawMarks: {}, convertedMarks: {}, aggregate: 0, division: '' };
                                    return (
                                        <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30`}>
                                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream ? `${student.classLevel} - ${student.stream}` : student.classLevel}</div>
                                            </td>
                                            {subjects.map(sub => {
                                                const rawMark = (score.rawMarks as any)?.[sub];
                                                const convertedMark = (score.convertedMarks as any)?.[sub];
                                                const grade = convertedMark !== undefined ? calculateGrade(convertedMark, settings?.gradingConfig).grade : '-';
                                                return (
                                                    <td key={sub} className="px-2 py-2">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={(session.maxMarks as any)[sub] || 10}
                                                                value={rawMark ?? ''}
                                                                onChange={e => handleRawMarkChange(student.id!, sub, e.target.value)}
                                                                className={`w-16 px-2 py-1 text-center border rounded text-sm focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                                placeholder="0"
                                                            />
                                                            {convertedMark !== undefined && (
                                                                <div className="flex items-center gap-1 text-xs">
                                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{convertedMark}%</span>
                                                                    <span className={`font-medium ${getGradeColor(grade)}`}>{grade}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {score.aggregate && score.aggregate > 0 ? score.aggregate : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {score.division ? (
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getDivisionColor(score.division)}`}>
                                                        {score.division}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
