import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '../../types/messaging';

// Icons
const Icons = {
    Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
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
    const [isGroup, setIsGroup] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadUsers();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        // Reset form
        setSubject('');
        setMessage('');
        setGroupName('');
        setSelectedIds([]);
        setIsGroup(false);
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
                    <div className="flex gap-4 mb-2">
                        <button
                            type="button"
                            onClick={() => setIsGroup(false)}
                            className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${!isGroup ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Direct Message
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsGroup(true)}
                            className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${isGroup ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Group Chat
                        </button>
                    </div>

                    {isGroup ? (
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="What's this about?"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipients</label>
                        <div className="h-32 overflow-y-auto border rounded-xl p-2 dark:bg-gray-700 dark:border-gray-600 space-y-1">
                            {users.map(u => (
                                <div
                                    key={u.id}
                                    onClick={() => toggleUser(u.id)}
                                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${selectedIds.includes(u.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{getAvatarInitial(u.name)}</div>
                                        <span className="text-sm font-medium">{u.name}</span>
                                        <span className="text-xs text-gray-400 uppercase tracking-wider">{u.role}</span>
                                    </div>
                                    {selectedIds.includes(u.id) && <Icons.Check />}
                                </div>
                            ))}
                        </div>
                    </div>

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
                            disabled={loading || (!subject && !groupName) || !message || selectedIds.length === 0}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : (isGroup ? 'Create Group' : 'Send Message')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
