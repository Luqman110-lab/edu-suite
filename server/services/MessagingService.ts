import { db } from "../db";
import { eq, and, desc, sql, inArray, isNull, or, gt } from "drizzle-orm";
import {
    conversations, conversationParticipants, messages, users, userSchools
} from "../../shared/schema";
import { broadcastMessage } from "../websocket";
import fs from "fs";
import path from "path";

export class MessagingService {

    async uploadFile(fileName: string, fileData: string) {
        if (!fileName || !fileData) throw new Error("File required");

        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const uniqueName = `${Date.now()}-${fileName}`;
        const filePath = path.join(uploadsDir, uniqueName);

        // Remove header (data:image/png;base64,)
        const base64Data = fileData.split(';base64,').pop();
        if (!base64Data) throw new Error("Invalid file data");

        fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });

        return { url: `/uploads/${uniqueName}` };
    }

    async getUnreadCount(userId: number) {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(conversationParticipants)
            .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
            .where(and(
                eq(conversationParticipants.userId, userId),
                eq(conversationParticipants.isArchived, false),
                or(
                    sql`${conversations.lastMessageAt} > ${conversationParticipants.lastReadAt}`,
                    isNull(conversationParticipants.lastReadAt)
                )
            ));
        return Number(result[0]?.count || 0);
    }

    async getMessagingUsers(schoolId: number, currentUserId: number) {
        const usersInSchool = await db.select({
            id: users.id,
            name: users.name,
            role: users.role,
            email: users.email
        })
            .from(userSchools)
            .innerJoin(users, eq(userSchools.userId, users.id))
            .where(eq(userSchools.schoolId, schoolId));

        return usersInSchool.filter(u => u.id !== currentUserId);
    }

    async getConversations(userId: number) {
        const myConvos = await db.select().from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId));

        const conversationIds = myConvos.map(c => c.conversationId);
        if (conversationIds.length === 0) return [];

        const convos = await db.select().from(conversations)
            .where(inArray(conversations.id, conversationIds))
            .orderBy(desc(conversations.lastMessageAt));

        return await Promise.all(convos.map(async (conv) => {
            const parts = await db.select({
                id: users.id,
                name: users.name,
                role: users.role
            })
                .from(conversationParticipants)
                .innerJoin(users, eq(conversationParticipants.userId, users.id))
                .where(eq(conversationParticipants.conversationId, conv.id));

            const lastMsg = await db.select().from(messages)
                .where(eq(messages.conversationId, conv.id))
                .orderBy(desc(messages.createdAt))
                .limit(1);

            const myPart = myConvos.find(c => c.conversationId === conv.id);
            let unreadCount = 0;
            if (myPart) {
                const unread = await db.select({ count: sql<number>`count(*)` })
                    .from(messages)
                    .where(and(
                        eq(messages.conversationId, conv.id),
                        myPart.lastReadAt ? gt(messages.createdAt, myPart.lastReadAt) : sql`1=1`
                    ));
                unreadCount = Number(unread[0]?.count || 0);
            }

            return {
                ...conv,
                participants: parts,
                lastMessage: lastMsg[0] || null,
                unreadCount
            };
        }));
    }

    async createConversation(schoolId: number, senderId: number, data: any) {
        const { subject, participantIds, initialMessage, type, isGroup, groupName, groupAvatar } = data;

        if (!participantIds) throw new Error("Missing participants");

        const [newConv] = await db.insert(conversations).values({
            schoolId,
            subject: subject || (groupName ? groupName : 'New Conversation'),
            type: type || (isGroup ? 'group' : 'direct'),
            isGroup: isGroup || false,
            groupName,
            groupAvatar,
            admins: isGroup ? [senderId] : [],
            createdById: senderId,
            lastMessageAt: new Date()
        }).returning();

        const allParticipants = [...new Set([senderId, ...participantIds])];
        await db.insert(conversationParticipants).values(
            allParticipants.map((uid: number) => ({
                conversationId: newConv.id,
                userId: uid,
                joinedAt: new Date(),
                lastReadAt: uid === senderId ? new Date() : null
            }))
        );

        await db.insert(messages).values({
            conversationId: newConv.id,
            senderId,
            content: initialMessage,
            createdAt: new Date()
        });

        return newConv;
    }

    async getConversation(convId: number, userId: number) {
        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)));

        if (access.length === 0) throw new Error("Access denied");

        const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
        if (!conv) throw new Error("Conversation not found");

        const participants = await db.select({
            id: users.id,
            name: users.name,
            role: users.role,
            lastReadMessageId: conversationParticipants.lastReadMessageId,
            lastReadAt: conversationParticipants.lastReadAt
        })
            .from(conversationParticipants)
            .innerJoin(users, eq(conversationParticipants.userId, users.id))
            .where(eq(conversationParticipants.conversationId, convId));

        return { ...conv, participants };
    }

    async updateGroupInfo(convId: number, data: any) {
        const { groupName, groupAvatar, addParticipants } = data;

        const updates: any = {};
        if (groupName) updates.groupName = groupName;
        if (groupAvatar) updates.groupAvatar = groupAvatar;

        await db.update(conversations).set(updates).where(eq(conversations.id, convId));

        if (addParticipants && Array.isArray(addParticipants)) {
            const newParts = addParticipants.map((uid: number) => ({
                conversationId: convId,
                userId: uid,
                joinedAt: new Date()
            }));
            await db.insert(conversationParticipants).values(newParts).onConflictDoNothing();
        }
        return true;
    }

    async getMessages(convId: number, userId: number) {
        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)));

        if (access.length === 0) throw new Error("Access denied");

        return await db.select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            content: messages.content,
            messageType: messages.messageType,
            attachments: messages.attachments,
            reactions: messages.reactions,
            replyToId: messages.replyToId,
            isEdited: messages.isEdited,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
            sender: {
                id: users.id,
                name: users.name,
                role: users.role
            }
        })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.conversationId, convId))
            .orderBy(sql`${messages.createdAt} ASC`);
    }

    async sendMessage(convId: number, userId: number, data: any) {
        const { content, attachments, replyToId } = data;

        if (!content && (!attachments || attachments.length === 0)) {
            throw new Error("Message content or attachment required");
        }

        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)));

        if (access.length === 0) throw new Error("Access denied");

        const [newMsg] = await db.insert(messages).values({
            conversationId: convId,
            senderId: userId,
            content: content || "",
            attachments: attachments || [],
            replyToId,
            messageType: (attachments && attachments.length > 0) ? 'file' : 'text',
            createdAt: new Date()
        }).returning();

        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, convId));

        const sender = await db.select({
            id: users.id,
            name: users.name,
            role: users.role
        }).from(users).where(eq(users.id, userId));

        const msgWithSender = { ...newMsg, sender: sender[0] };
        broadcastMessage(convId, msgWithSender);
        return msgWithSender;
    }

    async reactToMessage(convId: number, msgId: number, userId: number, emoji: string) {
        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) throw new Error("Message not found");

        let reactions = (msg.reactions as any[]) || [];

        const existingIdx = reactions.findIndex((r: any) => r.userId === userId && r.emoji === emoji);
        if (existingIdx >= 0) {
            reactions.splice(existingIdx, 1);
        } else {
            reactions.push({ userId, emoji });
        }

        const [updated] = await db.update(messages)
            .set({ reactions })
            .where(eq(messages.id, msgId))
            .returning();

        broadcastMessage(convId, { ...updated, type: 'reaction_update' });
        return updated;
    }

    async deleteMessage(convId: number, msgId: number, userId: number) {
        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) throw new Error("Message not found");

        if (msg.senderId !== userId) {
            throw new Error("Cannot delete others' messages");
        }

        const [updated] = await db.update(messages)
            .set({ isDeleted: true, content: 'This message was deleted', deletedAt: new Date() })
            .where(eq(messages.id, msgId))
            .returning();

        broadcastMessage(convId, { ...updated, type: 'message_update' });
        return { success: true, messageId: msgId };
    }

    async editMessage(convId: number, msgId: number, userId: number, content: string) {
        if (!content) throw new Error("Content required");

        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) throw new Error("Message not found");

        if (msg.senderId !== userId) {
            throw new Error("Cannot edit others' messages");
        }

        const [updated] = await db.update(messages)
            .set({ content, isEdited: true, editedAt: new Date() })
            .where(eq(messages.id, msgId))
            .returning();

        broadcastMessage(convId, { ...updated, type: 'message_update' });
        return updated;
    }

    async markAsRead(convId: number, userId: number) {
        await db.update(conversationParticipants)
            .set({ lastReadAt: new Date() })
            .where(and(
                eq(conversationParticipants.conversationId, convId),
                eq(conversationParticipants.userId, userId)
            ));
        return true;
    }
}

export const messagingService = new MessagingService();
