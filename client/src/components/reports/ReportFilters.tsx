import React from 'react';
import { ClassLevel, AssessmentType, SchoolSettings } from '../../../../types';
import { useClassNames } from '../../../../hooks/use-class-names';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Filter } from 'lucide-react';
import { useStreams } from '../../hooks/useClassAssignments';

interface ReportFiltersProps {
    selectedClass: ClassLevel;
    setSelectedClass: (cls: ClassLevel) => void;
    selectedStream: string;
    setSelectedStream: (stream: string) => void;
    selectedTerm: number;
    setSelectedTerm: (term: number) => void;
    reportType: AssessmentType;
    setReportType: (type: AssessmentType) => void;
    settings: SchoolSettings | null;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
    selectedClass,
    setSelectedClass,
    selectedStream,
    setSelectedStream,
    selectedTerm,
    setSelectedTerm,
    reportType,
    setReportType,
    settings
}) => {
    const { isDark } = useTheme();
    const { getAllClasses } = useClassNames();
    const { streams } = useStreams();

    const availableStreams = streams?.filter(s => s.classLevel === selectedClass).map(s => s.streamName) || [];

    const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm transition-all duration-200`;

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-5 rounded-xl shadow-sm border`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4 flex items-center gap-2`}>
                <Filter className="w-4 h-4 text-indigo-500" />
                Filters
            </h3>

            <div className="space-y-4">
                <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Class</label>
                    <select
                        className={inputClasses}
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
                    >
                        {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
                    </select>
                </div>

                <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Stream</label>
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
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Term</label>
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
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Assessment Type</label>
                    <select
                        className={inputClasses}
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as AssessmentType)}
                    >
                        <option value={AssessmentType.BOT}>Beginning of Term (BOT)</option>
                        <option value={AssessmentType.EOT}>End of Term (EOT)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
