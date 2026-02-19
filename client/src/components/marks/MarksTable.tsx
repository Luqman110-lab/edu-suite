import React from 'react';
import { Student, SubjectMarks, SUBJECTS_LOWER, SUBJECTS_UPPER, SchoolSettings } from '../../../../types';
import { calculateAggregate, calculateDivision, calculateGrade } from '../../../../services/grading';

interface MarksTableProps {
    students: Student[];
    subjects: string[];
    marksData: { [studentId: number]: SubjectMarks };
    comments: { [studentId: number]: string };
    lockedRows: Set<number>;
    absentStudents: Set<number>;
    sickStudents: Set<number>;
    selectedForDelete: Set<number>;

    handleMarkChange: (studentId: number, subject: string, val: string) => void;
    handleCommentChange: (studentId: number, comment: string) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, studentId: number, subject: string) => void;
    toggleLockRow: (studentId: number) => void;
    toggleAbsent: (studentId: number) => void;
    toggleSick: (studentId: number) => void;
    clearStudentMarks: (studentId: number) => void;
    toggleSelectForDelete: (studentId: number) => void;

    getRowStatus: (studentId: number) => string;
    getRowBgColor: (studentId: number) => string;
    getGradeColor: (mark: number | undefined) => string;

    inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    settings: SchoolSettings | null; // Needed for grading calculations in table display
    selectedClass: string; // Needed for grading calculations
    isDark: boolean;
}

export const MarksTable: React.FC<MarksTableProps> = ({
    students, subjects, marksData, comments,
    lockedRows, absentStudents, sickStudents, selectedForDelete,
    handleMarkChange, handleCommentChange, handleKeyDown,
    toggleLockRow, toggleAbsent, toggleSick, clearStudentMarks, toggleSelectForDelete,
    getRowStatus, getRowBgColor, getGradeColor,
    inputRefs, settings, selectedClass, isDark
}) => {
    return (
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="w-12 px-3 py-3 text-center">
                                <span className="sr-only">Delete</span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Student Name
                            </th>
                            {subjects.map(sub => (
                                <th key={sub} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                                    {sub === 'literacy1' ? 'LIT 1' : sub === 'literacy2' ? 'LIT 2' : sub.toUpperCase()}
                                </th>
                            ))}
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16 bg-gray-100/50 dark:bg-gray-700/30">AGG</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16 bg-gray-100/50 dark:bg-gray-700/30">DIV</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">Comments</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan={subjects.length + 5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No students found. Add students or check your filters.
                                </td>
                            </tr>
                        ) : (
                            students.map((student) => {
                                const marks = marksData[student.id!] || {};
                                const agg = calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
                                const div = calculateDivision(agg, selectedClass, settings?.gradingConfig);
                                const isLocked = lockedRows.has(student.id!);
                                const isAbsent = absentStudents.has(student.id!);
                                const isSick = sickStudents.has(student.id!);
                                const rowBg = getRowBgColor(student.id!);

                                return (
                                    <tr key={student.id} className={`${rowBg} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedForDelete.has(student.id!)}
                                                onChange={() => toggleSelectForDelete(student.id!)}
                                                className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                                            />
                                        </td>
                                        <td className={`px-4 py-2 sticky left-0 z-10 ${rowBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</span>
                                                <div className="flex items-center gap-2">
                                                    {student.stream && <span className="text-xs text-primary-600 dark:text-primary-400">{student.stream}</span>}
                                                    {isAbsent && <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Absent</span>}
                                                    {isSick && <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">Sick</span>}
                                                </div>
                                            </div>
                                        </td>
                                        {subjects.map(sub => {
                                            const val = (marks as any)[sub];
                                            const displayVal = val !== undefined ? val : '';
                                            return (
                                                <td key={sub} className="px-1 py-1 relative">
                                                    <input
                                                        ref={el => inputRefs.current[`${student.id}-${sub}`] = el}
                                                        type="number"
                                                        value={displayVal}
                                                        onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, student.id!, sub)}
                                                        disabled={isLocked || isAbsent || isSick}
                                                        className={`w-full text-center p-1.5 rounded border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 hover:border-gray-300 dark:hover:border-gray-600 ${isDark ? 'bg-transparent text-white' : 'bg-transparent text-gray-900'} ${getGradeColor(val)} disabled:opacity-50`}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/50">
                                            {isAbsent || isSick ? '-' : agg > 0 ? agg : '-'}
                                        </td>
                                        <td className="px-2 py-2 text-center font-bold text-primary-600 dark:text-primary-400 bg-gray-50/50 dark:bg-gray-800/50">
                                            {isAbsent || isSick ? '-' : div}
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={comments[student.id!] || ''}
                                                onChange={(e) => handleCommentChange(student.id!, e.target.value)}
                                                disabled={isLocked}
                                                placeholder="Add comment..."
                                                className="w-full text-sm p-1.5 rounded border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent dark:text-white"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => toggleLockRow(student.id!)}
                                                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors ${isLocked ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                    title={isLocked ? "Unlock" : "Lock"}
                                                >
                                                    {isLocked ? (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <div className="relative group">
                                                    <button className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                        </svg>
                                                    </button>
                                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 hidden group-hover:block z-20">
                                                        <button
                                                            onClick={() => toggleAbsent(student.id!)}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isAbsent ? 'text-primary-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                                        >
                                                            {isAbsent ? 'Unmark Absent' : 'Mark Absent'}
                                                        </button>
                                                        <button
                                                            onClick={() => toggleSick(student.id!)}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isSick ? 'text-orange-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                                        >
                                                            {isSick ? 'Unmark Sick' : 'Mark Sick'}
                                                        </button>
                                                        <button
                                                            onClick={() => clearStudentMarks(student.id!)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            Clear Marks
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
