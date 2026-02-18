import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql, inArray, isNull, or, gt } from "drizzle-orm";
import {
    conversations, conversationParticipants, messages, users, userSchools
} from "../../shared/schema";
import { requireAuth, getActiveSchoolId } from "../auth";
import { broadcastMessage } from "../websocket";
import fs from "fs";
import path from "path";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const conversationRoutes = Router();

// POST /api/upload - File upload endpoint
conversationRoutes.post("/upload", requireAuth, async (req, res) => {
    try {
        const { fileName, fileData } = req.body; // fileData is base64
        if (!fileName || !fileData) return res.status(400).json({ message: "File required" });

        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const uniqueName = `${Date.now()}-${fileName}`;
        const filePath = path.join(uploadsDir, uniqueName);

        // Remove header (data:image/png;base64,)
        const base64Data = fileData.split(';base64,').pop();
        fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });

        res.json({ url: `/uploads/${uniqueName}` });
    } catch (error: any) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
});

// GET /api/conversations/unread-count
conversationRoutes.get("/conversations/unread-count", requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.sendStatus(401);

        const result = await db.select({ count: sql<number>`count(*)` })
            .from(conversationParticipants)
            .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
            .where(and(
                eq(conversationParticipants.userId, req.user.id),
                eq(conversationParticipants.isArchived, false),
                or(
                    sql`${conversations.lastMessageAt} > ${conversationParticipants.lastReadAt}`,
                    isNull(conversationParticipants.lastReadAt)
                )
            ));

        res.json({ unreadCount: Number(result[0]?.count || 0) });
    } catch (error: any) {
        console.error("Unread count error:", error);
        res.status(500).json({ message: "Failed to count unread messages" });
    }
});

// GET /api/messaging/users - List users for messaging (in same school)
conversationRoutes.get("/messaging/users", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school" });

        const usersInSchool = await db.select({
            id: users.id,
            name: users.name,
            role: users.role,
            email: users.email
        })
            .from(userSchools)
            .innerJoin(users, eq(userSchools.userId, users.id))
            .where(eq(userSchools.schoolId, schoolId));

        // Filter out current user
        const filtered = usersInSchool.filter(u => u.id !== req.user!.id);
        res.json(filtered);
    } catch (error: any) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// GET /api/conversations - Get all conversations for current user
conversationRoutes.get("/conversations", requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.sendStatus(401);

        const myConvos = await db.select().from(conversationParticipants)
            .where(eq(conversationParticipants.userId, req.user.id));

        const conversationIds = myConvos.map(c => c.conversationId);
        if (conversationIds.length === 0) return res.json([]);

        const convos = await db.select().from(conversations)
            .where(inArray(conversations.id, conversationIds))
            .orderBy(desc(conversations.lastMessageAt));

        const results = await Promise.all(convos.map(async (conv) => {
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

        res.json(results);
    } catch (error: any) {
        console.error("Fetch conversations error:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// POST /api/conversations - Create new conversation
conversationRoutes.post("/conversations", requireAuth, async (req, res) => {
    try {
        const { subject, participantIds, initialMessage, type, isGroup, groupName, groupAvatar } = req.body;
        const schoolId = getActiveSchoolId(req);

        if (!schoolId) return res.status(400).json({ message: "No active school" });
        if (!participantIds) return res.status(400).json({ message: "Missing participants" });

        const senderId = req.user!.id;

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

        res.status(201).json(newConv);
    } catch (error: any) {
        console.error("Create conversation error:", error);
        res.status(500).json({ message: "Failed to create conversation" });
    }
});

// GET /api/conversations/:id - Get single conversation
conversationRoutes.get("/conversations/:id", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

        if (access.length === 0) return res.status(403).json({ message: "Access denied" });

        const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

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

        res.json({ ...conv, participants });
    } catch (error: any) {
        console.error("Get conversation error:", error);
        res.status(500).json({ message: "Failed to fetch conversation" });
    }
});

// PUT /api/conversations/:id - Update group info
conversationRoutes.put("/conversations/:id", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const { groupName, groupAvatar, addParticipants } = req.body;

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

        res.json({ success: true });
    } catch (error: any) {
        console.error("Update group error:", error);
        res.status(500).json({ message: "Failed to update group" });
    }
});

// GET /api/conversations/:id/messages - Get messages for conversation
conversationRoutes.get("/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

        if (access.length === 0) return res.status(403).json({ message: "Access denied" });

        const msgs = await db.select({
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

        res.json(msgs);
    } catch (error: any) {
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// POST /api/conversations/:id/messages - Send message
conversationRoutes.post("/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });
        const { content, attachments, replyToId } = req.body;

        if (!content && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message content or attachment required" });
        }

        const access = await db.select().from(conversationParticipants)
            .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, req.user!.id)));

        if (access.length === 0) return res.status(403).json({ message: "Access denied" });

        const [newMsg] = await db.insert(messages).values({
            conversationId: convId,
            senderId: req.user!.id,
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
        }).from(users).where(eq(users.id, req.user!.id));

        res.json({ ...newMsg, sender: sender[0] });

        // WebSocket broadcast
        broadcastMessage(convId, { ...newMsg, sender: sender[0] });
    } catch (error: any) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
});

// POST /api/conversations/:id/messages/:msgId/react - Toggle reaction
conversationRoutes.post("/conversations/:id/messages/:msgId/react", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));
        const { emoji } = req.body;

        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) return res.status(404).json({ message: "Message not found" });

        let reactions = (msg.reactions as any[]) || [];
        const userId = req.user!.id;

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
        res.json(updated);
    } catch (error: any) {
        console.error("Reaction error:", error);
        res.status(500).json({ message: "Reaction failed" });
    }
});

// DELETE /api/conversations/:id/messages/:msgId - Delete message (soft)
conversationRoutes.delete("/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));
        const userId = req.user!.id;

        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) return res.status(404).json({ message: "Message not found" });

        if (msg.senderId !== userId) {
            return res.status(403).json({ message: "Cannot delete others' messages" });
        }

        const [updated] = await db.update(messages)
            .set({ isDeleted: true, content: 'This message was deleted', deletedAt: new Date() })
            .where(eq(messages.id, msgId))
            .returning();

        broadcastMessage(convId, { ...updated, type: 'message_update' });
        res.json({ success: true, messageId: msgId });
    } catch (error: any) {
        console.error("Delete message error:", error);
        res.status(500).json({ message: "Failed to delete message" });
    }
});

// PUT /api/conversations/:id/messages/:msgId - Edit message
conversationRoutes.put("/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));
        const userId = req.user!.id;
        const { content } = req.body;

        if (!content) return res.status(400).json({ message: "Content required" });

        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (!msg) return res.status(404).json({ message: "Message not found" });

        if (msg.senderId !== userId) {
            return res.status(403).json({ message: "Cannot edit others' messages" });
        }

        const [updated] = await db.update(messages)
            .set({ content, isEdited: true, editedAt: new Date() })
            .where(eq(messages.id, msgId))
            .returning();

        broadcastMessage(convId, { ...updated, type: 'message_update' });
        res.json(updated);
    } catch (error: any) {
        console.error("Edit message error:", error);
        res.status(500).json({ message: "Failed to edit message" });
    }
});

// POST /api/conversations/:id/read - Mark as read
conversationRoutes.post("/conversations/:id/read", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        await db.update(conversationParticipants)
            .set({ lastReadAt: new Date() })
            .where(and(
                eq(conversationParticipants.conversationId, convId),
                eq(conversationParticipants.userId, req.user!.id)
            ));

        res.json({ success: true });
    } catch (error: any) {
        console.error("Read mark error:", error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
});
