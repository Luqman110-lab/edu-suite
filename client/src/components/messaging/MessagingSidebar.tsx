import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Conversation, User } from '../../types/messaging';

// Icons
const Icons = {
    Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Compose: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    Group: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
};

// Helper Functions
const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
};

const getDisplayName = (conv: Conversation, currentUserId: number | null) => {
    if (conv.isGroup && conv.groupName) return conv.groupName;
    const others = conv.participants.filter(p => p.id !== currentUserId);
    return others.length > 0 ? others.map(p => p.name).join(', ') : 'Just You';
};

const getAvatarInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

const SidebarItem = ({
    conv,
    isActive,
    currentUserId,
    onlineUsers
}: {
    conv: Conversation;
    isActive: boolean;
    currentUserId: number | null;
    onlineUsers: Set<number>;
}) => {
    const displayName = getDisplayName(conv, currentUserId);
    const initial = getAvatarInitial(displayName);
    const isGroup = conv.isGroup;

    // Find if other participant is online (for 1on1)
    const otherParticipant = !isGroup
        ? conv.participants.find(p => p.id !== currentUserId)
        : null;
    const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.id) : false;

    return (
        <Link to={`/app/messages/${conv.id}`}>
            <motion.div
                initial={false}
                animate={{ backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                className={`p-3 mx-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex gap-3 items-center ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : (isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-gray-400 to-gray-500')}`}>
                    {isGroup ? <Icons.Group /> : initial}

                    {/* Online Indicator */}
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" title="Online" />
                    )}

                    {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px]">
                            {conv.unreadCount}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                            {displayName}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessageAt)}
                        </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {conv.lastMessage?.isDeleted ? (
                            <span className="italic text-gray-400">🚫 Message deleted</span>
                        ) : conv.lastMessage ? (
                            <>
                                {conv.lastMessage.senderId === currentUserId && <span className="opacity-70">You: </span>}
                                {conv.lastMessage.messageType === 'file' ? (conv.lastMessage.attachments?.some(a => a.type.includes('audio')) ? '🎤 Voice Note' : '📎 Attachment') : conv.lastMessage.content}
                            </>
                        ) : (
                            <span className="italic opacity-50">No messages yet</span>
                        )}
                    </p>
                </div>
            </motion.div>
        </Link>
    );
};

export const MessagingSidebar = ({
    conversations,
    activeId,
    onNewMessage,
    searchTerm,
    setSearchTerm,
    currentUserId,
    onlineUsers
}: {
    conversations: Conversation[];
    activeId?: number;
    onNewMessage: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    currentUserId: number | null;
    onlineUsers: Set<number>;
}) => {
    const filtered = conversations.filter(c =>
        getDisplayName(c, currentUserId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Messages
                    </h1>
                    <button
                        onClick={onNewMessage}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                        <Icons.Compose />
                    </button>
                </div>

                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                        <Icons.Search />
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1">
                {filtered.map(conv => (
                    <SidebarItem
                        key={conv.id}
                        conv={conv}
                        isActive={activeId === conv.id}
                        currentUserId={currentUserId}
                        onlineUsers={onlineUsers}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400 text-sm">
                        No conversations found
                    </div>
                )}
            </div>
        </div>
    );
};
