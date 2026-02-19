import React from 'react';
import { Button } from '../../../../components/Button';
import { ClassLevel, AssessmentType } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ClassSelector } from './ClassSelector';

interface MarksToolbarProps {
    // State for ClassSelector
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

    // Actions
    undo: () => void;
    redo: () => void;
    historyIndex: number;
    historyLength: number;
    showQuickFill: boolean;
    setShowQuickFill: (show: boolean) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    downloadTemplate: () => void;
    handleImportClick: () => void;
    copyFromOtherAssessment: () => void;
    handleSave: () => void;

    // Quick Fill State
    quickFillSubject: string;
    setQuickFillSubject: (subj: string) => void;
    quickFillValue: string;
    setQuickFillValue: (val: string) => void;
    applyQuickFill: () => void;
    subjects: string[];

    // Delete Operations
    selectedForDeleteCount: number;
    clearDeleteSelection: () => void;
    onDeleteMarks: () => void; // Show confirm
    onSelectAllForDelete: () => void;
    canSelectAllForDelete: boolean;

    // UI State
    isDark: boolean;
    loading: boolean;
    isArchiveMode: boolean;
    hasUnsavedChanges: boolean;
}

export const MarksToolbar: React.FC<MarksToolbarProps> = ({
    selectedClass, setSelectedClass,
    selectedStream, setSelectedStream,
    selectedTerm, setSelectedTerm,
    selectedType, setSelectedType,
    availableStreams,
    searchQuery, setSearchQuery,

    undo, redo, historyIndex, historyLength,
    showQuickFill, setShowQuickFill,
    handleFileUpload, fileInputRef,
    downloadTemplate, handleImportClick, copyFromOtherAssessment, handleSave,

    quickFillSubject, setQuickFillSubject,
    quickFillValue, setQuickFillValue,
    applyQuickFill, subjects,

    selectedForDeleteCount, clearDeleteSelection, onDeleteMarks, onSelectAllForDelete, canSelectAllForDelete,

    isDark, loading, isArchiveMode, hasUnsavedChanges
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyIndex >= historyLength - 1}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Redo (Ctrl+Y)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
                    <button
                        onClick={() => setShowQuickFill(!showQuickFill)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showQuickFill ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Quick Fill
                    </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                        Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImportClick} disabled={loading || isArchiveMode}>
                        Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyFromOtherAssessment} disabled={loading}>
                        Copy {selectedType === AssessmentType.BOT ? 'EOT' : 'BOT'}
                    </Button>
                    <Button onClick={handleSave} disabled={loading || !hasUnsavedChanges || isArchiveMode}>
                        {loading ? 'Saving...' : 'Save All'}
                    </Button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
                    {selectedForDeleteCount > 0 ? (
                        <>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{selectedForDeleteCount} selected</span>
                            <Button variant="outline" size="sm" onClick={clearDeleteSelection}>
                                Clear
                            </Button>
                            <Button variant="danger" size="sm" onClick={onDeleteMarks}>
                                Delete Marks
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={onSelectAllForDelete} disabled={!canSelectAllForDelete}>
                            Select All for Delete
                        </Button>
                    )}
                </div>
            </div>

            {showQuickFill && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fill all students:</span>
                    <select
                        value={quickFillSubject}
                        onChange={(e) => setQuickFillSubject(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                        <option value="">Select subject</option>
                        {subjects.map(s => (
                            <option key={s} value={s}>{s === 'literacy1' ? 'Literacy 1' : s === 'literacy2' ? 'Literacy 2' : s.toUpperCase()}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Mark (0-100)"
                        value={quickFillValue}
                        onChange={(e) => setQuickFillValue(e.target.value)}
                        className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <Button size="sm" onClick={applyQuickFill} disabled={!quickFillSubject || quickFillValue === ''}>
                        Apply
                    </Button>
                </div>
            )}

            <ClassSelector
                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                selectedStream={selectedStream} setSelectedStream={setSelectedStream}
                selectedTerm={selectedTerm} setSelectedTerm={setSelectedTerm}
                selectedType={selectedType} setSelectedType={setSelectedType}
                availableStreams={availableStreams}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                isDark={isDark}
            />
        </div>
    );
};
