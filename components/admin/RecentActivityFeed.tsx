import React from 'react';
import { Activity, User, Building2, Trash2, Edit, Key } from 'lucide-react';
import { format } from 'date-fns';

export interface AuditLog {
    id: number;
    userName: string;
    action: string;
    entityType: string;
    entityName: string;
    createdAt: string;
}

interface RecentActivityFeedProps {
    logs: AuditLog[];
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ logs }) => {
    const getIcon = (action: string) => {
        if (action.includes('delete')) return Trash2;
        if (action.includes('update') || action.includes('edit')) return Edit;
        if (action.includes('reset')) return Key;
        if (action.includes('create')) return Building2; // Default for create
        return Activity;
    };

    const getColor = (action: string) => {
        if (action.includes('delete')) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        if (action.includes('update')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        if (action.includes('create')) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!logs?.length) {
        return (
            <div className="text-center py-8 text-gray-500">
                No recent activity found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => {
                const Icon = getIcon(log.action);
                return (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className={`p-2 rounded-lg shrink-0 ${getColor(log.action)}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                <span className="font-semibold">{log.userName}</span>
                                <span className="font-normal text-gray-500 mx-1">{log.action}</span>
                                <span className="font-semibold text-primary-600 dark:text-primary-400">{log.entityType}</span>
                            </p>
                            {log.entityName && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    Target: "{log.entityName}"
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
