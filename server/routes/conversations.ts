import { Router, Request } from "express";
import { messagingService } from "../services/MessagingService";
import { requireAuth, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const conversationRoutes = Router();

// POST /api/upload - File upload endpoint
conversationRoutes.post("/upload", requireAuth, async (req, res) => {
    try {
        const { fileName, fileData } = req.body;
        const result = await messagingService.uploadFile(fileName, fileData);
        res.json(result);
    } catch (error: any) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed: " + error.message });
    }
});

// GET /api/conversations/unread-count
conversationRoutes.get("/conversations/unread-count", requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.sendStatus(401);
        const count = await messagingService.getUnreadCount(req.user.id);
        res.json({ unreadCount: count });
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

        const users = await messagingService.getMessagingUsers(schoolId, req.user!.id);
        res.json(users);
    } catch (error: any) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// GET /api/conversations - Get all conversations for current user
conversationRoutes.get("/conversations", requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.sendStatus(401);
        const conversations = await messagingService.getConversations(req.user.id);
        res.json(conversations);
    } catch (error: any) {
        console.error("Fetch conversations error:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// POST /api/conversations - Create new conversation
conversationRoutes.post("/conversations", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school" });

        const newConv = await messagingService.createConversation(schoolId, req.user!.id, req.body);
        res.status(201).json(newConv);
    } catch (error: any) {
        console.error("Create conversation error:", error);
        res.status(500).json({ message: "Failed to create conversation: " + error.message });
    }
});

// GET /api/conversations/:id - Get single conversation
conversationRoutes.get("/conversations/:id", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        const conv = await messagingService.getConversation(convId, req.user!.id);
        res.json(conv);
    } catch (error: any) {
        if (error.message === "Access denied") return res.status(403).json({ message: error.message });
        if (error.message === "Conversation not found") return res.status(404).json({ message: error.message });
        console.error("Get conversation error:", error);
        res.status(500).json({ message: "Failed to fetch conversation" });
    }
});

// PUT /api/conversations/:id - Update group info
conversationRoutes.put("/conversations/:id", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        await messagingService.updateGroupInfo(convId, req.body);
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

        const msgs = await messagingService.getMessages(convId, req.user!.id);
        res.json(msgs);
    } catch (error: any) {
        if (error.message === "Access denied") return res.status(403).json({ message: error.message });
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// POST /api/conversations/:id/messages - Send message
conversationRoutes.post("/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        const newMsg = await messagingService.sendMessage(convId, req.user!.id, req.body);
        res.json(newMsg);
    } catch (error: any) {
        if (error.message === "Access denied") return res.status(403).json({ message: error.message });
        console.error("Send message error:", error);
        res.status(500).json({ message: "Failed to send message: " + error.message });
    }
});

// POST /api/conversations/:id/messages/:msgId/react - Toggle reaction
conversationRoutes.post("/conversations/:id/messages/:msgId/react", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));
        const { emoji } = req.body;

        const updated = await messagingService.reactToMessage(convId, msgId, req.user!.id, emoji);
        res.json(updated);
    } catch (error: any) {
        console.error("Reaction error:", error);
        res.status(500).json({ message: "Reaction failed: " + error.message });
    }
});

// DELETE /api/conversations/:id/messages/:msgId - Delete message (soft)
conversationRoutes.delete("/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));

        const result = await messagingService.deleteMessage(convId, msgId, req.user!.id);
        res.json(result);
    } catch (error: any) {
        if (error.message.includes("Cannot delete")) return res.status(403).json({ message: error.message });
        console.error("Delete message error:", error);
        res.status(500).json({ message: "Failed to delete message" });
    }
});

// PUT /api/conversations/:id/messages/:msgId - Edit message
conversationRoutes.put("/conversations/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        const msgId = parseInt(param(req, 'msgId'));
        const { content } = req.body;

        const updated = await messagingService.editMessage(convId, msgId, req.user!.id, content);
        res.json(updated);
    } catch (error: any) {
        if (error.message.includes("Cannot edit")) return res.status(403).json({ message: error.message });
        console.error("Edit message error:", error);
        res.status(500).json({ message: "Failed to edit message" });
    }
});

// POST /api/conversations/:id/read - Mark as read
conversationRoutes.post("/conversations/:id/read", requireAuth, async (req, res) => {
    try {
        const convId = parseInt(param(req, 'id'));
        if (isNaN(convId)) return res.status(400).json({ message: "Invalid ID" });

        await messagingService.markAsRead(convId, req.user!.id);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Read mark error:", error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
});
