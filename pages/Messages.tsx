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
    notification,
    dismissNotification,
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
    <div className="relative h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex">
      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
          <div
            className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 min-w-[280px] max-w-md cursor-pointer hover:shadow-2xl transition-shadow"
            onClick={() => { dismissNotification(); navigate(`/app/messages/${notification.conversationId}`); }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {notification.senderName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{notification.senderName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.preview}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissNotification(); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
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

      {/* Chat Area */}
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

