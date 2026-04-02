export type AuditSeverity = 'info' | 'warn' | 'error';

export interface AuditEntry {
  timestamp: string;
  severity: AuditSeverity;
  category: string;
  event: string;
  actor?: string;
  detail?: string;
}

const REDACTED_FIELDS = ['passwordHash', 'salt', 'integrity', 'password'];

function redactValue(key: string, value: unknown): unknown {
  if (REDACTED_FIELDS.includes(key) && typeof value === 'string') return '[REDACTED]';
  return value;
}

function safeStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, (key, value) => redactValue(key, value));
}

const entries: AuditEntry[] = [];

function emit(entry: AuditEntry): void {
  entries.push(entry);
  // In a real deployment this would write to a persistent log sink.
  // For this offline SPA, entries are held in memory and accessible via getEntries().
}

export function auditLog(
  severity: AuditSeverity,
  category: string,
  event: string,
  detail?: Record<string, unknown>,
  actor?: string
): void {
  emit({
    timestamp: new Date().toISOString(),
    severity,
    category,
    event,
    actor,
    detail: detail ? safeStringify(detail) : undefined,
  });
}

export function getAuditEntries(): ReadonlyArray<AuditEntry> {
  return entries;
}

export function clearAuditEntries(): void {
  entries.length = 0;
}
