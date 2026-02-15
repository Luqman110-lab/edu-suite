import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import { db, pool } from "./db";
import { conversationParticipants, users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface WsClient extends WebSocket {
    userId?: number;
    isAlive: boolean;
}

const clients = new Map<number, Set<WsClient>>();
let wss: WebSocketServer;

function parseSessionId(token: string): string {
    if (token.startsWith('s:')) {
        return token.slice(2, token.lastIndexOf('.'));
    }
    return token;
}

async function validateSession(sessionId: string): Promise<number | null> {
    try {
        const sid = parseSessionId(sessionId);
        const result = await pool.query('SELECT sess FROM "session" WHERE sid = $1', [sid]);

        if (result.rows.length === 0) return null;

        const sess = result.rows[0].sess;
        if (sess && sess.passport && sess.passport.user) {
            return sess.passport.user;
        }
        return null;
    } catch (err) {
        console.error("Session validation error:", err);
        return null;
    }
}

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", async (ws: WsClient, req: IncomingMessage) => {
        ws.isAlive = true;

        // Try to authenticate via cookie
        if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {} as Record<string, string>);

            const sessionCookie = cookies['connect.sid'];
            if (sessionCookie) {
                const userId = await validateSession(decodeURIComponent(sessionCookie));
                if (userId) {
                    ws.userId = userId;
                    if (!clients.has(userId)) {
                        clients.set(userId, new Set());
                        broadcastPresence(userId, true);
                    }
                    clients.get(userId)?.add(ws);
                    console.log(`[WS] User ${userId} connected via cookie`);
                }
            }
        }

        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", async (data: string) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case "auth":
                        // If already authenticated via cookie, just confirm or verify match
                        if (ws.userId) {
                            if (message.userId && parseInt(message.userId) !== ws.userId) {
                                ws.send(JSON.stringify({ type: 'auth_error', message: 'Session mismatch' }));
                                return;
                            }
                            // Re-send online users as acknowledgment
                            const onlineUsers = Array.from(clients.keys());
                            ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUsers }));
                            break;
                        }

                        if (message.userId && message.sessionToken) {
                            const claimedUserId = parseInt(message.userId);
                            const validatedUserId = await validateSession(message.sessionToken);

                            if (validatedUserId && validatedUserId === claimedUserId) {
                                ws.userId = validatedUserId;

                                if (!clients.has(validatedUserId)) {
                                    clients.set(validatedUserId, new Set());
                                    broadcastPresence(validatedUserId, true);
                                }
                                clients.get(validatedUserId)?.add(ws);
                                console.log(`[WS] User ${validatedUserId} connected via token`);

                                const onlineUsers = Array.from(clients.keys());
                                ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUsers }));
                            } else {
                                ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid session or user' }));
                            }
                        } else {
                            ws.send(JSON.stringify({ type: 'auth_error', message: 'userId and sessionToken required' }));
                        }
                        break;

                    case "typing":
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
                if (p.userId === userId) return;
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
