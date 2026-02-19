import React from 'react';
import { Icons } from '../../lib/icons';
import { useClassNames } from '../../../../hooks/use-class-names';

const { Search, List: ListIcon, LayoutGrid } = Icons;

interface StudentFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filterClass: string;
    setFilterClass: (cls: string) => void;
    filterStream: string;
    setFilterStream: (stream: string) => void;
    viewMode: 'list' | 'grid' | 'profile';
    setViewMode: (mode: 'list' | 'grid' | 'profile') => void;
    availableStreams: string[];
    isDark: boolean;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
    searchQuery,
    setSearchQuery,
    filterClass,
    setFilterClass,
    filterStream,
    setFilterStream,
    viewMode,
    setViewMode,
    availableStreams,
    isDark
}) => {
    const { getAllClasses } = useClassNames();

    return (
        <div className={`sticky top-0 z-10 p-4 rounded-xl shadow-sm border backdrop-blur-xl transition-all ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row gap-4 justify-between">

                {/* Search Bar */}
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className={`w-5 h-5 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-primary-400' : 'text-gray-400 group-focus-within:text-primary-500'}`} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search students..."
                        className={`block w-full pl-10 pr-4 py-2.5 border rounded-lg leading-5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-wrap items-center gap-3">

                    <div className="flex items-center gap-2 p-1 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-primary-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-primary-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    <div className={`h-8 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                    <select
                        className={`px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                        value={filterClass}
                        onChange={(e) => { setFilterClass(e.target.value); setFilterStream('All'); }}
                    >
                        <option value="All">All Classes</option>
                        {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
                    </select>

                    <select
                        className={`px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                        value={availableStreams.length > 0 ? filterStream : 'All'}
                        onChange={(e) => setFilterStream(e.target.value)}
                        disabled={availableStreams.length === 0}
                    >
                        <option value="All">All Streams</option>
                        {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};
