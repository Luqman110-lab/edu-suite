
import webpush from 'web-push';
import { db } from '../db';
import { pushSubscriptions, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// These should be set in .env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY!;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY!;

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
        'mailto:support@broadwayschools.com',
        publicVapidKey,
        privateVapidKey
    );
} else {
    console.warn("VAPID keys not set. Push notifications will not work.");
}

export class NotificationService {
    static async sendToUser(userId: number, title: string, body: string, url?: string) {
        if (!publicVapidKey || !privateVapidKey) return;

        const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

        const payload = JSON.stringify({
            title,
            body,
            url: url || '/',
            icon: '/pwa-192x192.png'
        });

        const promises = subscriptions.map(async (sub) => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    auth: sub.auth,
                    p256dh: sub.p256dh
                }
            };

            try {
                await webpush.sendNotification(pushConfig, payload);
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription no longer valid, remove it
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                } else {
                    console.error("Error sending push notification:", error);
                }
            }
        });

        await Promise.all(promises);
    }

    static async broadcast(title: string, body: string, url?: string) {
        if (!publicVapidKey || !privateVapidKey) return;

        // In a real app, you might want to batch this or use a queue
        const allSubs = await db.select().from(pushSubscriptions);

        const payload = JSON.stringify({ title, body, url: url || '/', icon: '/pwa-192x192.png' });

        // Send in chunks to avoid overwhelming? (web-push handles concurrency reasonably well for small scale)
        for (const sub of allSubs) {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    auth: sub.auth,
                    p256dh: sub.p256dh
                }
            };

            try {
                await webpush.sendNotification(pushConfig, payload);
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                }
            }
        }
    }
}
