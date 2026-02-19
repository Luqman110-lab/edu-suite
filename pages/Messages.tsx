import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { useMessaging } from '../client/src/hooks/useMessaging';
import { MessagingSidebar } from '../client/src/components/messaging/MessagingSidebar';
import { ChatArea } from '../client/src/components/messaging/ChatArea';
import { NewMessageModal } from '../client/src/components/messaging/NewMessageModal';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const MessagingLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    conversations,
    activeMessages,
    activeConversation,
    isSending,
    typingUsers,
    onlineUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    emitTyping,
    createConversation
  } = useMessaging({
    currentUserId: user?.id || null,
    activeConversationId: id ? parseInt(id) : undefined
  });

  // Request Notification Permission & Subscribe (Preserved from original)
  useEffect(() => {
    const registerPush = async () => {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          try {
            // 2. Register Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            console.log('Service Worker registered');

            // 3. Subscribe
            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
              console.warn("VITE_VAPID_PUBLIC_KEY not found");
              return;
            }

            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 4. Send to Backend
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            console.log('Push Subscribe success');

          } catch (err) {
            console.error('Push Subscribe error', err);
          }
        }
      }
    };
    registerPush();
  }, []);

  const handleCreateConversation = async (data: any) => {
    const conv = await createConversation(data);
    if (conv) {
      navigate(`/app/messages/${conv.id}`);
    }
  };

  const EmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-pulse">
      <svg className="w-24 h-24 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <h3 className="text-xl font-semibold mt-4 text-gray-600 dark:text-gray-300">Select a conversation</h3>
      <p className="max-w-xs mt-2 text-sm text-gray-400">Choose a chat from the left or start a new one.</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex">
      {/* Sidebar: - On mobile: show if NO chat selected (id undefined) - On desktop: always show */}
      <div className={`${id ? 'hidden md:block' : 'w-full'} md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-gray-200 dark:border-gray-700`}>
        <MessagingSidebar
          conversations={conversations}
          activeId={id ? parseInt(id) : undefined}
          onNewMessage={() => setShowModal(true)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          currentUserId={user?.id || null}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Chat Area: - On mobile: show if chat SELECTED (id defined) - On desktop: always show (flex-1) */}
      <div className={`${!id ? 'hidden md:flex' : 'w-full flex'} md:flex-1 h-full bg-gray-50/50 dark:bg-black/20 flex-col`}>
        {id && activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={activeMessages}
            currentUserId={user?.id || null}
            onSend={sendMessage}
            sending={isSending}
            onBack={() => navigate('/app/messages')}
            onReact={reactToMessage}
            onDeleteMessage={deleteMessage}
            onEditMessage={editMessage}
            onTyping={emitTyping}
            typingUsers={typingUsers}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      <NewMessageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSend={handleCreateConversation}
      />
    </div>
  );
};

export const Messages = () => {
  return <MessagingLayout />;
};

