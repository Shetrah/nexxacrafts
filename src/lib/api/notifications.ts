/**
 * In-app notifications (`public.notifications`). Each user can only read and change their own.
 * Note: nothing in the current schema creates notifications automatically.
 */
import type { NotificationRow } from '@/types/db';
import { columnsOf, expectCount, expectOk, expectRows, getClient, nowIso } from './client';

const NOTIFICATION_COLUMNS = columnsOf<NotificationRow>()('id, user_id, title, message, link, read_at, created_at');

export interface ListNotificationsOptions {
  /** Maximum number of rows. Default 50. */
  limit?: number;
  /** Only unread notifications. Default `false`. */
  unreadOnly?: boolean;
}

/**
 * A user's notifications, newest first.
 *
 * Access (RLS): the owner only (`user_id = auth.uid()`); pass the signed-in user's id.
 */
export async function listNotifications(
  userId: string,
  options: ListNotificationsOptions = {},
): Promise<NotificationRow[]> {
  const client = getClient();
  const { limit = 50, unreadOnly = false } = options;
  let builder = client.from('notifications').select(NOTIFICATION_COLUMNS).eq('user_id', userId);
  if (unreadOnly) builder = builder.is('read_at', null);
  const response = await builder.order('created_at', { ascending: false }).limit(limit);
  return expectRows<NotificationRow>(response);
}

/**
 * Number of unread notifications (a `HEAD` request).
 *
 * Access (RLS): the owner only.
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const client = getClient();
  const response = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return expectCount(response);
}

/**
 * Marks one notification as read. Idempotent: an already-read notification keeps its original
 * `read_at`.
 *
 * Access (RLS): the owner only.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const client = getClient();
  const response = await client.from('notifications').update({ read_at: nowIso() }).eq('id', id).is('read_at', null);
  expectOk(response);
}

/**
 * Marks all of a user's unread notifications as read and returns how many were updated.
 *
 * Access (RLS): the owner only.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const client = getClient();
  const response = await client
    .from('notifications')
    .update({ read_at: nowIso() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id');
  return expectRows<Pick<NotificationRow, 'id'>>(response).length;
}
