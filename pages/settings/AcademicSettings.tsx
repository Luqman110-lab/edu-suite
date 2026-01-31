import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings, ClassLevel } from '../../types';
import { dbService } from '../../services/api';
import { Calendar, Plus, X, Edit2, Check } from 'lucide-react';

interface AcademicSettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
    onRefresh: () => void;
}

export const AcademicSettings: React.FC<AcademicSettingsProps> = ({ settings, onUpdate, onRefresh }) => {
    const { isDark } = useTheme();
    const [newStreams, setNewStreams] = useState<{ [key: string]: string }>({});
    const [editingStream, setEditingStream] = useState<{ class: string, old: string, new: string } | null>(null);

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    const addStream = async (classLevel: string) => {
        const val = newStreams[classLevel];
        if (val && val.trim()) {
            const streamName = val.trim();
            // Since settings prop is read-only here effectively until we save, 
            // but dbService calls persist immediately? The original code did dbService call + loadSettings().
            // So we should do the same.
            if (settings?.streams[classLevel]?.includes(streamName)) {
                alert("Stream already exists");
                return;
            }
            await dbService.addStream(classLevel, streamName);
            setNewStreams(prev => ({ ...prev, [classLevel]: '' }));
            onRefresh();
        }
    };

    const removeStream = async (classLevel: string, streamToRemove: string) => {
        if (window.confirm(`Remove '${streamToRemove}' from ${classLevel}?`)) {
            await dbService.removeStream(classLevel, streamToRemove);
            onRefresh();
        }
    };

    const saveEditedStream = async () => {
        if (editingStream && editingStream.new.trim()) {
            if (editingStream.new !== editingStream.old) {
                await dbService.renameStream(editingStream.class, editingStream.old, editingStream.new.trim());
                onRefresh();
            }
            setEditingStream(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Academic Calendar</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Manage terms and dates.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Current Term</label>
                        <div className="relative">
                            <select
                                className={inputClasses}
                                value={settings.currentTerm}
                                onChange={e => onUpdate({ currentTerm: Number(e.target.value) })}
                            >
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>Current Year</label>
                        <input
                            type="number"
                            className={inputClasses}
                            value={settings.currentYear}
                            onChange={e => onUpdate({ currentYear: Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Next Term Begins (Boarders)</label>
                        <div className="relative">
                            <input
                                type="date"
                                className={inputClasses}
                                value={settings.nextTermBeginBoarders}
                                onChange={e => onUpdate({ nextTermBeginBoarders: e.target.value })}
                            />
                            <Calendar className={`absolute right-4 top-[2.5rem] w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>Next Term Begins (Day)</label>
                        <div className="relative">
                            <input
                                type="date"
                                className={inputClasses}
                                value={settings.nextTermBeginDay}
                                onChange={e => onUpdate({ nextTermBeginDay: e.target.value })}
                            />
                            <Calendar className={`absolute right-4 top-[2.5rem] w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Class Streams</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Manage streams for each class level.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.values(ClassLevel).map((level) => (
                        <div key={level} className={`p-4 rounded-xl border ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{level}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-white border border-gray-200'}`}>
                                    {settings.streams[level]?.length || 0} streams
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                {(settings.streams[level] || []).map(stream => (
                                    <div key={stream} className={`flex items-center justify-between group p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100 border border-transparent hover:border-gray-200'} transition-all`}>
                                        {editingStream?.class === level && editingStream.old === stream ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <input
                                                    type="text"
                                                    className={`flex-1 px-2 py-1 text-sm rounded border focus:outline-none ${isDark ? 'border-primary-500 bg-gray-800 text-white' : 'border-primary-500 bg-white text-gray-900'}`}
                                                    value={editingStream.new}
                                                    onChange={e => setEditingStream({ ...editingStream, new: e.target.value })}
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && saveEditedStream()}
                                                />
                                                <button type="button" onClick={saveEditedStream} className="p-1 text-success-500 hover:bg-success-500/10 rounded">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setEditingStream(null)} className="p-1 text-gray-400 hover:bg-gray-500/10 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{stream}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingStream({ class: level, old: stream, new: stream })}
                                                        className={`p-1.5 rounded ${isDark ? 'text-gray-400 hover:text-primary-400 hover:bg-primary-400/10' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStream(level, stream)}
                                                        className={`p-1.5 rounded ${isDark ? 'text-gray-400 hover:text-danger-400 hover:bg-danger-400/10' : 'text-gray-400 hover:text-danger-600 hover:bg-danger-50'}`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {(!settings.streams[level] || settings.streams[level].length === 0) && (
                                    <div className={`text-xs text-center py-2 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No streams added</div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="New stream..."
                                    className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-primary-500 ${isDark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`}
                                    value={newStreams[level] || ''}
                                    onChange={e => setNewStreams({ ...newStreams, [level]: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && addStream(level)}
                                />
                                <button
                                    type="button"
                                    onClick={() => addStream(level)}
                                    disabled={!newStreams[level]?.trim()}
                                    className={`p-2 rounded-lg transition-colors ${!newStreams[level]?.trim()
                                            ? (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
                                            : (isDark ? 'bg-primary-600 hover:bg-primary-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white')
                                        }`}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
