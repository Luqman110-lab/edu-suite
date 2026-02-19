import React from 'react';
import { Student } from '../../../../types';
import { Icons } from '../../lib/icons';
import { useClassNames } from '../../../../hooks/use-class-names';

const { Search, User, School, Building } = Icons;

interface StudentListProps {
    paginatedStudents: Student[];
    allStudentsCount: number; // total filtered items
    viewMode: 'list' | 'grid';
    selectedIds: Set<number>;
    toggleSelection: (id: number) => void;
    toggleSelectAll: () => void; // Uses filtered select all logic
    allPageSelected: boolean;
    indeterminate: boolean;
    isDark: boolean;
    onViewProfile: (student: Student) => void;
    onEdit: (student: Student) => void;
    onDelete: (id: number | undefined) => void;
    // Inline edit props
    editingRowId: number | null;
    editingField: string | null;
    editValue: string;
    setEditingRowId: (id: number | null) => void;
    setEditingField: (field: string | null) => void;
    setEditValue: (val: string) => void;
    handleQuickEdit: (id: number, field: string, value: string) => void;
    searchQuery: string;
    // Pagination props
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: React.SetStateAction<number>) => void;
    toggleSelectAllFiltered: () => void;
    allFilteredSelected: boolean;
}

const HighlightText = ({ text, query }: { text: string; query: string }) => {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">{part}</mark>
                ) : part
            )}
        </>
    );
};

