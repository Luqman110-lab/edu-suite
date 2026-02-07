import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Plus, X, ArrowLeft, Users, Search } from "lucide-react";

export default function ParentMessages() {
    const queryClient = useQueryClient();
    const [activeConversation, setActiveConversation] = useState<number | null>(null);
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [newRecipient, setNewRecipient] = useState<number | null>(null);
    const [newFirstMessage, setNewFirstMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await fetch('/api/user', { credentials: 'include' });
            return res.json();
        }
    });

    const { data: convData, isLoading } = useQuery({
        queryKey: ['parent-conversations'],
        queryFn: async () => {
            const res = await fetch('/api/parent/conversations', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    const { data: threadData, isLoading: loadingThread } = useQuery({
        queryKey: ['parent-conversation-messages', activeConversation],
        queryFn: async () => {
            const res = await fetch(`/api/parent/conversations/${activeConversation}/messages`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!activeConversation,
        refetchInterval: 10000,
    });

    const { data: recipientsData } = useQuery({
        queryKey: ['parent-messaging-recipients'],
        queryFn: async () => {
            const res = await fetch('/api/parent/messaging-recipients', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: showNewMessage
    });

    const sendMutation = useMutation({
        mutationFn: async (data: { conversationId: number; content: string }) => {
            const res = await fetch(`/api/parent/conversations/${data.conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: data.content })
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-conversation-messages', activeConversation] });
            queryClient.invalidateQueries({ queryKey: ['parent-conversations'] });
            setNewMessage('');
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: { recipientId: number; subject: string; message: string }) => {
            const res = await fetch('/api/parent/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['parent-conversations'] });
            setShowNewMessage(false);
            setNewSubject('');
            setNewRecipient(null);
            setNewFirstMessage('');
            if (data?.conversation?.id) {
                setActiveConversation(data.conversation.id);
            }
        }
    });

    // Mark as read when opening conversation
    useEffect(() => {
        if (activeConversation) {
            fetch(`/api/parent/conversations/${activeConversation}/read`, {
                method: 'POST',
                credentials: 'include'
            });
        }
    }, [activeConversation]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [threadData?.messages]);

    const conversations = convData?.conversations || [];
    const recipients = recipientsData?.recipients || [];

    const handleSend = () => {
        if (!newMessage.trim() || !activeConversation) return;
        sendMutation.mutate({ conversationId: activeConversation, content: newMessage.trim() });
    };

    const handleCreate = () => {
        if (!newRecipient || !newSubject.trim() || !newFirstMessage.trim()) return;
        createMutation.mutate({
            recipientId: newRecipient,
            subject: newSubject.trim(),
            message: newFirstMessage.trim()
        });
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading messages...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    <p className="text-gray-500">Communicate with school staff.</p>
                </div>
                <button
                    onClick={() => setShowNewMessage(true)}
                    className="bg-[#0052CC] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Message
                </button>
            </div>

            {/* New Message Modal */}
            {showNewMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">New Message</h3>
                            <button onClick={() => setShowNewMessage(false)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <select
                                    value={newRecipient || ''}
                                    onChange={(e) => setNewRecipient(Number(e.target.value))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select a staff member...</option>
                                    {recipients.map((r: any) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} ({r.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    placeholder="Message subject..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    value={newFirstMessage}
                                    onChange={(e) => setNewFirstMessage(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
                                    placeholder="Write your message..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => setShowNewMessage(false)}
                                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newRecipient || !newSubject.trim() || !newFirstMessage.trim() || createMutation.isPending}
                                className="px-4 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {createMutation.isPending ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ minHeight: '500px' }}>
                <div className="flex h-[600px]">
                    {/* Conversation List */}
                    <div className={`w-full md:w-1/3 border-r flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-3 border-b">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Conversations</p>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {conversations.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>No conversations yet.</p>
                                    <p className="text-xs mt-1">Start a new message to begin.</p>
                                </div>
                            ) : (
                                conversations.map((conv: any) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => setActiveConversation(conv.id)}
                                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${activeConversation === conv.id ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                                                {conv.participants?.find((p: any) => p.userId !== user?.id)?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{conv.subject}</p>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {conv.lastMessage ? conv.lastMessage.content.substring(0, 50) : 'No messages'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {conv.lastMessage?.createdAt
                                                        ? new Date(conv.lastMessage.createdAt).toLocaleDateString()
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Thread View */}
                    <div className={`flex-1 flex flex-col ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
                        {activeConversation ? (
                            <>
                                <div className="p-4 border-b flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveConversation(null)}
                                        className="md:hidden p-1"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <p className="font-bold text-gray-900">{threadData?.conversation?.subject || 'Loading...'}</p>
                                        <p className="text-xs text-gray-500">
                                            {threadData?.messages?.length || 0} messages
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {loadingThread ? (
                                        <div className="text-center text-gray-500 text-sm py-8">Loading messages...</div>
                                    ) : (
                                        (threadData?.messages || []).map((msg: any) => {
                                            const isMe = msg.senderId === user?.id;
                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMe
                                                        ? 'bg-[#0052CC] text-white'
                                                        : 'bg-gray-100 text-gray-900'
                                                        }`}>
                                                        {!isMe && (
                                                            <p className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</p>
                                                        )}
                                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 border-t">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                            placeholder="Type a message..."
                                            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!newMessage.trim() || sendMutation.isPending}
                                            className="bg-[#0052CC] text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3" />
                                    <p className="text-sm">Select a conversation to view messages</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
