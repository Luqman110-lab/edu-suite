
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Ensure these are imported!
import { Plus, Edit2, Trash2, Users, CalendarCheck, CheckSquare, Bell, List, Clock, User as UserIcon } from 'lucide-react';
import { SchoolEvent, TermPlan, User, ProgramItem } from '../../types';

const EVENT_TYPES = [
    { value: 'academic', label: 'Academic' },
    { value: 'sports', label: 'Sports' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'religious', label: 'Religious' },
    { value: 'parents', label: 'Parents Meeting' },
    { value: 'examination', label: 'Examination' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    planned: { bg: 'bg-blue-100', text: 'text-blue-700' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
    postponed: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

interface EventsTabProps {
    events: SchoolEvent[];
    termPlans: TermPlan[];
    onAdd: () => void;
    onEdit: (event: SchoolEvent) => void;
    onDelete: (id: number) => void;
    onViewDetails: (event: SchoolEvent) => void;
    isDark: boolean;
}

export function EventsTab({
    events,
    termPlans,
    onAdd,
    onEdit,
    onDelete,
    onViewDetails,
    isDark,
}: EventsTabProps) {
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    const eventTypeLabel = (type: string) => EVENT_TYPES.find(t => t.value === type)?.label || type;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold ${textColor}`}>School Events</h2>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Event</span>
                </button>
            </div>

            {events.length === 0 ? (
                <div className={`text-center py-12 ${mutedText}`}>
                    <CalendarCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events scheduled. Add your first school event.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event) => (
                        <div key={event.id} className={`${cardBg} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-semibold ${textColor}`}>{event.name}</h3>
                                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                            {eventTypeLabel(event.eventType)}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[event.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[event.status]?.text || 'text-gray-700'}`}>
                                            {event.status}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${mutedText} mt-1`}>
                                        {event.startDate}{event.endDate && event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}
                                        {event.startTime && ` at ${event.startTime}`}
                                        {event.venue && ` | ${event.venue}`}
                                    </p>
                                    {event.description && (
                                        <p className={`text-sm ${mutedText} mt-1 line-clamp-1`}>{event.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onViewDetails(event)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[44px]"
                                    >
                                        <Users className="w-3 h-3" /> Details
                                    </button>
                                    <button
                                        onClick={() => onEdit(event)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(event.id)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface EventModalProps {
    event: SchoolEvent | null;
    termPlans: TermPlan[];
    users: User[];
    onClose: () => void;
    onSave: (data: Partial<SchoolEvent>) => void;
    isDark: boolean;
}

export function EventModal({
    event,
    termPlans,
    users,
    onClose,
    onSave,
    isDark,
}: EventModalProps) {
    const [formData, setFormData] = useState<Partial<SchoolEvent>>({
        name: event?.name || '',
        eventType: event?.eventType || 'academic',
        startDate: event?.startDate || '',
        endDate: event?.endDate || '',
        startTime: event?.startTime || '',
        endTime: event?.endTime || '',
        venue: event?.venue || '',
        description: event?.description || '',
        status: event?.status || 'planned',
        coordinatorId: event?.coordinatorId,
        termPlanId: event?.termPlanId,
    });

    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${textColor}`}>{event ? 'Edit Event' : 'New Event'}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Event Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="e.g., Annual Sports Day"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Event Type</label>
                            <select
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            >
                                {EVENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Coordinator</label>
                            <select
                                value={formData.coordinatorId || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, coordinatorId: e.target.value ? parseInt(e.target.value) : undefined }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            >
                                <option value="">Select Coordinator</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Date</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Time</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Time</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Venue</label>
                        <input
                            type="text"
                            value={formData.venue}
                            onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="e.g., Main Hall"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="postponed">Postponed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...formData, id: event?.id })}
                        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                    >
                        {event ? 'Update' : 'Create'} Event
                    </button>
                </div>
            </div>
        </div>
    );
}

interface EventDetailModalProps {
    event: SchoolEvent;
    users: User[];
    onClose: () => void;
    isDark: boolean;
}

