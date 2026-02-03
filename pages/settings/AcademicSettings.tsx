import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings } from '../../types';
import { Calendar } from 'lucide-react';

interface AcademicSettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
    onRefresh: () => void;
}

export const AcademicSettings: React.FC<AcademicSettingsProps> = ({ settings, onUpdate, onRefresh }) => {
    const { isDark } = useTheme();

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
        : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

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

        </div>
    );
};
