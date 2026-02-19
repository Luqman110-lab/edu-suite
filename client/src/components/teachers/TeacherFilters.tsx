import React, { useRef } from 'react';
import { Icons } from '../../lib/icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ClassLevel, Teacher } from '../../../../types';
import { Button } from '../../../../components/Button';
import { FaceEnrollment } from '../../../../components/FaceEnrollment';

interface TeacherFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    selectedRole: string;
    setSelectedRole: (role: string) => void;
    selectedGender: string;
    setSelectedGender: (gender: string) => void;
    selectedClass: string;
    setSelectedClass: (cls: string) => void;
    ROLES: string[];
    isDark: boolean;

    // Actions
    onDownloadTemplate: () => void;
    onImport: () => void;
    onExport: () => void;
    onAddTeacher: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TeacherFilters: React.FC<TeacherFiltersProps> = ({
    searchQuery, setSearchQuery,
    showFilters, setShowFilters,
    selectedRole, setSelectedRole,
    selectedGender, setSelectedGender,
    selectedClass, setSelectedClass,
    ROLES,
    isDark,
    onDownloadTemplate,
    onImport,
    onExport,
    onAddTeacher,
    fileInputRef,
    handleImportCSV
}) => {
    const inputClasses = `mt-1 block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'} px-3 py-2 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none sm:text-sm transition-all duration-200`;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Staff Directory</h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Manage teaching and administrative staff</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
                        <Icons.FileText className="w-4 h-4 mr-1.5" /> Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={onImport}>
                        <Icons.Upload className="w-4 h-4 mr-1.5" /> Import
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    <Button variant="outline" size="sm" onClick={onExport}>
                        <Icons.Download className="w-4 h-4 mr-1.5" /> Export
                    </Button>
                    <Button onClick={onAddTeacher}>Add Teacher</Button>
                </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Icons.Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`${inputClasses} pl-9 mt-0`}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-[#7B1113] text-white border-[#7B1113]' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                    >
                        <Icons.Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {(selectedRole || selectedGender || selectedClass) && (
                            <span className="bg-white text-[#7B1113] text-xs px-1.5 py-0.5 rounded-full font-medium">
                                {[selectedRole, selectedGender, selectedClass].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <select
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">All Roles</option>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                            value={selectedGender}
                            onChange={e => setSelectedGender(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">All Genders</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">All Classes</option>
                            {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};
