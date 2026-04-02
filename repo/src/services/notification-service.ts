import type { Notification, NotificationSubscription } from '@domain/models/notification';
import { createNotification, markDelivered, markRead, markFailed, incrementRetry, renderTemplate } from '@domain/models/notification';
import type { NotificationRepository, NotificationTemplateRepository, NotificationSubscriptionRepository } from '@domain/ports/notification-repository';
import type { PreferencesRepository } from '@domain/ports/preferences-repository';
import { isRateLimited, addTimestamp, canRetry, type RateLimitState } from '@domain/policies/notification-policy';
import { isInQuietHours } from '@domain/policies/quiet-hours-policy';
import { hasPermission } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';
import { auditLog } from './audit-log';

export interface NotificationActor {
  userId: string;
  role: UserRole;
}

export class NotificationService {
  private rateLimits: Map<string, RateLimitState> = new Map();

  constructor(
    private readonly notifRepo: NotificationRepository,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly subRepo: NotificationSubscriptionRepository,
    private readonly prefsRepo?: PreferencesRepository
  ) {}

  async send(userId: string, templateId: string, variables: Record<string, string> = {}): Promise<Notification> {
    let state = this.rateLimits.get(userId) ?? { userId, timestamps: [] };
    if (isRateLimited(state)) {
      throw new Error('Rate limit exceeded: 30 notifications per minute');
    }
    state = addTimestamp(state);
    this.rateLimits.set(userId, state);

    const subs = await this.subRepo.getByUser(userId);
    const sub = subs.find((s) => s.templateId === templateId);
    if (sub && !sub.enabled) {
      throw new Error('User has unsubscribed from this notification type');
    }

    const template = await this.templateRepo.getById(templateId);
    let subject: string;
    let body: string;
    if (template) {
      subject = renderTemplate(template.subjectTemplate, variables);
      body = renderTemplate(template.bodyTemplate, variables);
    } else {
      subject = variables['subject'] ?? 'Notification';
      body = variables['body'] ?? '';
    }

    const notif = createNotification({ userId, templateId, subject, body, variables });

    // Check quiet hours for the *recipient*, not the current logged-in user
    if (this.prefsRepo) {
      const prefs = this.prefsRepo.get(userId);
      if (isInQuietHours(prefs.quietHours)) {
        await this.notifRepo.save(notif);
        return notif;
      }
    }

    const delivered = markDelivered(notif);
    await this.notifRepo.save(delivered);
    return delivered;
  }

  async markAsRead(notifId: string, actor: NotificationActor): Promise<Notification> {
    const n = await this.notifRepo.getById(notifId);
    if (!n) throw new Error(`Notification ${notifId} not found`);
    this.assertOwnerOrAdmin(n, actor);
    const read = markRead(n);
    await this.notifRepo.save(read);
    return read;
  }

  async retry(notifId: string, actor: NotificationActor): Promise<Notification> {
    const n = await this.notifRepo.getById(notifId);
    if (!n) throw new Error(`Notification ${notifId} not found`);
    this.assertOwnerOrAdmin(n, actor);
    if (!canRetry(n)) throw new Error('Notification cannot be retried');

    const retried = incrementRetry(n);
    const delivered = markDelivered(retried);
    await this.notifRepo.save(delivered);
    return delivered;
  }

  async fail(notifId: string, actor: NotificationActor): Promise<Notification> {
    const n = await this.notifRepo.getById(notifId);
    if (!n) throw new Error(`Notification ${notifId} not found`);
    this.assertOwnerOrAdmin(n, actor);
    const failed = markFailed(n);
    await this.notifRepo.save(failed);
    return failed;
  }

  async getUserNotifications(userId: string, actor: NotificationActor): Promise<Notification[]> {
    this.assertSelfOrAdmin(userId, actor);
    return this.notifRepo.getByUser(userId);
  }

  async getUnread(userId: string, actor: NotificationActor): Promise<Notification[]> {
    this.assertSelfOrAdmin(userId, actor);
    const all = await this.notifRepo.getByUser(userId);
    return all.filter((n) => n.status === 'delivered');
  }

  async getDeadLetterInbox(actor: NotificationActor): Promise<Notification[]> {
    if (!hasPermission(actor.role, 'manage_users')) {
      throw new Error('Only administrators can view the dead-letter inbox');
    }
    return this.notifRepo.getByStatus('dead_letter');
  }

  async updateSubscription(userId: string, templateId: string, enabled: boolean, actor: NotificationActor): Promise<void> {
    this.assertSelfOrAdmin(userId, actor);
    await this.subRepo.save({ userId, templateId, enabled });
  }

  async getSubscriptions(userId: string, actor: NotificationActor): Promise<NotificationSubscription[]> {
    this.assertSelfOrAdmin(userId, actor);
    return this.subRepo.getByUser(userId);
  }

  /** Delivers pending notifications whose quiet hours have ended. */
  async processPending(): Promise<{ delivered: number; stillPending: number }> {
    const pending = await this.notifRepo.getByStatus('pending');
    let delivered = 0;
    let stillPending = 0;
    for (const n of pending) {
      let inQuiet = false;
      if (this.prefsRepo) {
        const prefs = this.prefsRepo.get(n.userId);
        inQuiet = isInQuietHours(prefs.quietHours);
      }
      if (!inQuiet) {
        const d = markDelivered(n);
        await this.notifRepo.save(d);
        auditLog('info', 'notification', 'pending_delivered', { notificationId: n.id }, n.userId);
        delivered++;
      } else {
        stillPending++;
      }
    }
    return { delivered, stillPending };
  }

  /** Retries all failed notifications. Exhausted ones move to dead_letter. */
  async processRetries(): Promise<{ retried: number; deadLettered: number }> {
    const failed = await this.notifRepo.getByStatus('failed');
    let retried = 0;
    let deadLettered = 0;
    for (const n of failed) {
      if (canRetry(n)) {
        const r = incrementRetry(n);
        const delivered = markDelivered(r);
        await this.notifRepo.save(delivered);
        auditLog('info', 'notification', 'retry', { notificationId: n.id, attempt: r.retryCount }, n.userId);
        retried++;
      } else {
        const dead = markFailed(n);
        await this.notifRepo.save(dead);
        auditLog('warn', 'notification', 'dead_letter', { notificationId: n.id, retryCount: n.retryCount }, n.userId);
        deadLettered++;
      }
    }
    return { retried, deadLettered };
  }

  private assertOwnerOrAdmin(notification: Notification, actor: NotificationActor): void {
    if (notification.userId === actor.userId) return;
    if (hasPermission(actor.role, 'manage_users')) return;
    throw new Error('Access denied: you can only access your own notifications');
  }

  private assertSelfOrAdmin(targetUserId: string, actor: NotificationActor): void {
    if (targetUserId === actor.userId) return;
    if (hasPermission(actor.role, 'manage_users')) return;
    throw new Error('Access denied: you can only access your own notifications');
  }
}
