import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings, ActivityLog } from '../../types';

interface SecuritySettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings, onUpdate }) => {
    const { isDark } = useTheme();
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    useEffect(() => {
        loadActivityLogs();
    }, []);

    const loadActivityLogs = async () => {
        try {
            const response = await fetch('/api/activity-logs?limit=20', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setActivityLogs(data);
            }
        } catch (err) {
            console.error('Failed to load activity logs:', err);
        }
    };

    const defaultSecurityConfig = {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: false,
        passwordExpiryDays: 0,
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        require2FA: false,
        allowedIPAddresses: [] as string[],
        enforceIPWhitelist: false
    };

    const securityConfig = { ...defaultSecurityConfig, ...settings.securityConfig };

    const updateSecurityConfig = (updates: Partial<typeof defaultSecurityConfig>) => {
        onUpdate({ securityConfig: { ...securityConfig, ...updates } });
    };

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Password Policy</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Define password requirements for all users</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Minimum Password Length</label>
                        <input
                            type="number"
                            min="6"
                            max="32"
                            className={inputClasses}
                            value={securityConfig.passwordMinLength}
                            onChange={e => updateSecurityConfig({ passwordMinLength: Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Password Expiry (Days)</label>
                        <input
                            type="number"
                            min="0"
                            className={inputClasses}
                            value={securityConfig.passwordExpiryDays}
                            onChange={e => updateSecurityConfig({ passwordExpiryDays: Number(e.target.value) })}
                        />
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Set to 0 for no expiry</p>
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={securityConfig.passwordRequireUppercase}
                            onChange={e => updateSecurityConfig({ passwordRequireUppercase: e.target.checked })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require uppercase letters (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={securityConfig.passwordRequireLowercase}
                            onChange={e => updateSecurityConfig({ passwordRequireLowercase: e.target.checked })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require lowercase letters (a-z)</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={securityConfig.passwordRequireNumbers}
                            onChange={e => updateSecurityConfig({ passwordRequireNumbers: e.target.checked })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={securityConfig.passwordRequireSpecialChars}
                            onChange={e => updateSecurityConfig({ passwordRequireSpecialChars: e.target.checked })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require special characters (!@#$%^&*)</span>
                    </label>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Session & Login Settings</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Control session timeouts and login attempts</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Session Timeout (Minutes)</label>
                        <input
                            type="number"
                            min="5"
                            max="1440"
                            className={inputClasses}
                            value={securityConfig.sessionTimeoutMinutes}
                            onChange={e => updateSecurityConfig({ sessionTimeoutMinutes: Number(e.target.value) })}
                        />
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Time before inactive users are logged out</p>
                    </div>
                    <div>
                        <label className={labelClasses}>Max Login Attempts</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            className={inputClasses}
                            value={securityConfig.maxLoginAttempts}
                            onChange={e => updateSecurityConfig({ maxLoginAttempts: Number(e.target.value) })}
                        />
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Failed attempts before account lockout</p>
                    </div>
                    <div>
                        <label className={labelClasses}>Lockout Duration (Minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="1440"
                            className={inputClasses}
                            value={securityConfig.lockoutDurationMinutes}
                            onChange={e => updateSecurityConfig({ lockoutDurationMinutes: Number(e.target.value) })}
                        />
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Time before locked account can try again</p>
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Activity Logs</h3>
                <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                    {activityLogs.length === 0 ? (
                        <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No activity logs available</p>
                    ) : (
                        activityLogs.slice(0, 10).map((log) => (
                            <div key={log.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.action.replace(/_/g, ' ')}</p>
                                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {log.userName || 'System'} - {new Date(log.createdAt || '').toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
