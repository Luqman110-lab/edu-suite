import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from '../../types/messaging';

// Icons
const Icons = {
    Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    Search: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
};

const getAvatarInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

export const NewMessageModal = ({
    isOpen,
    onClose,
    onSend
}: {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => Promise<void>;
}) => {
    const [subject, setSubject] = useState('');
    const [groupName, setGroupName] = useState('');
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [mode, setMode] = useState<'dm' | 'group' | 'broadcast'>('dm');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            setSearchQuery('');
        }
    }, [isOpen]);

    const loadUsers = async () => {
        try {
            const res = await fetch('/api/messaging/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const toggleUser = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Filter and group users by role
    const filteredGroupedUsers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = query
            ? users.filter(u => u.name.toLowerCase().includes(query) || (u.role || '').toLowerCase().includes(query))
            : users;

        // Group by role, sorted alphabetically within groups
        const groups: Record<string, User[]> = {};
        const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        for (const user of sorted) {
            const role = (user.role || 'staff').charAt(0).toUpperCase() + (user.role || 'staff').slice(1);
            if (!groups[role]) groups[role] = [];
            groups[role].push(user);
        }
        // Sort group keys: Admin first, then alphabetical
        const order = Object.keys(groups).sort((a, b) => {
            if (a === 'Admin') return -1;
            if (b === 'Admin') return 1;
            return a.localeCompare(b);
        });
        return order.map(role => ({ role, users: groups[role] }));
    }, [users, searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'broadcast') {
            if (!subject || !message) return;
            setLoading(true);
            try {
                const res = await fetch('/api/conversations/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: subject, message })
                });
                if (res.ok) {
                    const conv = await res.json();
                    await onSend({ _broadcast: true, conversationId: conv.id });
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
            onClose();
            setSubject(''); setMessage(''); setGroupName(''); setSelectedIds([]); setMode('dm');
            return;
        }

        const isGroup = mode === 'group';
        if ((!groupName && isGroup) || (!subject && !groupName) || !message || selectedIds.length === 0) return;
        setLoading(true);
        await onSend({
            subject: isGroup ? groupName : subject,
            participantIds: selectedIds,
            initialMessage: message,
            isGroup,
            groupName: isGroup ? groupName : undefined
        });
        setLoading(false);
        onClose();
        setSubject(''); setMessage(''); setGroupName(''); setSelectedIds([]); setMode('dm');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">New Conversation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-2 mb-2">
                        {(['dm', 'group', 'broadcast'] as const).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                            >
                                {m === 'dm' ? 'Direct' : m === 'group' ? 'Group' : '📢 Broadcast'}
                            </button>
                        ))}
                    </div>

                    {mode === 'group' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                placeholder="e.g. Science Teachers"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {mode === 'broadcast' ? 'Announcement Title' : 'Subject'}
                            </label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder={mode === 'broadcast' ? 'e.g. Staff Meeting Tomorrow' : "What's this about?"}
                            />
                        </div>
                    )}

                    {mode === 'broadcast' && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                            <p className="text-xs text-amber-700 dark:text-amber-300">📢 This announcement will be sent to <strong>all users</strong> in your school.</p>
                        </div>
                    )}

                    {mode !== 'broadcast' && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipients</label>
                                {selectedIds.length > 0 && (
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        {selectedIds.length} selected
                                    </span>
                                )}
                            </div>
                            {/* Search input */}
                            <div className="relative mb-2">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Icons.Search />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or role..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {/* Grouped user list */}
                            <div className="h-48 overflow-y-auto border rounded-xl p-2 dark:bg-gray-700 dark:border-gray-600 space-y-2">
                                {filteredGroupedUsers.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">No users found</p>
                                )}
                                {filteredGroupedUsers.map(group => (
                                    <div key={group.role}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 py-1">{group.role}s</p>
                                        {group.users.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleUser(u.id)}
                                                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${selectedIds.includes(u.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">{getAvatarInitial(u.name)}</div>
                                                    <span className="text-sm font-medium dark:text-gray-200">{u.name}</span>
                                                </div>
                                                {selectedIds.includes(u.id) && <Icons.Check />}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Hello..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading || (mode === 'broadcast' ? !subject : ((!subject && !groupName) || selectedIds.length === 0)) || !message}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : (mode === 'group' ? 'Create Group' : mode === 'broadcast' ? '📢 Broadcast' : 'Send Message')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
