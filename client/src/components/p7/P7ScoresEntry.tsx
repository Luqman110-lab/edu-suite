import React, { useState } from 'react';
import { P7ExamSet, Student, SubjectMarks, SchoolSettings, SUBJECTS_UPPER } from '../../../../types';
import { Button } from '../../../../components/Button';
import { Save, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { calculateGrade } from '../../../../services/grading';

interface P7ScoresEntryProps {
    selectedSet: P7ExamSet;
    students: Student[];
    marksData: { [studentId: number]: SubjectMarks };
    handleMarkChange: (studentId: number, subject: string, value: string) => void;
    saveMarks: () => void;
    generateAssessmentSheet: () => void;
    saving: boolean;
    hasUnsavedChanges: boolean;
    getStudentResults: (studentId: number) => { marks: SubjectMarks; aggregate: number; division: string; total: number };
    positions: { [id: number]: number };
    settings: SchoolSettings | null;
}

const subjectNames: { [key: string]: string } = {
    english: 'English',
    maths: 'Mathematics',
    science: 'Science',
    sst: 'Social Studies'
};

const divisionColors: { [key: string]: string } = {
    'I': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'II': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'III': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'IV': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'U': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    '-': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
};

export const P7ScoresEntry: React.FC<P7ScoresEntryProps> = ({
    selectedSet,
    students,
    marksData,
    handleMarkChange,
    saveMarks,
    generateAssessmentSheet,
    saving,
    hasUnsavedChanges,
    getStudentResults,
    positions,
    settings
}) => {
    const { isDark } = useTheme();
    const [mobileViewIndex, setMobileViewIndex] = useState(0);

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedSet.name} - Marks Entry
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Set {selectedSet.setNumber} | Term {selectedSet.term}, {selectedSet.year}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={saveMarks} disabled={saving || !hasUnsavedChanges}>
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : 'Save Marks'}
                    </Button>
                    <Button variant="outline" onClick={generateAssessmentSheet}>
                        <Download className="w-4 h-4 mr-1" />
                        Assessment Sheet
                    </Button>
                </div>
            </div>

            {hasUnsavedChanges && (
                <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-sm">
                    You have unsaved changes
                </div>
            )}

            {students.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="font-medium">No P7 students found</p>
                    <p className="text-sm mt-1">Add students to P7 class first</p>
                </div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">#</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Name</th>
                                    {SUBJECTS_UPPER.map(sub => (
                                        <th key={sub} className="px-3 py-2 text-center text-xs font-semibold uppercase w-20">
                                            {subjectNames[sub]}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Total</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Agg</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Div</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Pos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => {
                                    const { marks, aggregate, division, total } = getStudentResults(student.id!);
                                    const pos = positions[student.id!];

                                    return (
                                        <tr key={student.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} ${idx % 2 === 0 ? '' : isDark ? 'bg-gray-750' : 'bg-gray-50/50'}`}>
                                            <td className="px-3 py-2 text-sm">{idx + 1}</td>
                                            <td className="px-3 py-2">
                                                <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream}</div>
                                            </td>
                                            {SUBJECTS_UPPER.map(sub => {
                                                const mark = (marks as any)[sub];
                                                const grade = calculateGrade(mark, settings?.gradingConfig);
                                                return (
                                                    <td key={sub} className="px-1 py-1 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={mark ?? ''}
                                                            onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                                            className={`w-16 px-2 py-1 text-center text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113]`}
                                                        />
                                                        {mark !== undefined && (
                                                            <div className={`text-xs mt-0.5 ${grade.grade.startsWith('D') || grade.grade.startsWith('C') ? 'text-green-600' : grade.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {grade.grade}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-center font-semibold text-sm">{total > 0 ? total : '-'}</td>
                                            <td className="px-3 py-2 text-center font-semibold text-sm">{aggregate > 0 ? aggregate : '-'}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${divisionColors[division] || divisionColors['-']}`}>
                                                    {division || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center font-semibold text-sm">{pos || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                        {students.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setMobileViewIndex(Math.max(0, mobileViewIndex - 1))}
                                        disabled={mobileViewIndex === 0}
                                        className={`p-2 rounded-lg ${mobileViewIndex === 0 ? 'opacity-30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {mobileViewIndex + 1} of {students.length}
                                    </span>
                                    <button
                                        onClick={() => setMobileViewIndex(Math.min(students.length - 1, mobileViewIndex + 1))}
                                        disabled={mobileViewIndex >= students.length - 1}
                                        className={`p-2 rounded-lg ${mobileViewIndex >= students.length - 1 ? 'opacity-30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>

                                {(() => {
                                    const student = students[mobileViewIndex];
                                    if (!student) return null;
                                    const { marks, aggregate, division, total } = getStudentResults(student.id!);
                                    const pos = positions[student.id!];

                                    return (
                                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h3>
                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${divisionColors[division] || divisionColors['-']}`}>
                                                    Div {division || '-'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                {SUBJECTS_UPPER.map(sub => {
                                                    const mark = (marks as any)[sub];
                                                    const grade = calculateGrade(mark, settings?.gradingConfig);
                                                    return (
                                                        <div key={sub}>
                                                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {subjectNames[sub]}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={mark ?? ''}
                                                                onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                                                className={`w-full px-3 py-2 text-center rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                                                            />
                                                            {mark !== undefined && (
                                                                <div className={`text-xs text-center mt-1 font-medium ${grade.grade.startsWith('D') || grade.grade.startsWith('C') ? 'text-green-600' : grade.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {grade.grade}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 pt-3 border-t dark:border-gray-600">
                                                <div className="text-center">
                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
                                                    <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{total > 0 ? total : '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aggregate</div>
                                                    <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{aggregate > 0 ? aggregate : '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Position</div>
                                                    <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pos || '-'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
