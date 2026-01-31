import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BoardingSettings as BoardingSettingsType } from '../../types';
import { dbService } from '../../services/api';
import { Save, Clock, Calendar, Shield } from 'lucide-react';

export const BoardingSettings: React.FC = () => {
    const { isDark } = useTheme();
    const [settings, setSettings] = useState<BoardingSettingsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await dbService.getBoardingSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load boarding settings:', error);
            showToast('Failed to load boarding settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const updated = await dbService.updateBoardingSettings(settings);
            setSettings(updated);
            showToast('Boarding settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
        : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;
    const sectionClasses = `p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
    const headerClasses = `text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`;
    const descriptionClasses = `text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    if (loading) {
        return <div className="p-8 text-center">Loading settings...</div>;
    }

    if (!settings) {
        return <div className="p-8 text-center text-red-500">Failed to load settings</div>;
    }

    return (
        <div className="space-y-6">
            {/* Roll Call Configuration */}
            <div className={sectionClasses}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={headerClasses}>Roll Call Schedule</h3>
                        <p className={descriptionClasses}>Set automatic times for daily roll calls.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={labelClasses}>Morning Check</label>
                            <input
                                type="checkbox"
                                checked={settings.enableMorningRollCall}
                                onChange={e => setSettings({ ...settings, enableMorningRollCall: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                        </div>
                        <input
                            type="time"
                            className={inputClasses}
                            value={settings.morningRollCallTime}
                            onChange={e => setSettings({ ...settings, morningRollCallTime: e.target.value })}
                            disabled={!settings.enableMorningRollCall}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={labelClasses}>Evening Check</label>
                            <input
                                type="checkbox"
                                checked={settings.enableEveningRollCall}
                                onChange={e => setSettings({ ...settings, enableEveningRollCall: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                        </div>
                        <input
                            type="time"
                            className={inputClasses}
                            value={settings.eveningRollCallTime}
                            onChange={e => setSettings({ ...settings, eveningRollCallTime: e.target.value })}
                            disabled={!settings.enableEveningRollCall}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={labelClasses}>Night Check</label>
                            <input
                                type="checkbox"
                                checked={settings.enableNightRollCall}
                                onChange={e => setSettings({ ...settings, enableNightRollCall: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                        </div>
                        <input
                            type="time"
                            className={inputClasses}
                            value={settings.nightRollCallTime}
                            onChange={e => setSettings({ ...settings, nightRollCallTime: e.target.value })}
                            disabled={!settings.enableNightRollCall}
                        />
                    </div>
                </div>
            </div>

            {/* Visiting Rules */}
            <div className={sectionClasses}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={headerClasses}>Visiting Schedule</h3>
                        <p className={descriptionClasses}>Define allowed visiting days and hours.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Visiting Days</label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <label key={day} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.visitingDays?.includes(day) || false}
                                        onChange={e => {
                                            const newDays = e.target.checked
                                                ? [...settings.visitingDays, day]
                                                : settings.visitingDays.filter(d => d !== day);
                                            setSettings({ ...settings, visitingDays: newDays });
                                        }}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{day}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClasses}>Start Time</label>
                            <input
                                type="time"
                                className={inputClasses}
                                value={settings.visitingHoursStart}
                                onChange={e => setSettings({ ...settings, visitingHoursStart: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>End Time</label>
                            <input
                                type="time"
                                className={inputClasses}
                                value={settings.visitingHoursEnd}
                                onChange={e => setSettings({ ...settings, visitingHoursEnd: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security & Automation */}
            <div className={sectionClasses}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={headerClasses}>Security & Automation</h3>
                        <p className={descriptionClasses}>Configure automated actions and security requirements.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={settings.requireGuardianApproval}
                            onChange={e => setSettings({ ...settings, requireGuardianApproval: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                        />
                        <div>
                            <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Require Guardian Approval</span>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students cannot leave without explicit guardian consent via portal/SMS.</p>
                        </div>
                    </label>

                    <div>
                        <label className={labelClasses}>Auto-mark Absent Delay (Minutes)</label>
                        <input
                            type="number"
                            className={inputClasses}
                            value={settings.autoMarkAbsentAfterMinutes}
                            onChange={e => setSettings({ ...settings, autoMarkAbsentAfterMinutes: parseInt(e.target.value) || 0 })}
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Students not verified within this time after roll call starts will be marked absent.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};
