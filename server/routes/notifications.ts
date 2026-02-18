import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
    pushSubscriptions, schoolEvents, programItems,
    insertProgramItemSchema
} from "../../shared/schema";
import { requireAuth, requireAdmin, requireStaff, getActiveSchoolId } from "../auth";
import { NotificationService } from "../services/NotificationService";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const notificationsRoutes = Router();

// POST /api/notifications/subscribe
notificationsRoutes.post("/notifications/subscribe", requireAuth, async (req, res) => {
    try {
        const subscription = req.body;
        const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        if (existing.length === 0) {
            await db.insert(pushSubscriptions).values({
                userId: (req.user as any).id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            });
        }
        res.status(201).json({ message: "Subscribed" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to subscribe: " + error.message });
    }
});

// POST /api/notifications/test
notificationsRoutes.post("/notifications/test", requireAuth, async (req, res) => {
    try {
        await NotificationService.sendToUser((req.user as any).id, "Test Notification", "System check successful!");
        res.json({ message: "Test notification sent" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/events/:eventId/program
notificationsRoutes.get("/events/:eventId/program", requireAuth, async (req, res) => {
    try {
        const eventId = parseInt(param(req, 'eventId'));
        const items = await db.select().from(programItems)
            .where(eq(programItems.eventId, eventId))
            .orderBy(asc(programItems.sortOrder));
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/events/:eventId/program
notificationsRoutes.post("/events/:eventId/program", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const eventId = parseInt(param(req, 'eventId'));
        const event = await db.select().from(schoolEvents)
            .where(and(eq(schoolEvents.id, eventId), eq(schoolEvents.schoolId, schoolId))).limit(1);
        if (event.length === 0) return res.status(404).json({ message: "Event not found or access denied" });
        const result = (insertProgramItemSchema as any).omit({ id: true, eventId: true }).safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const { title, startTime, endTime, responsiblePerson, description } = result.data;
        const [newItem] = await db.insert(programItems).values({ eventId, title, startTime, endTime, responsiblePerson, description, sortOrder: 0 }).returning();
        res.json(newItem);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/program-items/:id
notificationsRoutes.delete("/program-items/:id", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        const item = await db.select({ id: programItems.id, eventId: programItems.eventId, schoolId: schoolEvents.schoolId })
            .from(programItems).innerJoin(schoolEvents, eq(programItems.eventId, schoolEvents.id)).where(eq(programItems.id, id)).limit(1);
        if (item.length === 0 || item[0].schoolId !== schoolId) return res.status(404).json({ message: "Item not found or access denied" });
        await db.delete(programItems).where(eq(programItems.id, id));
        res.json({ message: "Item deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/program-items/:id
notificationsRoutes.put("/program-items/:id", requireStaff, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });
        const id = parseInt(param(req, 'id'));
        const item = await db.select({ id: programItems.id, eventId: programItems.eventId, schoolId: schoolEvents.schoolId })
            .from(programItems).innerJoin(schoolEvents, eq(programItems.eventId, schoolEvents.id)).where(eq(programItems.id, id)).limit(1);
        if (item.length === 0 || item[0].schoolId !== schoolId) return res.status(404).json({ message: "Item not found or access denied" });
        const result = insertProgramItemSchema.partial().safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.issues });
        const [updated] = await db.update(programItems).set(result.data).where(eq(programItems.id, id)).returning();
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});
