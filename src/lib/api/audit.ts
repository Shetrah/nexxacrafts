/**
 * Audit trail (`public.audit_logs`). Read-only here. Note: no trigger writes audit rows in the
 * current schema, so the log stays empty until the application or server inserts events.
 */
import type { AuditLogRow } from '@/types/db';
import { columnsOf, expectRows, getClient } from './client';

const AUDIT_COLUMNS = columnsOf<AuditLogRow>()('id, actor_id, action, entity_type, entity_id, details, created_at');

export interface ListAuditLogsOptions {
  /** Maximum number of rows. Default 100. */
  limit?: number;
  /** Only events for this entity type, e.g. `'order'`. */
  entityType?: string;
  /** Only events for this entity id. */
  entityId?: string;
  /** Only events by this user. */
  actorId?: string;
}

/**
 * Audit events, newest first.
 *
 * Access (RLS): super_admin, admin. Other roles receive no rows.
 */
export async function listAuditLogs(options: ListAuditLogsOptions = {}): Promise<AuditLogRow[]> {
  const client = getClient();
  const { limit = 100, entityType, entityId, actorId } = options;
  let builder = client.from('audit_logs').select(AUDIT_COLUMNS);
  if (entityType) builder = builder.eq('entity_type', entityType);
  if (entityId) builder = builder.eq('entity_id', entityId);
  if (actorId) builder = builder.eq('actor_id', actorId);
  const response = await builder
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  return expectRows<AuditLogRow>(response);
}
