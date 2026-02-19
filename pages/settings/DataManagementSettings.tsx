import React, { useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

import { useDataManagement } from '../../client/src/hooks/useDataManagement';
import { Download, Upload, Trash2, Database } from 'lucide-react';

interface DataManagementSettingsProps {
}

export const DataManagementSettings: React.FC<DataManagementSettingsProps> = () => {
    const { isDark } = useTheme();
    const { exportData, importData, mergeData, deleteAllData } = useDataManagement();
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const mergeInputRef = useRef<HTMLInputElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Merge State
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeFile, setMergeFile] = useState<File | null>(null);
    const [mergeOptions, setMergeOptions] = useState({
        updateStudentNames: true,
        addNewStudents: true,
        addNewTeachers: true,
        skipMarks: true
    });
    const [mergeStats, setMergeStats] = useState<{
        studentsAdded: number;
        studentsUpdated: number;
        teachersAdded: number;
        marksAdded: number;
        skipped: number;
    } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleExport = async () => {
        try {
            await exportData();
            showToast('Backup downloaded successfully!', 'success');
        } catch (error) { // exportData might fail if network error
            console.error(error);
            showToast('Failed to download backup.', 'error');
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm("WARNING: Restoring data will OVERWRITE all current data. Are you sure?")) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    await importData.mutateAsync(ev.target?.result as string);
                    showToast('Data restored successfully!', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                    showToast('Failed to restore data.', 'error');
                }
            };
            reader.readAsText(file);
        }
        if (restoreInputRef.current) restoreInputRef.current.value = '';
    };

    const handleMergeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMergeFile(file);
            setMergeStats(null);
            setShowMergeModal(true);
        }
        if (mergeInputRef.current) mergeInputRef.current.value = '';
    };

    const handleMerge = async () => {
        if (!mergeFile) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const stats = await mergeData.mutateAsync({
                    jsonContent: ev.target?.result as string,
                    options: mergeOptions
                });
                setMergeStats(stats);
                showToast(`Merge complete! Added ${stats.studentsAdded} students, updated ${stats.studentsUpdated}.`, 'success');
            } catch (err) {
                showToast('Failed to merge data. Please check the file format.', 'error');
                setShowMergeModal(false);
            }
        };
        reader.readAsText(mergeFile);
    };

    const closeMergeModal = () => {
        setShowMergeModal(false);
        setMergeFile(null);
        setMergeStats(null);
        if (mergeStats && (mergeStats.studentsAdded > 0 || mergeStats.studentsUpdated > 0 || mergeStats.teachersAdded > 0)) {
            window.location.reload();
        }
    };

    const handleDeleteAllData = async () => {
        const firstConfirm = window.confirm(
            "WARNING: This will permanently delete ALL students, teachers, and marks data. This action CANNOT be undone!\n\nAre you sure you want to continue?"
        );

        if (!firstConfirm) return;

        const secondConfirm = window.prompt(
            'Type "DELETE ALL" to confirm you want to permanently remove all data:'
        );

        if (secondConfirm !== "DELETE ALL") {
            showToast('Deletion cancelled - confirmation text did not match', 'error');
            return;
        }

        try {
            await deleteAllData.mutateAsync();
            showToast('All data has been deleted successfully', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error(err);
            showToast('Failed to delete data', 'error');
        }
    };


    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'}`}>
                    {toast.message}
                </div>
            )}

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Backup & Restore</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Secure your data by creating backups or restoring from a previous backup.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={handleExport}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${isDark ? 'border-gray-700 bg-gray-750 hover:bg-gray-700' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm'}`}
                    >
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-primary-900/30 text-primary-400' : 'bg-primary-100 text-primary-600'}`}>
                            <Download className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Download Backup</h4>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Save a copy of your current data</p>
                        </div>
                    </button>

                    <button
                        onClick={() => restoreInputRef.current?.click()}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${isDark ? 'border-gray-700 bg-gray-750 hover:bg-gray-700' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm'}`}
                    >
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-secondary-900/30 text-secondary-400' : 'bg-secondary-100 text-secondary-600'}`}>
                            <Upload className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Restore Backup</h4>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Restore data from a backup file</p>
                            <input
                                type="file"
                                accept=".json"
                                ref={restoreInputRef}
                                className="hidden"
                                onChange={handleRestore}
                            />
                        </div>
                    </button>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Merge Data</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import data from another backup file to merge with existing data</p>

                <button
                    onClick={() => mergeInputRef.current?.click()}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isDark ? 'border-gray-700 bg-gray-750 hover:bg-gray-700' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Merge Database</h4>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import students/marks from another file</p>
                            <input
                                type="file"
                                accept=".json"
                                ref={mergeInputRef}
                                className="hidden"
                                onChange={handleMergeSelect}
                            />
                        </div>
                    </div>
                </button>
            </div>

            <div className={`p-6 rounded-2xl border border-danger-200 bg-danger-50 dark:bg-danger-900/10 dark:border-danger-900`}>
                <h3 className="text-lg font-semibold text-danger-700 dark:text-danger-400 mb-1">Danger Zone</h3>
                <p className="text-sm text-danger-600/80 dark:text-danger-400/80 mb-6">Irreversible actions that affect your data integrity</p>

                <button
                    onClick={handleDeleteAllData}
                    className="flex items-center gap-2 px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete All Data
                </button>
            </div>

            {/* Merge Modal */}
            {showMergeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-lg p-6 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Merge Data Options
                        </h3>

                        {!mergeStats ? (
                            <div className="space-y-4">
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Selected file: <strong>{mergeFile?.name}</strong>
                                </p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                            checked={mergeOptions.updateStudentNames}
                                            onChange={e => setMergeOptions({ ...mergeOptions, updateStudentNames: e.target.checked })}
                                        />
                                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Update existing student names</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                            checked={mergeOptions.addNewStudents}
                                            onChange={e => setMergeOptions({ ...mergeOptions, addNewStudents: e.target.checked })}
                                        />
                                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Add new students</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                            checked={mergeOptions.addNewTeachers}
                                            onChange={e => setMergeOptions({ ...mergeOptions, addNewTeachers: e.target.checked })}
                                        />
                                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Add new teachers</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                            checked={mergeOptions.skipMarks}
                                            onChange={e => setMergeOptions({ ...mergeOptions, skipMarks: e.target.checked })}
                                        />
                                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Skip marks (Don't overwrite marks)</span>
                                    </label>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={closeMergeModal}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleMerge}
                                        className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
                                    >
                                        Start Merge
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                    <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Merge Results</h4>
                                    <ul className={`space-y-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        <li>Students Added: {mergeStats.studentsAdded}</li>
                                        <li>Students Updated: {mergeStats.studentsUpdated}</li>
                                        <li>Teachers Added: {mergeStats.teachersAdded}</li>
                                        <li>Items Skipped: {mergeStats.skipped}</li>
                                    </ul>
                                </div>
                                <button
                                    onClick={closeMergeModal}
                                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
