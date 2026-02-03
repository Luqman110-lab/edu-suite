import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ReportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: () => void;
    reportData: {
        student: {
            name: string;
            indexNumber?: string;
            classLevel: string;
            stream?: string;
            gender: string;
        };
        term: number;
        year: number;
        assessmentType: string;
        subjects: Array<{
            name: string;
            mark: number | undefined;
            grade: string;
            comment: string;
        }>;
        aggregate: number;
        division: string;
        position: string;
        classTeacherComment: string;
        headTeacherComment: string;
        schoolName?: string;
    };
}

export function ReportPreviewModal({ isOpen, onClose, onGenerate, reportData }: ReportPreviewModalProps) {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    const getDivisionColor = (division: string) => {
        switch (division) {
            case 'I': return 'text-green-600 dark:text-green-400';
            case 'II': return 'text-blue-600 dark:text-blue-400';
            case 'III': return 'text-yellow-600 dark:text-yellow-400';
            case 'IV': return 'text-purple-600 dark:text-purple-400';
            default: return 'text-red-600 dark:text-red-400';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`sticky top-0 z-10 px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Report Card Preview
                            </h2>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Review the report before generating PDF
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                    {/* School & Student Info */}
                    <div className="mb-6">
                        <div className="text-center mb-6">
                            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {reportData.schoolName || 'School Name'}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Term {reportData.term}, {reportData.year} - {reportData.assessmentType}
                            </p>
                        </div>

                        <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'
                            }`}>
                            <div>
                                <p className={`text-xs uppercase ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Student Name</p>
                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{reportData.student.name}</p>
                            </div>
                            <div>
                                <p className={`text-xs uppercase ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Index Number</p>
                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {reportData.student.indexNumber || '-'}
                                </p>
                            </div>
                            <div>
                                <p className={`text-xs uppercase ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Class</p>
                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {reportData.student.classLevel} {reportData.student.stream || ''}
                                </p>
                            </div>
                            <div>
                                <p className={`text-xs uppercase ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Gender</p>
                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {reportData.student.gender === 'M' ? 'Male' : 'Female'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="mb-6">
                        <h4 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Academic Performance
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={`${isDark ? 'bg-gray-750' : 'bg-gray-100'}`}>
                                    <tr>
                                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Subject</th>
                                        <th className={`px-4 py-3 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Mark</th>
                                        <th className={`px-4 py-3 text-center text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Grade</th>
                                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Comment</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    {reportData.subjects.map((subject, idx) => (
                                        <tr key={idx} className={isDark ? 'hover:bg-gray-750/50' : 'hover:bg-gray-50'}>
                                            <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {subject.name}
                                            </td>
                                            <td className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {subject.mark !== undefined ? subject.mark : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-sm font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-200'
                                                    }`}>
                                                    {subject.grade}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {subject.comment}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className={`grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg ${isDark ? 'bg-gradient-to-r from-indigo-900/30 to-purple-900/30' : 'bg-gradient-to-r from-indigo-50 to-purple-50'
                        }`}>
                        <div className="text-center">
                            <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Aggregate</p>
                            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {reportData.aggregate || '-'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Division</p>
                            <p className={`text-2xl font-bold ${getDivisionColor(reportData.division)}`}>
                                {reportData.division || '-'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Position</p>
                            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {reportData.position || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                            <p className={`text-xs uppercase mb-2 font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Class Teacher's Comment
                            </p>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {reportData.classTeacherComment}
                            </p>
                        </div>
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                            <p className={`text-xs uppercase mb-2 font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Head Teacher's Comment
                            </p>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {reportData.headTeacherComment}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`sticky bottom-0 px-6 py-4 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onGenerate();
                                onClose();
                            }}
                            className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Generate PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
