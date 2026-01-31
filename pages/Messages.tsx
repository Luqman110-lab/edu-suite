import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/use-auth';

// --- Interfaces ---
interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
  sender?: User;
}

interface Conversation {
  id: number;
  subject: string;
  type: string;
  createdById: number;
  lastMessageAt: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

// --- Icons (embedded for simplicity) ---
const Icons = {
  Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Compose: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Back: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Empty: () => (
    <svg className="w-24 h-24 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

// --- Helper Functions ---
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
  const others = conv.participants.filter(p => p.id !== currentUserId);
  return others.length > 0 ? others.map(p => p.name).join(', ') : 'Just You';
};

const getAvatarInitial = (name: string) => name.charAt(0).toUpperCase();

// --- Components ---

const SidebarItem = ({
  conv,
  isActive,
  currentUserId
}: {
  conv: Conversation;
  isActive: boolean;
  currentUserId: number | null
}) => {
  const displayName = getDisplayName(conv, currentUserId);
  const initial = getAvatarInitial(displayName);

  return (
    <Link to={`/app/messages/${conv.id}`}>
      <motion.div
        initial={false}
        animate={{ backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
        className={`p-3 mx-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex gap-3 items-center ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      >
        <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
          {initial}
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
            {conv.lastMessage ? (
              <>
                {conv.lastMessage.senderId === currentUserId && <span className="opacity-70">You: </span>}
                {conv.lastMessage.content}
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

const MessagingSidebar = ({
  conversations,
  activeId,
  onNewMessage,
  searchTerm,
  setSearchTerm,
  currentUserId
}: {
  conversations: Conversation[];
  activeId?: number;
  onNewMessage: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUserId: number | null;
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
          <Icons.Search />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400 text-sm">
            No conversations found
          </div>
        ) : (
          filtered.map(conv => (
            <SidebarItem
              key={conv.id}
              conv={conv}
              isActive={activeId === conv.id}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ChatBubble = ({ msg, isOwn, senderName }: { msg: Message; isOwn: boolean; senderName?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-gray-400 ml-3 mb-1">{senderName}</span>
        )}
        <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm relative leading-relaxed ${isOwn
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'
          }`}>
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 mt-1 opacity-70 px-1">
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </motion.div>
  );
};

const ChatArea = ({
  conversation,
  messages,
  currentUserId,
  onSend,
  onBack,
  sending
}: {
  conversation: Conversation;
  messages: Message[];
  currentUserId: number | null;
  onSend: (text: string) => void;
  onBack?: () => void;
  sending: boolean;
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    onSend(inputText);
    setInputText('');
  };

  const displayName = getDisplayName(conversation, currentUserId);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full md:hidden">
            <Icons.Back />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
          {getAvatarInitial(displayName)}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white leading-tight">{displayName}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{conversation.subject}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.senderId === currentUserId}
            senderName={msg.sender?.name}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.Send />}
          </button>
        </form>
      </div>
    </div>
  );
};

const NewMessageModal = ({
  isOpen,
  onClose,
  onSend
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: any) => Promise<void>;
}) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
    if (!subject || !message || selectedIds.length === 0) return;
    setLoading(true);
    await onSend({ subject, participantIds: selectedIds, initialMessage: message });
    setLoading(false);
    onClose();
    setSubject('');
    setMessage('');
    setSelectedIds([]);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What's this about?"
            />
          </div>

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
              disabled={loading || !subject || !message || selectedIds.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main Layout Component ---

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

  // Poll for updates
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Poll list every 10s
    return () => clearInterval(interval);
  }, []);

  // Poll messages if active
  useEffect(() => {
    if (id) {
      fetchMessages(parseInt(id));
      fetchConversationDetails(parseInt(id));
      const interval = setInterval(() => fetchMessages(parseInt(id)), 5000); // Poll chat every 5s
      return () => clearInterval(interval);
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
        // Mark as read if we have unread messages
        // Optimization: check local state before api call? For now just call it.
        await fetch(`/api/conversations/${convId}/read`, { method: 'POST' });
        // Update list locally to clear badge instantly
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
      }
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (text: string) => {
    if (!id) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        const msg = await res.json();
        setActiveMessages(prev => [...prev, msg]);
        fetchConversations(); // Update side list preview
      }
    } catch (e) { console.error(e); }
    setIsSending(false);
  };

  const handleCreateConversation = async (data: any) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'direct' })
      });
      if (res.ok) {
        const conv = await res.json();
        fetchConversations();
        navigate(`/app/messages/${conv.id}`);
      }
    } catch (e) { console.error(e); }
  };

  const isMobile = window.innerWidth < 768; // Simple check, could use hook
  // Decide what to show based on Route and Screen size
  const showSidebar = !id || !isMobile;
  const showChat = !!id;

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-full md:w-80 lg:w-96 flex-shrink-0' : 'hidden md:block md:w-80 lg:w-96'} h-full`}>
        <MessagingSidebar
          conversations={conversations}
          activeId={id ? parseInt(id) : undefined}
          onNewMessage={() => setShowModal(true)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          currentUserId={user?.id || null}
        />
      </div>

      {/* Main Content */}
      <div className={`${showChat ? 'w-full md:flex-1' : 'hidden md:flex md:flex-1'} h-full bg-gray-50/50 dark:bg-black/20`}>
        {id && activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={activeMessages}
            currentUserId={user?.id || null}
            onSend={handleSendMessage}
            sending={isSending}
            onBack={() => navigate('/app/messages')}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-pulse">
            <Icons.Empty />
            <h3 className="text-xl font-semibold mt-4 text-gray-600 dark:text-gray-300">Select a conversation</h3>
            <p className="max-w-xs mt-2 text-sm text-gray-400">Choose a chat from the left or start a new one to begin messaging.</p>
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

// --- Exported Components to match Routes ---

export const Messages = () => {
  return <MessagingLayout />;
};

export const ConversationView = () => {
  return <MessagingLayout />;
};
