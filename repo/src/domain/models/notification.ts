export type NotificationChannel = 'in_app';
export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'failed' | 'dead_letter';

export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly templateId: string;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly body: string;
  readonly variables: Record<string, string>;
  readonly status: NotificationStatus;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly deliveredAt: number | null;
  readonly readAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface NotificationTemplate {
  readonly id: string;
  readonly name: string;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
  readonly channel: NotificationChannel;
  readonly createdAt: number;
}

export interface NotificationSubscription {
  readonly userId: string;
  readonly templateId: string;
  readonly enabled: boolean;
}

export function createNotification(params: {
  userId: string;
  templateId: string;
  subject: string;
  body: string;
  variables?: Record<string, string>;
}): Notification {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    templateId: params.templateId,
    channel: 'in_app',
    subject: params.subject,
    body: params.body,
    variables: params.variables ?? {},
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    deliveredAt: null,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function markDelivered(n: Notification): Notification {
  return { ...n, status: 'delivered', deliveredAt: Date.now(), updatedAt: Date.now() };
}

export function markRead(n: Notification): Notification {
  return { ...n, status: 'read', readAt: Date.now(), updatedAt: Date.now() };
}

export function markFailed(n: Notification): Notification {
  const next = n.retryCount + 1;
  const status: NotificationStatus = next >= n.maxRetries ? 'dead_letter' : 'failed';
  return { ...n, status, retryCount: next, updatedAt: Date.now() };
}

export function incrementRetry(n: Notification): Notification {
  return { ...n, retryCount: n.retryCount + 1, status: 'pending', updatedAt: Date.now() };
}

/** Interpolates both {{key}} (Mustache) and {key} (prompt) placeholders. */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  // Process {{double-brace}} first so {single-brace} pass doesn't consume them
  const pass1 = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  return pass1.replace(/(?<!\{)\{(\w+)\}(?!\})/g, (match, key) => variables[key] ?? match);
}

export function createTemplate(params: {
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
}): NotificationTemplate {
  return {
    id: crypto.randomUUID(),
    name: params.name,
    subjectTemplate: params.subjectTemplate,
    bodyTemplate: params.bodyTemplate,
    channel: 'in_app',
    createdAt: Date.now(),
  };
}
