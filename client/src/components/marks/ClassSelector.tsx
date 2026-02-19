import React from 'react';
import { useClassNames } from '../../../../hooks/use-class-names';
import { ClassLevel, AssessmentType } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';

interface ClassSelectorProps {
    selectedClass: ClassLevel;
    setSelectedClass: (cls: ClassLevel) => void;
    selectedStream: string;
    setSelectedStream: (stream: string) => void;
    selectedTerm: number;
    setSelectedTerm: (term: number) => void;
    selectedType: AssessmentType;
    setSelectedType: (type: AssessmentType) => void;
    availableStreams: string[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isDark: boolean;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
    selectedClass, setSelectedClass,
    selectedStream, setSelectedStream,
    selectedTerm, setSelectedTerm,
    selectedType, setSelectedType,
    availableStreams,
    searchQuery, setSearchQuery,
    isDark
}) => {
    const { getAllClasses } = useClassNames();
    const inputClasses = `mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:outline-none sm:text-sm transition-all duration-200 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`;
    const labelClasses = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div>
                <label className={labelClasses}>Class</label>
                <select
                    className={inputClasses}
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
                >
                    {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClasses}>Stream</label>
                <select
                    className={inputClasses}
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                >
                    <option value="All">All Streams</option>
                    {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClasses}>Term</label>
                <select
                    className={inputClasses}
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(Number(e.target.value))}
                >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                </select>
            </div>
            <div>
                <label className={labelClasses}>Assessment</label>
                <select
                    className={inputClasses}
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
                >
                    <option value={AssessmentType.BOT}>BOT</option>
                    <option value={AssessmentType.EOT}>EOT</option>
                </select>
            </div>
            <div>
                <label className={labelClasses}>Search</label>
                <input
                    type="text"
                    className={inputClasses}
                    placeholder="Name or index..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    );
};
