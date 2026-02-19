import React, { useState } from 'react';
import { AssessmentType, Student } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Search } from 'lucide-react';

interface StudentPreview {
    student: Student;
    botMarks: any;
    eotMarks: any;
    botPosition: string;
    eotPosition: string;
    hasMissingMarks: boolean;
}

interface StudentReportListProps {
    previews: StudentPreview[];
    reportType: AssessmentType;
    selectedStudentIds: Set<number>;
    toggleStudentSelection: (id: number) => void;
    toggleAllSelection: () => void;
    selectOnlyWithMarks: () => void;
    onGenerateSinglePDF: (id: number) => void;
    loading: boolean;
    isDark: boolean;
}

export const StudentReportList: React.FC<StudentReportListProps> = ({
    previews,
    reportType,
    selectedStudentIds,
    toggleStudentSelection,
    toggleAllSelection,
    selectOnlyWithMarks,
    onGenerateSinglePDF,
    loading,
    isDark
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPreviews = previews.filter(p =>
        p.student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getDivisionColor = (division: string | undefined) => {
        if (!division) return isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
        switch (division) {
            case 'I': return isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700';
            case 'II': return isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700';
            case 'III': return isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700';
            case 'U': return isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700';
            default: return isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
            <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search by name or index number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none`}
                        />
                        <Search className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'} absolute left-3 top-1/2 -translate-y-1/2`} />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleAllSelection}
                            className={`px-3 py-1.5 text-xs font-medium text-indigo-600 ${isDark ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-50'} rounded-lg transition-colors`}
                        >
                            {selectedStudentIds.size === filteredPreviews.length && filteredPreviews.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                            onClick={selectOnlyWithMarks}
                            className={`px-3 py-1.5 text-xs font-medium ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors`}
                        >
                            Select Ready Only
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading student data...</p>
                </div>
            ) : filteredPreviews.length === 0 ? (
                <div className="p-12 text-center">
                    <div className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-3 flex items-center justify-center`}>
                        <Search className="w-8 h-8" />
                    </div>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>No students found</p>
                    <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm mt-1`}>Try adjusting your filters or add students first</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={`${isDark ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase tracking-wider`}>
                            <tr>
                                <th className="w-10 px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudentIds.size === filteredPreviews.length && filteredPreviews.length > 0}
                                        onChange={toggleAllSelection}
                                        className={`rounded ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} text-indigo-600 focus:ring-indigo-500`}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left">Student</th>
                                <th className="px-4 py-3 text-left">Stream</th>
                                <th className="px-4 py-3 text-center">Aggregate</th>
                                <th className="px-4 py-3 text-center">Division</th>
                                <th className="px-4 py-3 text-center">Position</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredPreviews.map((preview) => {
                                const currentMarks = reportType === AssessmentType.BOT ? preview.botMarks : preview.eotMarks;
                                const currentPosition = reportType === AssessmentType.BOT ? preview.botPosition : preview.eotPosition;

                                return (
                                    <tr
                                        key={preview.student.id}
                                        className={`${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/50'} transition-colors ${selectedStudentIds.has(preview.student.id!) ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50/30') : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.has(preview.student.id!)}
                                                onChange={() => toggleStudentSelection(preview.student.id!)}
                                                className={`rounded ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} text-indigo-600 focus:ring-indigo-500`}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{preview.student.name}</div>
                                        </td>
                                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{preview.student.stream || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {currentMarks?.aggregate || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDivisionColor(currentMarks?.division)}`}>
                                                {currentMarks?.division || '-'}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {currentPosition || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {preview.hasMissingMarks ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                                    Incomplete
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                                    Ready
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => onGenerateSinglePDF(preview.student.id!)}
                                                disabled={loading}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 ${isDark ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-50'} rounded-lg transition-colors disabled:opacity-50`}
                                            >
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
