import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "./db";
import { conversationParticipants, users } from "../shared/schema";
import { eq } from "drizzle-orm";

interface WsClient extends WebSocket {
    userId?: number;
    isAlive: boolean;
}

const clients = new Map<number, Set<WsClient>>();
let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: WsClient) => {
        ws.isAlive = true;

        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", async (data: string) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case "auth":
                        if (message.userId && message.sessionToken) {
                            const userId = parseInt(message.userId);

                            // Verify the user actually exists in the database
                            const [user] = await db.select({ id: users.id })
                                .from(users)
                                .where(eq(users.id, userId))
                                .limit(1);

                            if (!user) {
                                ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid user' }));
                                break;
                            }

                            ws.userId = userId;

                            if (!clients.has(userId)) {
                                clients.set(userId, new Set());
                                broadcastPresence(userId, true);
                            }
                            clients.get(userId)?.add(ws);
                            console.log(`[WS] User ${userId} connected`);

                            // Send initial online list
                            const onlineUsers = Array.from(clients.keys());
                            ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUsers }));
                        } else {
                            ws.send(JSON.stringify({ type: 'auth_error', message: 'userId and sessionToken required' }));
                        }
                        break;

                    case "typing":
                        // { type: 'typing', conversationId: 123, isTyping: true }
                        if (ws.userId && message.conversationId) {
                            broadcastTyping(message.conversationId, ws.userId, message.isTyping);
                        }
                        break;

                    case "ping":
                        ws.send(JSON.stringify({ type: "pong" }));
                        break;
                }
            } catch (e) {
                console.error("[WS] Error parsing message:", e);
            }
        });

        ws.on("close", () => {
            if (ws.userId && clients.has(ws.userId)) {
                const userSockets = clients.get(ws.userId);
                userSockets?.delete(ws);

                if (userSockets?.size === 0) {
                    clients.delete(ws.userId);
                    broadcastPresence(ws.userId, false);
                    console.log(`[WS] User ${ws.userId} disconnected`);
                }
            }
        });
    });

    // Keep-alive interval
    setInterval(() => {
        wss.clients.forEach((ws: any) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    console.log("[WS] WebSocket server initialized");
}

// --- Public API for Routes to use ---

export async function broadcastMessage(conversationId: number, message: any) {
    try {
        // Get all participants of the conversation
        const participants = await db.select()
            .from(conversationParticipants)
            .where(eq(conversationParticipants.conversationId, conversationId));

        const payload = JSON.stringify({
            type: "new_message",
            conversationId,
            message
        });

        participants.forEach((p) => {
            const userSockets = clients.get(p.userId);
            if (userSockets) {
                userSockets.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(payload);
                    }
                });
            }
        });
    } catch (err) {
        console.error(`[WS] Failed to broadcast message to conv ${conversationId}:`, err);
    }
}

export function broadcastTyping(conversationId: number, userId: number, isTyping: boolean) {
    // We need to know who is in the conversation. 
    // For efficiency, usually client sends "I am typing in room X", asking server to forward to X.
    // Ideally, we cache participants or fetch them. 
    // For now, simpler approach: The client should probably subscribe to a "room" in WS.
    // But to adhere to the current REST-heavy architecture:
    // We will fetch participants from DB. This is slightly heavy for "typing" but safe.

    db.select().from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId))
        .then(participants => {
            const payload = JSON.stringify({
                type: "typing",
                conversationId,
                userId,
                isTyping
            });

            participants.forEach(p => {
                if (p.userId === userId) return; // Don't send to self
                const userSockets = clients.get(p.userId);
                if (userSockets) {
                    userSockets.forEach(ws => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
                    });
                }
            });
        })
        .catch(console.error);
}

function broadcastPresence(userId: number, isOnline: boolean) {
    // Broadcast to EVERYONE connected? Or just friends?
    // In a school system, "Online Status" is usually visible to all staff.
    // Broadcast to all connected clients.
    const payload = JSON.stringify({
        type: "presence",
        userId,
        isOnline
    });

    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    });
}
