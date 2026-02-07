import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, BookOpen, DollarSign, CalendarCheck, MessageSquare, Calendar, AlertCircle } from "lucide-react";

type FilterType = 'all' | 'academic' | 'fees' | 'attendance' | 'event' | 'message';

export default function ParentNotifications() {
    const [filter, setFilter] = useState<FilterType>('all');

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent-notifications'],
        queryFn: async () => {
            const res = await fetch('/api/parent/notifications', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading notifications...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Failed to load notifications.</p>
        </div>
    );

    const allNotifications = data?.notifications || [];
    const filtered = filter === 'all'
        ? allNotifications
        : allNotifications.filter((n: any) => n.type === filter);

    const filters: { key: FilterType; label: string; icon: any }[] = [
        { key: 'all', label: 'All', icon: Bell },
        { key: 'academic', label: 'Academic', icon: BookOpen },
        { key: 'fees', label: 'Fees', icon: DollarSign },
        { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
        { key: 'event', label: 'Events', icon: Calendar },
        { key: 'message', label: 'Messages', icon: MessageSquare },
    ];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'academic': return <BookOpen className="w-4 h-4" />;
            case 'fees': return <DollarSign className="w-4 h-4" />;
            case 'attendance': return <CalendarCheck className="w-4 h-4" />;
            case 'event': return <Calendar className="w-4 h-4" />;
            case 'message': return <MessageSquare className="w-4 h-4" />;
            default: return <Bell className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'academic': return 'bg-blue-100 text-blue-600';
            case 'fees': return 'bg-green-100 text-green-600';
            case 'attendance': return 'bg-red-100 text-red-600';
            case 'event': return 'bg-purple-100 text-purple-600';
            case 'message': return 'bg-orange-100 text-orange-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-500">Stay updated on your children's school activities.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${filter === f.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <f.icon className="w-4 h-4" />
                        {f.label}
                        {f.key !== 'all' && (
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {allNotifications.filter((n: any) => n.type === f.key).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-lg border shadow-sm">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No notifications in this category.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filtered.map((notification: any) => (
                            <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                                        {getTypeIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${getTypeColor(notification.type)}`}>
                                                {notification.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {notification.date ? new Date(notification.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
