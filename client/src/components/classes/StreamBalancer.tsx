import React, { useState, useMemo } from 'react';
import { useStudents } from '../../hooks/useStudents';
import { useSettings } from '../../hooks/useSettings';
import { X, ArrowRight, ArrowLeft, Loader2, Users } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';

interface StreamBalancerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StreamBalancer({ isOpen, onClose }: StreamBalancerProps) {
    const { students, bulkTransferStudents } = useStudents();
    const { settings } = useSettings();
    const { toast } = useToast();

    const [classLevel, setClassLevel] = useState<string>('');
    const [sourceStream, setSourceStream] = useState<string>('');
    const [targetStream, setTargetStream] = useState<string>('');

    const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set());
    const [selectedTargetIds, setSelectedTargetIds] = useState<Set<number>>(new Set());

    const isProcessing = bulkTransferStudents.isPending;

    // Derived data
    const classesWithStreams = useMemo(() => {
        if (!settings?.streams) return [];
        return Object.entries(settings.streams)
            .filter(([_, streams]) => streams.length > 1) // Only classes with at least 2 streams can be balanced
            .map(([level]) => level);
    }, [settings?.streams]);

    const availableStreams = useMemo(() => {
        if (!classLevel || !settings?.streams) return [];
        return settings.streams[classLevel] || [];
    }, [classLevel, settings?.streams]);

    const sourceStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(s => s.classLevel === classLevel && s.stream === sourceStream && s.isActive).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, classLevel, sourceStream]);

    const targetStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(s => s.classLevel === classLevel && s.stream === targetStream && s.isActive).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, classLevel, targetStream]);

    // Handlers
    const handleTransfer = async (direction: 'right' | 'left') => {
        const studentIdsToMove = direction === 'right' ? Array.from(selectedSourceIds) : Array.from(selectedTargetIds);
        const toStream = direction === 'right' ? targetStream : sourceStream;

        if (studentIdsToMove.length === 0) return;

        try {
            await bulkTransferStudents.mutateAsync({
                studentIds: studentIdsToMove,
                targetClassLevel: classLevel,
                targetStream: toStream
            });

            toast({ title: 'Transfer successful', description: `Moved ${studentIdsToMove.length} students to ${toStream}` });

            // Clear selections
            direction === 'right' ? setSelectedSourceIds(new Set()) : setSelectedTargetIds(new Set());
        } catch (error: any) {
            toast({ title: 'Transfer failed', description: error.message, variant: 'destructive' });
        }
    };

    const toggleSelection = (id: number, side: 'source' | 'target') => {
        if (side === 'source') {
            const next = new Set(selectedSourceIds);
            next.has(id) ? next.delete(id) : next.add(id);
            setSelectedSourceIds(next);
        } else {
            const next = new Set(selectedTargetIds);
            next.has(id) ? next.delete(id) : next.add(id);
            setSelectedTargetIds(next);
        }
    };

    const toggleSelectAll = (side: 'source' | 'target') => {
        if (side === 'source') {
            selectedSourceIds.size === sourceStudents.length
                ? setSelectedSourceIds(new Set())
                : setSelectedSourceIds(new Set(sourceStudents.map(s => s.id!)));
        } else {
            selectedTargetIds.size === targetStudents.length
                ? setSelectedTargetIds(new Set())
                : setSelectedTargetIds(new Set(targetStudents.map(s => s.id!)));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl my-8 flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                            Stream Balancer
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Easily distribute students horizontally between streams of the same class.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body / Tool */}
                <div className="p-6 flex flex-col flex-1 overflow-hidden">

                    {/* Controls Row */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Class Level</label>
                            <select
                                value={classLevel}
                                onChange={(e) => {
                                    setClassLevel(e.target.value);
                                    setSourceStream('');
                                    setTargetStream('');
                                    setSelectedSourceIds(new Set());
                                    setSelectedTargetIds(new Set());
                                }}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="">-- Select Class --</option>
                                {classesWithStreams.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Source Stream</label>
                            <select
                                value={sourceStream}
                                onChange={(e) => {
                                    setSourceStream(e.target.value);
                                    setSelectedSourceIds(new Set());
                                }}
                                disabled={!classLevel}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                            >
                                <option value="">-- Select Stream A --</option>
                                {availableStreams.map(s => <option key={s} value={s} disabled={s === targetStream}>{s}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Stream</label>
                            <select
                                value={targetStream}
                                onChange={(e) => {
                                    setTargetStream(e.target.value);
                                    setSelectedTargetIds(new Set());
                                }}
                                disabled={!classLevel}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                            >
                                <option value="">-- Select Stream B --</option>
                                {availableStreams.map(s => <option key={s} value={s} disabled={s === sourceStream}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Dual Pane Layout */}
                    <div className="flex-1 flex gap-4 min-h-0">
                        {/* Left Pane (Source) */}
                        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden bg-white dark:bg-gray-800 relative">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={sourceStudents.length > 0 && selectedSourceIds.size === sourceStudents.length}
                                        onChange={() => toggleSelectAll('source')}
                                        disabled={!sourceStream}
                                        className="rounded border-gray-300 text-blue-600"
                                    />
                                    <span className="font-bold text-gray-700 dark:text-gray-200">
                                        {sourceStream || 'Stream A'}
                                    </span>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                    {sourceStudents.length} enrolled {selectedSourceIds.size > 0 && `• ${selectedSourceIds.size} selected`}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {!sourceStream ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Select a source stream above</div>
                                ) : sourceStudents.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No students found</div>
                                ) : (
                                    sourceStudents.map(student => (
                                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors border-b border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedSourceIds.has(student.id!)}
                                                onChange={() => toggleSelection(student.id!, 'source')}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-xs border border-blue-200 dark:border-blue-800">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{student.indexNumber || student.gender}</div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Middle Actions */}
                        <div className="w-16 flex flex-col items-center justify-center gap-4 shrink-0">
                            <button
                                onClick={() => handleTransfer('right')}
                                disabled={selectedSourceIds.size === 0 || !targetStream || isProcessing}
                                className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600 shadow-sm border border-blue-100 dark:border-blue-800 disabled:border-transparent"
                                title="Move selected right"
                            >
                                {isProcessing && selectedSourceIds.size > 0 ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => handleTransfer('left')}
                                disabled={selectedTargetIds.size === 0 || !sourceStream || isProcessing}
                                className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600 shadow-sm border border-blue-100 dark:border-blue-800 disabled:border-transparent"
                                title="Move selected left"
                            >
                                {isProcessing && selectedTargetIds.size > 0 ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Right Pane (Target) */}
                        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden bg-white dark:bg-gray-800 relative">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={targetStudents.length > 0 && selectedTargetIds.size === targetStudents.length}
                                        onChange={() => toggleSelectAll('target')}
                                        disabled={!targetStream}
                                        className="rounded border-gray-300 text-blue-600"
                                    />
                                    <span className="font-bold text-gray-700 dark:text-gray-200">
                                        {targetStream || 'Stream B'}
                                    </span>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                    {targetStudents.length} enrolled {selectedTargetIds.size > 0 && `• ${selectedTargetIds.size} selected`}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {!targetStream ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Select a target stream above</div>
                                ) : targetStudents.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No students found</div>
                                ) : (
                                    targetStudents.map(student => (
                                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors border-b border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedTargetIds.has(student.id!)}
                                                onChange={() => toggleSelection(student.id!, 'target')}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-800">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{student.indexNumber || student.gender}</div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
