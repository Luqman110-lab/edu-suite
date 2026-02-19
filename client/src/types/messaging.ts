export interface User {
    id: number;
    name: string;
    role: string;
    email?: string;
    lastReadMessageId?: number;
}

export interface Attachment {
    url: string;
    name: string;
    type: string;
    size?: number;
}

export interface Reaction {
    userId: number;
    emoji: string;
}

export interface Message {
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

export interface Conversation {
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
