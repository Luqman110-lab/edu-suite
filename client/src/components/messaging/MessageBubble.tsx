import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Message } from '../../types/messaging';

// Icons
const Icons = {
    Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    More: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>,
    Reply: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
};

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
};

export const MessageBubble = ({
    msg,
    isOwn,
    senderName,
    onReact,
    onReply,
    onEdit,
    onDelete,
    replyParent
}: {
    msg: Message;
    isOwn: boolean;
    senderName?: string;
    onReact: (emoji: string) => void;
    onReply: (msg: Message) => void;
    onEdit?: (msg: Message) => void;
    onDelete?: (msg: Message) => void;
    replyParent?: Message
}) => {
    const [showActions, setShowActions] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // If deleted, simple render
    if (msg.isDeleted) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border text-gray-400 italic text-sm flex items-center gap-2">
                    <Icons.Trash /> This message was deleted
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex mb-4 group ${isOwn ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowMenu(false); }}
        >
            <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                {/* Reply Parent Preview */}
                {replyParent && (
                    <div className={`text-xs p-2 mb-1 rounded-lg bg-gray-200 dark:bg-gray-700 opacity-80 border-l-4 border-blue-500 max-w-full truncate ${isOwn ? 'mr-1' : 'ml-1'}`}>
                        <span className="font-bold block text-gray-600 dark:text-gray-300">
                            Replying to {replyParent.sender?.name || 'User'}
                        </span>
                        {replyParent.isDeleted ? 'Message deleted' : replyParent.content}
                    </div>
                )}

                {!isOwn && senderName && (
                    <span className="text-xs text-gray-400 ml-3 mb-1">{senderName}</span>
                )}

                <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm relative leading-relaxed group/bubble ${isOwn
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                    }`}>
                    {/* Menu Button */}
                    {showActions && (
                        <div className={`absolute -top-3 ${isOwn ? '-left-8' : '-right-8'} p-1`}>
                            <button onClick={() => setShowMenu(!showMenu)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600">
                                <Icons.More />
                            </button>
                            {showMenu && (
                                <div className={`absolute top-full ${isOwn ? 'right-0' : 'left-0'} mt-1 w-32 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 z-20 flex flex-col`}>
                                    <button onClick={() => { onReply(msg); setShowMenu(false); }} className="px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs flex items-center gap-2">
                                        <Icons.Reply /> Reply
                                    </button>
                                    {isOwn && onEdit && (
                                        <button onClick={() => { onEdit(msg); setShowMenu(false); }} className="px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs flex items-center gap-2">
                                            <Icons.Edit /> Edit
                                        </button>
                                    )}
                                    {isOwn && onDelete && (
                                        <button onClick={() => { onDelete(msg); setShowMenu(false); }} className="px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs flex items-center gap-2">
                                            <Icons.Trash /> Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attachments (Images, etc) */}
                    {msg.attachments && msg.attachments.length > 0 && !msg.attachments.some(a => a.type.includes('audio')) && (
                        <div className="mb-2 space-y-2">
                            {msg.attachments.map((att, i) => (
                                <div key={i} className="bg-black/10 dark:bg-white/10 p-2 rounded-lg">
                                    {att.type.startsWith('image/') ? (
                                        <img src={att.url} alt={att.name} className="max-w-full h-auto rounded-md" />
                                    ) : (
                                        <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-xs">
                                            📎 {att.name}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Voice Notes */}
                    {msg.attachments && msg.attachments.some(a => a.type.includes('audio')) && (
                        <div className="min-w-[200px]">
                            {msg.attachments.filter(a => a.type.includes('audio')).map((att, i) => (
                                <audio key={i} controls src={att.url} className="w-full h-8 mt-1 mb-1" />
                            ))}
                        </div>
                    )}

                    {!(msg.content === 'Voice Note' && msg.attachments?.some(a => a.type.includes('audio'))) && msg.content}
                    {msg.isEdited && <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>}

                    {/* Read Receipt (Double Tick) */}
                    {isOwn && (
                        <span className={`float-right ml-2 mt-2 -mb-1 ${msg.readByAll ? 'text-blue-500' : 'text-gray-300'}`} title={msg.readByAll ? "Read" : "Sent"}>
                            <svg className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <svg className="w-3 h-3 inline-block -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                    )}
                </div>

                {/* Reactions Display */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-gray-800 rounded-full px-2 py-0.5 shadow-md border border-gray-100 text-xs`}>
                        {msg.reactions.map((r, i) => <span key={i}>{r.emoji}</span>)}
                    </div>
                )}

                {/* Reaction Picker (Simple Hover) */}
                {showActions && !showMenu && (
                    <div className={`absolute -top-3 ${isOwn ? 'right-0' : 'left-0'} bg-white dark:bg-gray-800 shadow-lg rounded-full px-2 py-1 flex gap-1 animate-in fade-in zoom-in duration-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {['👍', '❤️', '😂', '😮'].map(emoji => (
                            <button key={emoji} onClick={() => onReact(emoji)} className="hover:scale-125 transition-transform p-1">
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <span className="text-[10px] text-gray-400 mt-1 opacity-70 px-1">
                    {formatTime(msg.createdAt)}
                </span>
            </div>
        </motion.div>
    );
};
