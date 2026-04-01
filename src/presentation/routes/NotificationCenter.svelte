<script lang="ts">
  import { onMount } from 'svelte';
  import type { Notification } from '@domain/models/notification';
  import { notificationService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { NotificationActor } from '@services/notification-service';
  import type { UserRole } from '@domain/models/user';

  function getActor(): NotificationActor {
    return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole };
  }

  let notifications = $state<Notification[]>([]);
  let deadLetters = $state<Notification[]>([]);
  let unreadCount = $state(0);
  let loading = $state(true);
  let error = $state('');
  let tab = $state<'inbox' | 'dead_letter'>('inbox');

  async function loadData() {
    loading = true;
    try {
      if ($currentUserId) {
        const actor = getActor();
        notifications = (await notificationService.getUserNotifications($currentUserId, actor))
          .sort((a, b) => b.createdAt - a.createdAt);
        const unread = await notificationService.getUnread($currentUserId, actor);
        unreadCount = unread.length;
        try { deadLetters = await notificationService.getDeadLetterInbox(actor); } catch { deadLetters = []; }
      }
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
    finally { loading = false; }
  }

  onMount(loadData);

  async function markRead(id: string) {
    try { await notificationService.markAsRead(id, getActor()); await loadData(); }
    catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
  }

  function formatTime(ts: number | null): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'delivered': return '#ffb86c';
      case 'read': return '#50fa7b';
      case 'failed': return '#ff5555';
      case 'dead_letter': return '#ff79c6';
      default: return '#6272a4';
    }
  }
</script>

<section class="notif-center">
  <h2>Notification Center {#if unreadCount > 0}<span class="badge">{unreadCount}</span>{/if}</h2>
  {#if error}<p class="error">{error}</p>{/if}

  <div class="tabs">
    <button class:active={tab === 'inbox'} onclick={() => tab = 'inbox'}>Inbox ({notifications.length})</button>
    <button class:active={tab === 'dead_letter'} onclick={() => tab = 'dead_letter'}>Dead Letter ({deadLetters.length})</button>
  </div>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if tab === 'inbox'}
    {#if notifications.length === 0}
      <p class="empty">No notifications.</p>
    {:else}
      <div class="notif-list">
        {#each notifications as n (n.id)}
          <div class="notif-card" class:unread={n.status === 'delivered'}>
            <div class="notif-header">
              <span class="notif-subject">{n.subject}</span>
              <span class="notif-status" style="color: {statusColor(n.status)}">{n.status}</span>
            </div>
            <p class="notif-body">{n.body}</p>
            <div class="notif-meta">
              <span>Delivered: {formatTime(n.deliveredAt)}</span>
              <span>Read: {formatTime(n.readAt)}</span>
              <span>Retries: {n.retryCount}/{n.maxRetries}</span>
            </div>
            {#if n.status === 'delivered'}
              <button class="read-btn" onclick={() => markRead(n.id)}>Mark Read</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    {#if deadLetters.length === 0}
      <p class="empty">No dead letter notifications.</p>
    {:else}
      <div class="notif-list">
        {#each deadLetters as n (n.id)}
          <div class="notif-card dead">
            <div class="notif-header">
              <span class="notif-subject">{n.subject}</span>
              <span class="notif-status" style="color: #ff79c6">DEAD LETTER</span>
            </div>
            <p class="notif-body">{n.body}</p>
            <div class="notif-meta">
              <span>Retries exhausted: {n.retryCount}/{n.maxRetries}</span>
              <span>Created: {formatTime(n.createdAt)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .notif-center { padding: 1.5rem; max-width: 800px; margin: 0 auto; }
  h2 { margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
  .badge { background: #ff5555; color: #fff; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 10px; }
  .error { color: #ff5555; }
  .loading, .empty { color: #888; text-align: center; padding: 2rem; }
  .tabs { display: flex; gap: 0; margin-bottom: 1rem; }
  .tabs button { padding: 0.5rem 1rem; background: #44475a; color: #ccc; border: none; cursor: pointer; }
  .tabs button:first-child { border-radius: 6px 0 0 6px; }
  .tabs button:last-child { border-radius: 0 6px 6px 0; }
  .tabs button.active { background: #6272a4; color: #f8f8f2; }
  .notif-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .notif-card { background: #282a36; border: 1px solid #44475a; border-radius: 8px; padding: 0.8rem 1rem; }
  .notif-card.unread { border-left: 3px solid #ffb86c; }
  .notif-card.dead { border-left: 3px solid #ff79c6; }
  .notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
  .notif-subject { font-weight: 600; color: #f8f8f2; font-size: 0.9rem; }
  .notif-status { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
  .notif-body { margin: 0 0 0.3rem; font-size: 0.85rem; color: #ccc; }
  .notif-meta { display: flex; gap: 1rem; font-size: 0.7rem; color: #888; flex-wrap: wrap; }
  .read-btn { margin-top: 0.5rem; padding: 0.3rem 0.6rem; background: #50fa7b; color: #282a36; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
