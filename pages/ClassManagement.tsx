
import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { dbService } from '../services/api';
import { ClassLevel, SchoolSettings } from '../types';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Users, Layers, BookOpen, AlertCircle, X, Check } from 'lucide-react';

const fetchSettings = async () => {
    return await dbService.getSettings();
};

export function ClassManagement() {
    const { user, activeSchool } = useAuth();
    const { data: settings, refetch } = useQuery<SchoolSettings>({
        queryKey: ['settings', activeSchool?.id],
        queryFn: fetchSettings,
        enabled: !!activeSchool?.id,
    });

    const [newStreams, setNewStreams] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    // Group class levels
    const nurseryLevels = ['N1', 'N2', 'N3'];
    const primaryLevels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

    const handleAddStream = async (classLevel: string) => {
        const streamName = newStreams[classLevel]?.trim();
        if (!streamName) return;

        if (settings?.streams[classLevel]?.includes(streamName)) {
            alert('Stream already exists!');
            return;
        }

        setLoading(true);
        try {
            await dbService.addStream(classLevel, streamName);
            setNewStreams(prev => ({ ...prev, [classLevel]: '' }));
            refetch();
        } catch (error) {
            console.error(error);
            alert('Failed to add stream');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStream = async (classLevel: string, streamName: string) => {
        if (!confirm(`Are you sure you want to remove ${classLevel} - ${streamName}?`)) return;

        setLoading(true);
        try {
            await dbService.removeStream(classLevel, streamName);
            refetch();
        } catch (error) {
            console.error(error);
            alert('Failed to remove stream');
        } finally {
            setLoading(false);
        }
    };

    const renderClassCard = (level: string) => {
        const streams = settings?.streams[level] || [];
        const inputStream = newStreams[level] || '';

        return (
            <div key={level} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                            ${nurseryLevels.includes(level)
                                ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                                : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                            }`}>
                            {level}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {nurseryLevels.includes(level) ? 'Nursery' : 'Primary'} {level.replace(/\D/g, '')}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {streams.length} Streams
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {streams.length > 0 ? (
                            streams.map(stream => (
                                <div key={stream} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <span>{stream}</span>
                                    <button
                                        onClick={() => handleRemoveStream(level, stream)}
                                        disabled={loading}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-400 italic w-full text-center py-2 flex flex-col items-center gap-1">
                                <AlertCircle className="w-4 h-4 opacity-50" />
                                No streams added
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={inputStream}
                            onChange={(e) => setNewStreams(prev => ({ ...prev, [level]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddStream(level)}
                            placeholder="Add stream (e.g. Red)..."
                            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                        <button
                            onClick={() => handleAddStream(level)}
                            disabled={!inputStream || loading}
                            className={`absolute right-1.5 top-1.5 p-1.5 rounded-lg transition-all ${inputStream
                                    ? 'bg-primary-500 text-white shadow-sm hover:bg-primary-600'
                                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage academic classes and streams</p>
                </div>
            </div>

            {/* Nursery Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
                        <Users className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nursery Section</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nurseryLevels.map(level => renderClassCard(level))}
                </div>
            </div>

            {/* Primary Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Primary Section</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {primaryLevels.map(level => renderClassCard(level))}
                </div>
            </div>
        </div>
    );
}
