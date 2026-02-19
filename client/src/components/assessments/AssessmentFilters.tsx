import React from 'react';
import { AssessmentType, ClassLevel, SchoolSettings, Teacher } from '../../../../types';
import { useClassNames } from '../../../../hooks/use-class-names';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { FileText, Download, User } from 'lucide-react';

interface AssessmentFiltersProps {
    selectedClass: ClassLevel;
    setSelectedClass: (cls: ClassLevel) => void;
    selectedStream: string;
    setSelectedStream: (stream: string) => void;
    selectedTerm: number;
    setSelectedTerm: (term: number) => void;
    selectedType: AssessmentType | 'BOTH';
    setSelectedType: (type: AssessmentType | 'BOTH') => void;
    settings: SchoolSettings | null;
    generating: boolean;
    onGenerate: () => void;
    onDownloadCSV: () => void;
    classTeacher: Teacher | undefined;
}

export const AssessmentFilters: React.FC<AssessmentFiltersProps> = ({
    selectedClass,
    setSelectedClass,
    selectedStream,
    setSelectedStream,
    selectedTerm,
    setSelectedTerm,
    selectedType,
    setSelectedType,
    settings,
    generating,
    onGenerate,
    onDownloadCSV,
    classTeacher
}) => {
    const { isDark } = useTheme();
    const { getAllClasses, getDisplayName } = useClassNames();

    const availableStreams = settings?.streams[selectedClass] || [];

    const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2.5 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none text-sm transition-all duration-200`;

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Class</label>
                    <select
                        className={inputClasses}
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
                    >
                        {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
                    </select>
                </div>
                <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Stream</label>
                    <select
                        className={inputClasses}
                        value={selectedStream}
                        onChange={(e) => setSelectedStream(e.target.value)}
                    >
                        <option value="ALL">All Streams</option>
                        {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Term</label>
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
                    <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Assessment</label>
                    <select
                        className={inputClasses}
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as AssessmentType | 'BOTH')}
                    >
                        <option value="BOTH">BOT & EOT</option>
                        <option value={AssessmentType.BOT}>Beginning of Term</option>
                        <option value={AssessmentType.EOT}>End of Term</option>
                    </select>
                </div>
                <div className="col-span-2 flex items-end gap-2">
                    <Button onClick={onGenerate} disabled={generating || !settings} className="flex-1 justify-center gap-2">
                        {generating ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                Generate PDF
                            </>
                        )}
                    </Button>
                    <Button onClick={onDownloadCSV} variant="outline" disabled={generating} className="flex-1 justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {classTeacher && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-[#7B1113]' : 'bg-[#7B1113]'} text-white font-bold`}>
                        {classTeacher.initials || classTeacher.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Class Teacher: {classTeacher.name}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getDisplayName(selectedClass)} {selectedStream !== 'ALL' ? selectedStream : ''}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