export const ConversationView = () => {
  return <MessagingLayout />;
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ------------------------------------

const MessagingLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Chat state
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // WebSocket
  const ws = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Vercel Migration: WebSockets are disabled
  const ENABLE_WEBSOCKETS = false;

  // Request Notification Permission
  // Request Notification Permission & Subscribe
  useEffect(() => {
    const registerPush = async () => {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          try {
            // 2. Register Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            console.log('Service Worker registered');

            // 3. Subscribe
            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
              console.warn("VITE_VAPID_PUBLIC_KEY not found");
              return;
            }

            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 4. Send to Backend
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            console.log('Push Subscribe success');

          } catch (err) {
            console.error('Push Subscribe error', err);
          }
        }
      }
    };
    registerPush();
  }, []);

  // Initialize WS
  useEffect(() => {
    if (!user || !ENABLE_WEBSOCKETS) return;

    // WS Logic preserved but disabled
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WS Connected');
        ws.current?.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (e) { console.error('WS Parse Error', e); }
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
  }, [user]);

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
        // Handle Edit/Delete updates
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

  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);


  // Poll list fallback 
  useEffect(() => {
    const fetchAll = () => {
      fetchConversations();
      if (id) fetchMessages(parseInt(id)); // Poll active messages too to sync deleted/edited
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Fetch Chat Details
  useEffect(() => {
    if (id) {
      fetchMessages(parseInt(id));
      fetchConversationDetails(parseInt(id));
    } else {
      setActiveMessages([]);
      setActiveConversation(null);
    }
  }, [id]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) setConversations(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchConversationDetails = async (convId: number) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) setActiveConversation(await res.json());
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (text: string, attachments?: Attachment[], replyToId?: number) => {
    if (!id) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
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
    } catch (e) { console.error(e); }
    setIsSending(false);
  };

  const handleEditMessage = async (msgId: number, newContent: string) => {
    if (!id) return;
    try {
      await fetch(`/api/conversations/${id}/messages/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
    } catch (e) { console.error(e); }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await fetch(`/api/conversations/${id}/messages/${msgId}`, {
        method: 'DELETE'
      });
    } catch (e) { console.error(e); }
  };

  const handleReaction = async (msgId: number, emoji: string) => {
    if (!id) return;
    try {
      await fetch(`/api/conversations/${id}/messages/${msgId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
    } catch (e) { console.error(e); }
  };

  // Emit typing event
  const handleTyping = () => {
    if (!ws.current || !activeConversation || !user) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Emit start typing if not already sending rapidly
    ws.current.send(JSON.stringify({
      type: 'typing',
      conversationId: activeConversation.id,
      isTyping: true
    }));

    // Stop typing after delay
    typingTimeoutRef.current = window.setTimeout(() => {
      ws.current?.send(JSON.stringify({
        type: 'typing',
        conversationId: activeConversation.id,
        isTyping: false
      }));
    }, 2000);
  };

  const handleCreateConversation = async (data: any) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data })
      });
      if (res.ok) {
        const conv = await res.json();
        fetchConversations();
        navigate(`/app/messages/${conv.id}`);
      }
    } catch (e) { console.error(e); }
  };

  // Enhance messages with read status
  const messagesWithReadStatus = activeMessages.map(m => {
    if (!activeConversation) return m;
    const others = activeConversation.participants.filter(p => p.id !== user?.id);
    const readByAll = others.length > 0 && others.every(p => (p.lastReadMessageId || 0) >= m.id);
    return { ...m, readByAll };
  });

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex">
      {/* Sidebar: - On mobile: show if NO chat selected (id undefined) - On desktop: always show */}
      <div className={`${id ? 'hidden md:block' : 'w-full'} md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-gray-200 dark:border-gray-700`}>
        <MessagingSidebar
          conversations={conversations}
          activeId={id ? parseInt(id) : undefined}
          onNewMessage={() => setShowModal(true)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          currentUserId={user?.id || null}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Chat Area: - On mobile: show if chat SELECTED (id defined) - On desktop: always show (flex-1) */}
      <div className={`${!id ? 'hidden md:flex' : 'w-full flex'} md:flex-1 h-full bg-gray-50/50 dark:bg-black/20 flex-col`}>
        {id && activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={messagesWithReadStatus}
            currentUserId={user?.id || null}
            onSend={handleSendMessage}
            sending={isSending}
            onBack={() => navigate('/app/messages')}
            onReact={handleReaction}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onTyping={handleTyping}
            typingUsers={typingUsers}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-pulse">
            <Icons.Empty />
            <h3 className="text-xl font-semibold mt-4 text-gray-600 dark:text-gray-300">Select a conversation</h3>
            <p className="max-w-xs mt-2 text-sm text-gray-400">Choose a chat from the left or start a new one.</p>
          </div>
        )}
      </div>

      <NewMessageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSend={handleCreateConversation}
      />
    </div>
  );
};

export const Messages = () => {
  return <MessagingLayout />;
};

export const ConversationView = () => {
  return <MessagingLayout />;
};
