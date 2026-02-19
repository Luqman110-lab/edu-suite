import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, Attachment } from '../../types/messaging';
import { MessageBubble } from './MessageBubble';
import { AudioRecorder } from '../../AudioRecorder';

// Icons
const Icons = {
    Back: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    Group: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Attach: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    Mic: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    Reply: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
    Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    Send: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    Empty: () => (
        <svg className="w-24 h-24 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    ),
};

const getDisplayName = (conv: Conversation, currentUserId: number | null) => {
    if (conv.isGroup && conv.groupName) return conv.groupName;
    const others = conv.participants.filter(p => p.id !== currentUserId);
    return others.length > 0 ? others.map(p => p.name).join(', ') : 'Just You';
};

const getAvatarInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

export const ChatArea = ({
    conversation,
    messages,
    currentUserId,
    onSend,
    onBack,
    onReact,
    onDeleteMessage,
    onEditMessage,
    onTyping,
    sending,
    typingUsers
}: {
    conversation: Conversation;
    messages: Message[];
    currentUserId: number | null;
    onSend: (text: string, attachments?: Attachment[], replyToId?: number) => void;
    onBack?: () => void;
    onReact: (msgId: number, emoji: string) => void;
    onDeleteMessage: (msgId: number) => void;
    onEditMessage: (msgId: number, newContent: string) => Promise<void>;
    onTyping: () => void;
    sending: boolean;
    typingUsers: number[];
}) => {
    const [inputText, setInputText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showRecorder, setShowRecorder] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers, replyingTo, showRecorder]);

    // If editing, set input text
    useEffect(() => {
        if (editingId) {
            const msg = messages.find(m => m.id === editingId);
            if (msg) setInputText(msg.content);
        }
    }, [editingId, messages]);

    // Handle typing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        onTyping();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!inputText.trim() && attachments.length === 0) || sending) return;

        if (editingId) {
            await onEditMessage(editingId, inputText);
            setEditingId(null);
            setInputText('');
        } else {
            onSend(inputText, attachments, replyingTo?.id);
            setInputText('');
            setAttachments([]);
            setReplyingTo(null);
        }
    };

    const handleVoiceUpload = async (file: File) => {
        setShowRecorder(false);

        // Upload file
        const reader = new FileReader();
        reader.onload = async (ev) => {
            if (ev.target?.result) {
                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileName: file.name,
                            fileData: ev.target.result
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const voiceAtt = {
                            url: data.url,
                            name: 'Voice Note',
                            type: file.type,
                            size: file.size
                        };
                        // Send message immediately
                        onSend('Voice Note', [voiceAtt]);
                    }
                } catch (e) {
                    console.error("Voice upload failed", e);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const cancelAction = () => {
        setReplyingTo(null);
        setEditingId(null);
        setInputText('');
    };

    const displayName = getDisplayName(conversation, currentUserId);
    const isTypingMessage = typingUsers.length > 0 ? "Someone is typing..." : "";

    // Handle file upload selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result) {
                    try {
                        // Upload immediately to get URL
                        const res = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fileName: file.name,
                                fileData: ev.target.result
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            setAttachments(prev => [...prev, {
                                url: data.url,
                                name: file.name,
                                type: file.type,
                                size: file.size
                            }]);
                        }
                    } catch (err) {
                        console.error("Upload failed", err);
                        alert("Failed to upload file");
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl">
            {/* Header */}
            <div className="px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 sticky top-0 z-10 transition-all">
                {onBack && (
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full md:hidden">
                        <Icons.Back />
                    </button>
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${conversation.isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                    {conversation.isGroup ? <Icons.Group /> : getAvatarInitial(displayName)}
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white leading-tight">{displayName}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                        {isTypingMessage || conversation.subject || (conversation.isGroup ? `${conversation.participants.length} members` : 'Online')}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.senderId === currentUserId}
                        senderName={msg.sender?.name}
                        onReact={(emoji) => onReact(msg.id, emoji)}
                        onReply={setReplyingTo}
                        onEdit={(m) => setEditingId(m.id)}
                        onDelete={() => onDeleteMessage(msg.id)}
                        replyParent={msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined}
                    />
                ))}
                {typingUsers.length > 0 && (
                    <div className="ml-4 mb-4 text-xs text-gray-400 italic">Typing...</div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 flex gap-2 overflow-x-auto">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative bg-white p-2 rounded-md shadow-sm text-xs flex items-center gap-2">
                            <span>📎 {att.name}</span>
                            <button onClick={() => setAttachments(p => p.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-2">×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Reply/Edit Banner */}
            {(replyingTo || editingId) && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        {editingId ? <Icons.Edit /> : <Icons.Reply />}
                        <span className="truncate max-w-xs">
                            {editingId ? "Editing Message" : `Replying to ${replyingTo?.sender?.name || 'User'}`}
                        </span>
                    </div>
                    <button onClick={cancelAction} className="text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                {showRecorder ? (
                    <div className="max-w-4xl mx-auto">
                        <AudioRecorder onRecordingComplete={handleVoiceUpload} onCancel={() => setShowRecorder(false)} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-4xl mx-auto">
                        {!editingId && (
                            <>
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <Icons.Attach />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRecorder(true)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Icons.Mic />
                                </button>
                            </>
                        )}

                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder={editingId ? "Update your message..." : "Type a message..."}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                        <button
                            type="submit"
                            disabled={(!inputText.trim() && attachments.length === 0) || sending}
                            className={`p-3 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:scale-100 ${editingId ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 active:scale-95'}`}
                        >
                            {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingId ? <Icons.Check /> : <Icons.Send />)}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
