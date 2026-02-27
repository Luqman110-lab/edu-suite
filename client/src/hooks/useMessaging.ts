import { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation, Message, Attachment, User } from '../types/messaging';

interface UseMessagingProps {
    currentUserId: number | null;
    activeConversationId?: number;
}

export interface NewMessageNotification {
    conversationId: number;
    senderName: string;
    preview: string;
    timestamp: number;
}

export function useMessaging({ currentUserId, activeConversationId }: UseMessagingProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<number[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [notification, setNotification] = useState<NewMessageNotification | null>(null);

    // WebSocket ref
    const ws = useRef<WebSocket | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    // Track unread counts to detect new messages during polling
    const prevUnreadMapRef = useRef<Record<number, number>>({});
    const prevConversationsRef = useRef<Conversation[]>([]);

    // Vercel Migration: WebSockets are disabled
    const ENABLE_WEBSOCKETS = false;

    // Play a subtle notification sound
    const playNotificationSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { /* audio not supported — silent fallback */ }
    }, []);

    // Detect new messages by comparing unread counts between polls
    const checkForNewMessages = useCallback((newConversations: Conversation[]) => {
        if (!currentUserId) return;
        const prevMap = prevUnreadMapRef.current;

        for (const conv of newConversations) {
            const prevCount = prevMap[conv.id] || 0;
            const newCount = conv.unreadCount || 0;

            // New unread messages appeared in a conversation we're NOT viewing
            if (newCount > prevCount && conv.id !== activeConversationId) {
                const displayName = conv.isGroup && conv.groupName
                    ? conv.groupName
                    : conv.participants.filter(p => p.id !== currentUserId).map(p => p.name).join(', ') || 'Someone';

                const preview = conv.lastMessage?.isDeleted ? 'Message deleted'
                    : conv.lastMessage?.content || 'New message';

                setNotification({
                    conversationId: conv.id,
                    senderName: displayName,
                    preview: preview.length > 60 ? preview.slice(0, 60) + '…' : preview,
                    timestamp: Date.now(),
                });
                playNotificationSound();
                // Auto-dismiss after 5 seconds
                setTimeout(() => setNotification(prev => prev?.timestamp === Date.now() ? null : prev), 5000);
                break; // Only one notification at a time
            }
        }

        // Update map
        const nextMap: Record<number, number> = {};
        for (const c of newConversations) nextMap[c.id] = c.unreadCount || 0;
        prevUnreadMapRef.current = nextMap;
        prevConversationsRef.current = newConversations;
    }, [currentUserId, activeConversationId, playNotificationSound]);

    const dismissNotification = useCallback(() => setNotification(null), []);

    // Poll list fallback 
    useEffect(() => {
        const fetchAll = () => {
            fetchConversations();
            if (activeConversationId) fetchMessages(activeConversationId); // Poll active messages too to sync deleted/edited
        };
        fetchAll();
        const interval = setInterval(fetchAll, 5000);
        return () => clearInterval(interval);
    }, [activeConversationId]);

    // Fetch Chat Details
    useEffect(() => {
        if (activeConversationId) {
            fetchMessages(activeConversationId);
            fetchConversationDetails(activeConversationId);
        } else {
            setActiveMessages([]);
            setActiveConversation(null);
        }
    }, [activeConversationId]);

    // Initialize WS
    useEffect(() => {
        if (!currentUserId || !ENABLE_WEBSOCKETS) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws`;

        try {
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WS Connected');
                ws.current?.send(JSON.stringify({ type: 'auth', userId: currentUserId }));
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWsMessage(data);
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            ws.current.onerror = (e) => {
                console.warn('WS Connection Error (Expected on Vercel):', e);
            };

        } catch (e) {
            console.warn("WebSocket initialization failed:", e);
        }

        return () => {
            ws.current?.close();
        };
    }, [currentUserId, ENABLE_WEBSOCKETS]);

    const activeConversationRef = useRef<Conversation | null>(null);
    useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

    const handleWsMessage = useCallback((data: any) => {
        switch (data.type) {
            case 'new_message':
                if (activeConversationRef.current?.id === data.conversationId) {
                    setActiveMessages(prev => [...prev, data.message]);
                } else {
                    if (document.hidden || activeConversationRef.current?.id !== data.conversationId) {
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(`New message from ${data.message.sender?.name || 'User'}`, {
                                body: data.message.content,
                                icon: '/favicon.ico'
                            });
                        }
                    }
                }
                fetchConversations();
                break;
            case 'message_update':
                if (activeConversationRef.current?.id === data.conversationId) {
                    setActiveMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
                }
                fetchConversations();
                break;
            case 'reaction_update':
                if (activeConversationRef.current?.id === data.conversationId) {
                    setActiveMessages(prev => prev.map(m => m.id === data.id ? { ...m, reactions: data.reactions } : m));
                }
                break;
            case 'typing':
                if (activeConversationRef.current?.id === data.conversationId) {
                    if (data.isTyping) {
                        setTypingUsers(prev => Array.from(new Set([...prev.filter(id => id !== data.userId), data.userId])));
                    } else {
                        setTypingUsers(prev => prev.filter(id => id !== data.userId));
                    }
                }
                break;
            case 'presence':
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    if (data.isOnline) next.add(data.userId);
                    else next.delete(data.userId);
                    return next;
                });
                break;
            case 'read_receipt':
                if (activeConversationRef.current?.id === data.conversationId) {
                    fetchConversationDetails(data.conversationId);
                }
                break;
            case 'online_users':
                setOnlineUsers(new Set(data.userIds));
                break;
        }
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                const data = await res.json();
                checkForNewMessages(data);
                setConversations(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchConversationDetails = async (convId: number) => {
        try {
            const res = await fetch(`/api/conversations/${convId}`);
            if (res.ok) setActiveConversation(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMessages = async (convId: number) => {
        try {
            const res = await fetch(`/api/conversations/${convId}/messages`);
            if (res.ok) {
                const msgs = await res.json();
                setActiveMessages(msgs);
                await fetch(`/api/conversations/${convId}/read`, { method: 'POST' });
                setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const sendMessage = async (text: string, attachments?: Attachment[], replyToId?: number) => {
        if (!activeConversationId) return;
        setIsSending(true);
        try {
            const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, attachments, replyToId })
            });
            if (res.ok) {
                const msg = await res.json();
                setActiveMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                fetchConversations();
            }
        } catch (e) {
            console.error(e);
        }
        setIsSending(false);
    };

    const editMessage = async (msgId: number, newContent: string) => {
        if (!activeConversationId) return;
        try {
            await fetch(`/api/conversations/${activeConversationId}/messages/${msgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent })
            });
            // Optimistic update handled by poll/ws usually, but we can do it here too if desired
            setActiveMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent, isEdited: true } : m));
        } catch (e) {
            console.error(e);
        }
    };

    const deleteMessage = async (msgId: number) => {
        if (!activeConversationId) return;
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await fetch(`/api/conversations/${activeConversationId}/messages/${msgId}`, {
                method: 'DELETE'
            });
            setActiveMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
        } catch (e) {
            console.error(e);
        }
    };

    const reactToMessage = async (msgId: number, emoji: string) => {
        if (!activeConversationId) return;
        try {
            await fetch(`/api/conversations/${activeConversationId}/messages/${msgId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji })
            });
            // Optimistic update could be complex due to array of reactions, let poll handle it
        } catch (e) {
            console.error(e);
        }
    };

    const emitTyping = () => {
        if (!ws.current || !activeConversation || !currentUserId) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        ws.current.send(JSON.stringify({
            type: 'typing',
            conversationId: activeConversation.id,
            isTyping: true
        }));

        typingTimeoutRef.current = window.setTimeout(() => {
            ws.current?.send(JSON.stringify({
                type: 'typing',
                conversationId: activeConversation.id,
                isTyping: false
            }));
        }, 2000);
    };

    const createConversation = async (data: any) => {
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data })
            });
            if (res.ok) {
                const conv = await res.json();
                fetchConversations();
                return conv;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    };

    // Enhance messages with read status
    const messagesWithReadStatus = activeMessages.map(m => {
        if (!activeConversation) return m;
        const others = activeConversation.participants.filter(p => p.id !== currentUserId);
        const readByAll = others.length > 0 && others.every(p => (p.lastReadMessageId || 0) >= m.id);
        return { ...m, readByAll };
    });

    return {
        conversations,
        activeMessages: messagesWithReadStatus,
        activeConversation,
        isSending,
        typingUsers,
        onlineUsers,
        notification,
        dismissNotification,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        emitTyping,
        createConversation,
        fetchConversations
    };
}
