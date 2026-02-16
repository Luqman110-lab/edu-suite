/// <reference types="vite/client" />
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/use-auth';
import { AudioRecorder } from '../components/AudioRecorder';

// --- Interfaces ---
interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
  lastReadMessageId?: number;
}

interface Attachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

interface Reaction {
  userId: number;
  emoji: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
  sender?: User;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyToId?: number;
  isDeleted?: boolean;
  isEdited?: boolean;
  readByAll?: boolean; // Virtual property
}

interface Conversation {
  id: number;
  subject: string;
  type: string;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdById: number;
  lastMessageAt: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

// --- Icons ---
const Icons = {
  Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Compose: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Back: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Attach: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
  Group: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  More: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>,
  Reply: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Mic: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
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
  if (conv.isGroup && conv.groupName) return conv.groupName;
  const others = conv.participants.filter(p => p.id !== currentUserId);
  return others.length > 0 ? others.map(p => p.name).join(', ') : 'Just You';
};

const getAvatarInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

// --- Components ---

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

const MessagingSidebar = ({
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
          <Icons.Search />
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

// --- Updated ChatBubble with Actions ---
const ChatBubble = ({
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

const ChatArea = ({
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
          <ChatBubble
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

// ... NewMessageModal (Unchanged) ...
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
