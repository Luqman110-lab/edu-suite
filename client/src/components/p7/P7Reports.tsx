import React, { useState } from 'react';
import { Student } from '../../../../types';
import { Button } from '../../../../components/Button';
import { Download } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface P7ReportsProps {
    students: Student[];
    selectedStudentIds: Set<number>;
    setSelectedStudentIds: (ids: Set<number>) => void;
    generateBulkP7Reports: () => void;
    generatingPDF: boolean;
}

export const P7Reports: React.FC<P7ReportsProps> = ({
    students,
    selectedStudentIds,
    setSelectedStudentIds,
    generateBulkP7Reports,
    generatingPDF
}) => {
    const { isDark } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.stream?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelectAll = () => {
        if (selectedStudentIds.size === filteredStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id!)));
        }
    };

    const toggleSelectStudent = (id: number) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudentIds(newSet);
    };

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Report Generation
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Generate combined P7 reports for selected students
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm flex-1 md:w-64 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <Button onClick={generateBulkP7Reports} disabled={selectedStudentIds.size === 0 || generatingPDF}>
                        <Download className="w-4 h-4 mr-1" />
                        {generatingPDF ? 'Generating...' : `Generate (${selectedStudentIds.size})`}
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                        <tr>
                            <th className="px-4 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left">Student Name</th>
                            <th className="px-4 py-3 text-left">Stream</th>
                            <th className="px-4 py-3 text-left">Gender</th>
                        </tr>
                    </thead>
                    <tbody className={isDark ? 'divide-gray-700' : 'divide-gray-100'}>
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={`px-4 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No students found matching your search
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map(student => (
                                <tr
                                    key={student.id}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${selectedStudentIds.has(student.id!) ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50') : ''}`}
                                    onClick={() => toggleSelectStudent(student.id!)}
                                >
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.has(student.id!)}
                                            onChange={() => toggleSelectStudent(student.id!)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                                        />
                                    </td>
                                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {student.name}
                                    </td>
                                    <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {student.stream || '-'}
                                    </td>
                                    <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {student.gender === 'M' ? 'Male' : 'Female'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