export const StudentList: React.FC<StudentListProps> = ({
    paginatedStudents,
    allStudentsCount,
    viewMode,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    allPageSelected,
    indeterminate,
    isDark,
    onViewProfile,
    onEdit,
    onDelete,
    editingRowId,
    editingField,
    editValue,
    setEditingRowId,
    setEditingField,
    setEditValue,
    handleQuickEdit,
    searchQuery,
    currentPage,
    totalPages,
    setCurrentPage,
    toggleSelectAllFiltered,
    allFilteredSelected
}) => {
    const { getDisplayName } = useClassNames();

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center gap-2 mt-6">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded border text-sm ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}
                >
                    Previous
                </button>

                <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded text-sm ${currentPage === pageNum
                                    ? 'bg-primary-600 text-white'
                                    : isDark ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded border text-sm ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <>
            <div className={`flex items-center justify-between text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-3">
                    <span>Showing {paginatedStudents.length} of {allStudentsCount} students</span>
                    {allStudentsCount > 0 && (
                        <button
                            onClick={toggleSelectAllFiltered}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${allFilteredSelected
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                : 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800'
                                }`}
                        >
                            {allFilteredSelected ? 'Unselect All' : `Select All (${allStudentsCount})`}
                        </button>
                    )}
                </div>
                {selectedIds.size > 0 && <span className="font-medium text-primary-600">{selectedIds.size} selected</span>}
            </div>

            {viewMode === 'list' && (
                <>
                    <div className="hidden md:block">
                        <div className={`shadow rounded-lg overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                                        <tr>
                                            <th className="px-4 py-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                                                    checked={allPageSelected}
                                                    ref={el => el && (el.indeterminate = indeterminate)}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Learner</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Details</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Class Info</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                                            <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        {paginatedStudents.map((student) => (
                                            <tr key={student.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} group`}>
                                                <td className="px-4 py-4 text-left">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                                                        checked={selectedIds.has(student.id!)}
                                                        onChange={() => toggleSelection(student.id!)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewProfile(student)}>
                                                    <div className="flex items-center">
                                                        {student.photoBase64 ? (
                                                            <img src={student.photoBase64} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-50 text-primary-600'}`}>
                                                                {student.name.substring(0, 2)}
                                                            </div>
                                                        )}
                                                        <div className="ml-4">
                                                            {editingRowId === student.id && editingField === 'name' ? (
                                                                <input
                                                                    type="text"
                                                                    className={`text-sm font-medium px-2 py-1 border rounded ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleQuickEdit(student.id!, 'name', editValue)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'name', editValue)}
                                                                    autoFocus
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('name'); setEditValue(student.name); }}
                                                                >
                                                                    <HighlightText text={student.name} query={searchQuery} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewProfile(student)}>
                                                    <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{student.gender === 'M' ? 'Male' : 'Female'}</div>
                                                    {editingRowId === student.id && editingField === 'paycode' ? (
                                                        <input
                                                            type="text"
                                                            className={`text-xs px-2 py-0.5 border rounded w-24 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleQuickEdit(student.id!, 'paycode', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'paycode', editValue)}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                                            onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('paycode'); setEditValue(student.paycode || ''); }}
                                                        >
                                                            <HighlightText text={student.paycode || '-'} query={searchQuery} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewProfile(student)}>
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                                        {getDisplayName(student.classLevel)}
                                                    </span>
                                                    {editingRowId === student.id && editingField === 'stream' ? (
                                                        <input
                                                            type="text"
                                                            className={`ml-2 text-sm px-2 py-0.5 border rounded w-20 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleQuickEdit(student.id!, 'stream', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'stream', editValue)}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span
                                                            className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                                            onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('stream'); setEditValue(student.stream); }}
                                                        >
                                                            {student.stream}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewProfile(student)}>
                                                    {student.specialCases?.sickness || student.specialCases?.absenteeism ?
                                                        <span className="text-xs text-yellow-600 font-medium bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded">Flagged</span> :
                                                        <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">Active</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onViewProfile(student); }}
                                                        className="text-primary-600 hover:text-primary-900 p-1"
                                                        title="View Profile"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(student); }}
                                                        className={`p-1 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                                        title="Edit Student"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(student.id); }}
                                                        className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                                        title="Delete Student"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedStudents.length === 0 && (
                                            <tr><td colSpan={6} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No students found matching your search.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden space-y-3">
                        {paginatedStudents.map((student) => (
                            <div
                                key={student.id}
                                className={`rounded-xl border p-4 shadow-sm active:scale-[0.99] transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                onClick={() => onViewProfile(student)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="relative shrink-0">
                                        {student.photoBase64 ? (
                                            <img src={student.photoBase64} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                                        ) : (
                                            <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white dark:border-gray-700 shadow-sm ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600'}`}>
                                                {student.name.substring(0, 2)}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${student.specialCases?.sickness || student.specialCases?.absenteeism || student.specialCases?.fees ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className={`font-bold text-lg truncate pr-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    <HighlightText text={student.name} query={searchQuery} />
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-5 h-5"
                                                checked={selectedIds.has(student.id!)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelection(student.id!); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                <School size={12} />
                                                {student.classLevel} {student.stream}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${student.gender === 'M' ? (isDark ? 'bg-sky-900/30 text-sky-300' : 'bg-sky-50 text-sky-700 border border-sky-100') : (isDark ? 'bg-pink-900/30 text-pink-300' : 'bg-pink-50 text-pink-700 border border-pink-100')}`}>
                                                <User size={12} />
                                                {student.gender === 'M' ? 'M' : 'F'}
                                            </span>
                                            {student.boardingStatus === 'boarding' && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                    <Building size={12} />
                                                    Brd
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {(student.specialCases?.fees || student.specialCases?.sickness) && (
                                    <div className={`mt-3 pt-2 border-t flex gap-2 overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                        {student.specialCases.fees && <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">FEES OVERDUE</span>}
                                        {student.specialCases.sickness && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">MEDICAL ISSUE</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                        {paginatedStudents.length === 0 && (
                            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                                    <Search size={24} className="opacity-50" />
                                </div>
                                <p>No students found matching your search.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedStudents.map((student) => (
                        <div key={student.id} onClick={() => onViewProfile(student)}
                            className={`group relative flex flex-col rounded-xl shadow-sm border overflow-hidden cursor-pointer transition-all hover:shadow-md ${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-primary-200'}`}>
                            <div className={`h-24 ${isDark ? 'bg-gray-750' : 'bg-gradient-to-br from-primary-50 to-primary-100'}`}></div>
                            <div className="px-5 pt-0 pb-5 flex-1 flex flex-col">
                                <div className="relative -mt-12 mb-3 self-center">
                                    <div className={`h-24 w-24 rounded-full p-1 shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                        {student.photoBase64 ? (
                                            <img src={student.photoBase64} alt="" className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            <div className={`h-full w-full rounded-full flex items-center justify-center text-2xl font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-primary-100 text-primary-600'}`}>
                                                {student.name.substring(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center mb-4">
                                    <h3 className={`font-bold text-lg truncate px-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h3>
                                </div>

                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                        {student.classLevel} {student.stream}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === 'M' ? (isDark ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-800') : (isDark ? 'bg-pink-900 text-pink-300' : 'bg-pink-100 text-pink-800')}`}>
                                        {student.gender === 'M' ? 'Male' : 'Female'}
                                    </span>
                                </div>

                                <div className={`mt-auto pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                                    <span className="flex items-center gap-1">
                                        {student.boardingStatus === 'boarding' ? '🛏️ Boarder' : '🏠 Day Scholar'}
                                    </span>
                                    {student.specialCases?.fees && <span className="text-red-500 font-medium">Fees Due</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {paginatedStudents.length === 0 && (
                        <div className={`col-span-full text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No students found matching your search.</div>
                    )}
                </div>
            )}

            {renderPagination()}
        </>
    );
};
