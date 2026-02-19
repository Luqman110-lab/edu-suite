import React, { useMemo } from 'react';
// Correct relative paths based on location: client/src/components/students/AcademicHistory.tsx
// types are in edu-suite/types.ts -> ../../../../types.ts
import { MarkRecord } from '../../../../types';
import { useMarks } from '../../hooks/useMarks';
// theme context in edu-suite/contexts -> ../../../../contexts
import { useTheme } from '../../../../contexts/ThemeContext';

interface AcademicHistoryProps {
    studentId: number;
}

export const AcademicHistory: React.FC<AcademicHistoryProps> = ({ studentId }) => {
    const { isDark } = useTheme();
    // useMarks fetches all marks. We filter locally.
    const { marks, isLoading } = useMarks();

    const history = useMemo(() => {
        if (!marks) return [];
        return marks.filter(m => m.studentId === studentId).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            if (a.term !== b.term) return b.term - a.term;
            return 0;
        });
    }, [marks, studentId]);

    if (isLoading) return <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading history...</div>;

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Academic History</h3>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{history.length} Records found</span>
            </div>
            {history.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No academic records found for this student.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                            <tr>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Year</th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Term</th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                                <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agg</th>
                                <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Div</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                            {history.map((record) => (
                                <tr key={record.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.year}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Term {record.term}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${record.type === 'EOT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'}`}>
                                            {record.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-center ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.aggregate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-primary-600">{record.division}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
