import type { Notification, NotificationTemplate, NotificationSubscription } from '@domain/models/notification';
import type { NotificationRepository, NotificationTemplateRepository, NotificationSubscriptionRepository } from '@domain/ports/notification-repository';
import { getDb } from './db';

export class NotificationRepositoryIDB implements NotificationRepository {
  async getAll(): Promise<Notification[]> { const db = await getDb(); return db.getAll('notifications') as Promise<Notification[]>; }
  async getById(id: string): Promise<Notification | null> { const db = await getDb(); return ((await db.get('notifications', id)) as Notification) ?? null; }
  async getByUser(userId: string): Promise<Notification[]> { const db = await getDb(); return db.getAllFromIndex('notifications', 'by-user', userId) as Promise<Notification[]>; }
  async getByStatus(status: string): Promise<Notification[]> { const db = await getDb(); return db.getAllFromIndex('notifications', 'by-status', status) as Promise<Notification[]>; }
  async save(n: Notification): Promise<void> { const db = await getDb(); await db.put('notifications', { ...n }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('notifications', id); }
}

export class NotificationTemplateRepositoryIDB implements NotificationTemplateRepository {
  async getAll(): Promise<NotificationTemplate[]> { const db = await getDb(); return db.getAll('notificationTemplates') as Promise<NotificationTemplate[]>; }
  async getById(id: string): Promise<NotificationTemplate | null> { const db = await getDb(); return ((await db.get('notificationTemplates', id)) as NotificationTemplate) ?? null; }
  async save(t: NotificationTemplate): Promise<void> { const db = await getDb(); await db.put('notificationTemplates', { ...t }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('notificationTemplates', id); }
}

export class NotificationSubscriptionRepositoryIDB implements NotificationSubscriptionRepository {
  async getByUser(userId: string): Promise<NotificationSubscription[]> { const db = await getDb(); return db.getAllFromIndex('notificationSubscriptions', 'by-user', userId) as Promise<NotificationSubscription[]>; }
  async save(sub: NotificationSubscription): Promise<void> { const db = await getDb(); await db.put('notificationSubscriptions', { ...sub }); }
  async delete(userId: string, templateId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('notificationSubscriptions', 'readwrite');
    const index = tx.store.index('by-user');
    let cursor = await index.openCursor(userId);
    while (cursor) {
      const val = cursor.value as NotificationSubscription;
      if (val.templateId === templateId) { await cursor.delete(); break; }
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}
