import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Alert {
    severity: 'critical' | 'warning' | 'info' | 'success';
    type: string;
    message: string;
    detail?: string;
    action?: string;
}

interface AlertsPanelProps {
    alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
    const navigate = useNavigate();

    const icons = {
        critical: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    };

    const bgColors = {
        critical: 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30',
        warning: 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30',
        info: 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30',
        success: 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 h-full">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-5 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Actionable Alerts
            </h3>
            <div className="space-y-3">
                {(!alerts || alerts.length === 0) ? (
                    <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                        No critical alerts at this time. You're all caught up!
                    </div>
                ) : (
                    alerts.map((alert, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${bgColors[alert.severity]}`}>
                            <div className="shrink-0 mt-0.5">{icons[alert.severity]}</div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{alert.message}</h4>
                                {alert.detail && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{alert.detail}</p>
                                )}
                            </div>
                            {alert.action && (
                                <button
                                    onClick={() => navigate(alert.action!)}
                                    className="shrink-0 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
