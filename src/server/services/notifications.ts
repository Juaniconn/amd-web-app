import "server-only";

import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  notifications,
  type Notification,
  type NewNotification,
} from "@/db/schema/notifications";

export async function listNotificationsForUser(
  userId: string,
  limit = 10,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return result[0]?.count ?? 0;
}

export async function createNotification(
  data: NewNotification,
): Promise<Notification> {
  const [notification] = await db
    .insert(notifications)
    .values(data)
    .returning();
  return notification;
}

export async function markNotificationAsRead(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}
