import React from 'react';
import { Button } from '../../../../components/Button';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FileText, FileSpreadsheet, File } from 'lucide-react';

interface ReportGeneratorProps {
    onGeneratePDF: () => void;
    onExportExcel: () => void;
    onExportCSV: () => void;
    loading: boolean;
    settingsLoaded: boolean;
    selectedCount: number;
    totalCount: number;
    hasStudents: boolean;
    generatingProgress?: { current: number; total: number };
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    onGeneratePDF,
    onExportExcel,
    onExportCSV,
    loading,
    settingsLoaded,
    selectedCount,
    totalCount,
    hasStudents,
    generatingProgress
}) => {
    const { isDark } = useTheme();

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-5 rounded-xl shadow-sm border`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4`}>Generate Reports</h3>

            <div className="space-y-3">
                <Button
                    onClick={onGeneratePDF}
                    disabled={loading || !settingsLoaded || selectedCount === 0}
                    size="md"
                    className="w-full"
                >
                    {loading ? (
                        <span className="flex flex-col items-center justify-center gap-1">
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {generatingProgress && generatingProgress.total > 1
                                    ? `Generating ${generatingProgress.current} of ${generatingProgress.total}...`
                                    : 'Generating...'}
                            </span>
                            {generatingProgress && generatingProgress.total > 1 && (
                                <span className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                                    <span
                                        className="bg-white rounded-full h-1.5 block transition-all duration-300"
                                        style={{ width: `${(generatingProgress.current / generatingProgress.total) * 100}%` }}
                                    />
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4" />
                            Generate {selectedCount} PDF Report{selectedCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </Button>

                <button
                    onClick={onExportExcel}
                    disabled={!hasStudents}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${!hasStudents
                        ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDark ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                        }`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export to Excel
                </button>

                <button
                    onClick={onExportCSV}
                    disabled={!hasStudents}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${!hasStudents
                        ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                        }`}
                >
                    <File className="w-4 h-4" />
                    Export to CSV
                </button>

                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                    {selectedCount} of {totalCount} students selected
                </p>
            </div>

            {!settingsLoaded && (
                <p className="mt-4 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Settings not loaded
                </p>
            )}
        </div>
    );
};
