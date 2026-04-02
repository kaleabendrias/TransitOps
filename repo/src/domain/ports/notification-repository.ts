import type { Notification, NotificationTemplate, NotificationSubscription } from '../models/notification';

export interface NotificationRepository {
  getAll(): Promise<Notification[]>;
  getById(id: string): Promise<Notification | null>;
  getByUser(userId: string): Promise<Notification[]>;
  getByStatus(status: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface NotificationTemplateRepository {
  getAll(): Promise<NotificationTemplate[]>;
  getById(id: string): Promise<NotificationTemplate | null>;
  save(template: NotificationTemplate): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface NotificationSubscriptionRepository {
  getByUser(userId: string): Promise<NotificationSubscription[]>;
  save(sub: NotificationSubscription): Promise<void>;
  delete(userId: string, templateId: string): Promise<void>;
}