export function EventDetailModal({
    event,
    users,
    onClose,
    isDark,
}: EventDetailModalProps) {
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'program'>('overview');

    const { data: eventDetails } = useQuery<SchoolEvent>({
        queryKey: ['/api/school-events', event.id],
        queryFn: async () => {
            const res = await fetch(`/api/school-events/${event.id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch event details');
            return res.json();
        },
    });

    const { data: programItems = [] } = useQuery<ProgramItem[]>({
        queryKey: ['/api/events', event.id, 'program'],
        queryFn: async () => {
            const res = await fetch(`/api/events/${event.id}/program`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch program');
            return res.json();
        }
    });

    const addProgramItemMutation = useMutation({
        mutationFn: async (data: Partial<ProgramItem>) => {
            const res = await fetch(`/api/events/${event.id}/program`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to add item");
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'program'] })
    });

    const notifyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/notifications/test', { method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => alert("Notification sent (Test)")
    });

    const [newItem, setNewItem] = useState<Partial<ProgramItem>>({ title: '', startTime: '' });

    const committees = eventDetails?.committees || [];
    const tasks = eventDetails?.tasks || [];

    const getUserName = (userId: number) => users.find(u => u.id === userId)?.name || 'Unknown';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-start`}>
                    <div>
                        <h2 className={`text-xl font-bold ${textColor}`}>{event.name}</h2>
                        <p className={mutedText}>
                            {event.startDate}{event.endDate && event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}
                            {event.venue && ` | ${event.venue}`}
                        </p>
                    </div>
                    <button
                        onClick={() => notifyMutation.mutate()}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                        <Bell className="w-4 h-4" /> Send Reminder
                    </button>
                </div>

                <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-red-800 text-red-800' : mutedText}`}
                        >Overview</button>
                        <button
                            onClick={() => setActiveTab('program')}
                            className={`px-4 py-3 text-sm font-medium ${activeTab === 'program' ? 'border-b-2 border-red-800 text-red-800' : mutedText}`}
                        >Program / Agenda</button>
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    {activeTab === 'overview' && (
                        <>
                            {event.description && (
                                <div>
                                    <h3 className={`font-medium mb-2 ${textColor}`}>Description</h3>
                                    <p className={mutedText}>{event.description}</p>
                                </div>
                            )}

                            <div>
                                <h3 className={`font-medium mb-2 ${textColor} flex items-center gap-2`}>
                                    <Users className="w-4 h-4" /> Committee Members
                                </h3>
                                {committees.length === 0 ? (
                                    <p className={mutedText}>No committee members assigned yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {committees.map((member) => (
                                            <div key={member.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                <div>
                                                    <span className={textColor}>{getUserName(member.userId)}</span>
                                                    <span className={`ml-2 text-sm ${mutedText}`}>- {member.role}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className={`font-medium mb-2 ${textColor} flex items-center gap-2`}>
                                    <CheckSquare className="w-4 h-4" /> Tasks
                                </h3>
                                {tasks.length === 0 ? (
                                    <p className={mutedText}>No tasks created yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {tasks.map((task) => (
                                            <div key={task.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                <div className="flex items-center gap-2">
                                                    <CheckSquare className={`w-4 h-4 ${task.status === 'completed' ? 'text-green-600' : mutedText}`} />
                                                    <span className={textColor}>{task.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    {task.assignedToId && <span className={mutedText}>{getUserName(task.assignedToId)}</span>}
                                                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[task.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[task.status]?.text || 'text-gray-700'}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'program' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input type="time" className={`p-2 rounded border ${inputBorder} ${inputBg} ${textColor}`} value={newItem.startTime} onChange={e => setNewItem({ ...newItem, startTime: e.target.value })} />
                                <input type="text" placeholder="Activity Title" className={`flex-1 p-2 rounded border ${inputBorder} ${inputBg} ${textColor}`} value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} />
                                <input type="text" placeholder="Responsible" className={`p-2 rounded border ${inputBorder} ${inputBg} ${textColor} w-32`} value={newItem.responsiblePerson || ''} onChange={e => setNewItem({ ...newItem, responsiblePerson: e.target.value })} />
                                <button onClick={() => {
                                    if (newItem.title) { addProgramItemMutation.mutate(newItem); setNewItem({ title: '', startTime: '' }); }
                                }} className="bg-red-800 text-white px-4 rounded hover:bg-red-900">Add</button>
                            </div>

                            <div className="space-y-2">
                                {programItems.map((item) => (
                                    <div key={item.id} className={`flex items-center p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                        <div className="w-24 font-mono text-sm">{item.startTime || '--:--'}</div>
                                        <div className="flex-1 font-medium">{item.title}</div>
                                        <div className="text-sm text-gray-500 mr-4">{item.responsiblePerson}</div>
                                        {/* Add edit/delete later if needed */}
                                    </div>
                                ))}
                                {programItems.length === 0 && <p className={mutedText}>No program items added.</p>}
                            </div>
                        </div>
                    )}
                </div>
                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
