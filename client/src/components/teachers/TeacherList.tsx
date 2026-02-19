import React, { useState } from 'react';
import { Teacher } from '../../../../types';
import { Icons } from '../../lib/icons';
import { Button } from '../../../../components/Button';
import { useTheme } from '../../../../contexts/ThemeContext';

interface TeacherListProps {
    teachers: Teacher[];
    selectedIds: Set<number>;
    toggleSelection: (id: number) => void;
    toggleSelectAll: () => void;
    onViewProfile: (teacher: Teacher) => void;
    onEdit: (teacher: Teacher) => void;
    onDelete: (id: number) => void;
    handleBulkDelete: () => void;
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: number) => void;
    isDark: boolean;
}

const ITEMS_PER_PAGE = 20;

export const TeacherList: React.FC<TeacherListProps> = ({
    teachers,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    onViewProfile,
    onEdit,
    onDelete,
    handleBulkDelete,
    currentPage,
    totalPages,
    setCurrentPage,
    isDark
}) => {
    // Checkbox styling
    const checkboxClasses = "h-4 w-4 rounded border-gray-300 text-[#7B1113] focus:ring-[#7B1113] cursor-pointer";

    // Pagination Logic is handled in parent or here? 
    // Teachers prop passed here is likely already filtered. Pagination usually happens on the filtered list.
    // The parent 'Teachers.tsx' doesn't seem to have pagination logic in the original code snippet provided (it was cut off or I missed it).
    // I will assume pagination is desired given the props I added. If original didn't have it, I'll add simple client-side pagination.

    // Actually, looking at previous view_file, there was paginatedStudents in Students.tsx, but Teachers.tsx seemed to render a table directly.
    // I'll implement PAGINATION internally or expect paginated data? 
    // I'll slice here for now if the parent passes all filtered teachers.

    const paginatedTeachers = teachers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className={`${isDark ? 'bg-[#7B1113]/20 border-[#7B1113]/50' : 'bg-[#7B1113]/10 border-[#7B1113]/30'} border rounded-lg p-3 flex items-center justify-between`}>
                    <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                        <span className="font-semibold">{selectedIds.size}</span> teacher(s) selected
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={toggleSelectAll}>Clear</Button> {/* This logic usually clears selection if all selected, acts as toggle in parent */}
                        <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                            <Icons.Trash className="w-4 h-4 mr-1" /> Delete Selected
                        </Button>
                    </div>
                </div>
            )}

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg overflow-hidden border`}>
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                    <input
                                        type="checkbox"
                                        className={checkboxClasses}
                                        checked={teachers.length > 0 && selectedIds.size === teachers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Subjects</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'} ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            {paginatedTeachers.map((teacher) => {
                                const initials = teacher.initials || (teacher.name || '').split(' ').map(n => n?.[0] || '').join('').substring(0, 2);
                                return (
                                    <tr key={teacher.id} className={`hover:${isDark ? 'bg-gray-750' : 'bg-gray-50'} transition-colors`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className={checkboxClasses}
                                                checked={selectedIds.has(teacher.id!)}
                                                onChange={() => toggleSelection(teacher.id!)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    {teacher.photoBase64 ? (
                                                        <img className="h-10 w-10 rounded-full object-cover border" src={teacher.photoBase64} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#7B1113] to-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold">
                                                            {initials}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</div>
                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {teacher.employeeId || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {teacher.roles.map(role => (
                                                    <span key={role} className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                            {teacher.assignedClass && (
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Class Teacher: <span className="font-medium">{teacher.assignedClass} {teacher.assignedStream}</span>
                                                </div>
                                            )}
                                            {teacher.teachingClasses && teacher.teachingClasses.length > 0 && (
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                                                    Teaches: <span className="font-medium">{teacher.teachingClasses.length} classes</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className={isDark ? 'text-gray-300' : 'text-gray-900'}>{teacher.phone}</div>
                                            <div className={isDark ? 'text-gray-500' : 'text-gray-500'}>{teacher.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {teacher.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onViewProfile(teacher)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                                    <Icons.Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onEdit(teacher)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                                                    <Icons.Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(teacher.id!)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Logic */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-lg shadow-sm">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, teachers.length)}</span> of <span className="font-medium">{teachers.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${isDark ? 'bg-gray-700 ring-gray-600 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <Icons.ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                                            ? 'z-10 bg-[#7B1113] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B1113]'
                                            : `text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${isDark ? 'bg-gray-800 text-gray-300 ring-gray-600 hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-50'}`
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${isDark ? 'bg-gray-700 ring-gray-600 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <span className="sr-only">Next</span>
                                    <Icons.ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
