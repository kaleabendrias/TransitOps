<script lang="ts">
  import { preferences, toggleTheme } from '../stores/preferences-store';
  import { session, currentRole, logout, checkPermission } from '../stores/auth-store';
  import { ROLE_LABELS } from '@domain/models/user';
  import type { UserRole } from '@domain/models/user';
  import { config } from '@config/index';
</script>

<header class="header" class:dark={$preferences.theme === 'dark'}>
  <a href="#/" class="brand">{config.appName}</a>

  {#if $session}
    <nav>
      <a href="#/">Venues</a>
      {#if checkPermission($currentRole, 'view_trips')}
        <a href="#/trips">Trips</a>
      {/if}
      {#if checkPermission($currentRole, 'manage_questions')}
        <a href="#/questions">Questions</a>
      {/if}
      {#if checkPermission($currentRole, 'review_attempts')}
        <a href="#/grading">Grading</a>
      {/if}
      {#if checkPermission($currentRole, 'view_notifications')}
        <a href="#/notifications">Notifications</a>
      {/if}
      {#if checkPermission($currentRole, 'manage_nutrition')}
        <a href="#/nutrition">Nutrition</a>
      {/if}
      {#if checkPermission($currentRole, 'manage_users')}
        <a href="#/admin">Admin</a>
      {/if}
      <a href="#/settings">Settings</a>
    </nav>
    <div class="user-section">
      <span class="role-badge">{ROLE_LABELS[$currentRole as UserRole] ?? $currentRole}</span>
      <span class="username">{$session.username}</span>
      <button class="theme-btn" onclick={toggleTheme}>
        {$preferences.theme === 'light' ? '🌙' : '☀️'}
      </button>
      <button class="logout-btn" onclick={() => { logout(); window.location.hash = '/login'; }}>
        Sign Out
      </button>
    </div>
  {/if}
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1.5rem;
    background: #1a1a2e;
    color: #eee;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .header.dark {
    background: #0f0f23;
  }
  .brand {
    font-size: 1.2rem;
    font-weight: 700;
    color: #8be9fd;
    text-decoration: none;
    white-space: nowrap;
  }
  nav {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    flex-wrap: wrap;
  }
  nav a {
    color: #ccc;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }
  nav a:hover {
    color: #8be9fd;
    background: rgba(139, 233, 253, 0.08);
  }
  .user-section {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .role-badge {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    background: #6272a4;
    color: #f8f8f2;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    letter-spacing: 0.03em;
  }
  .username {
    font-size: 0.85rem;
    color: #ccc;
  }
  .theme-btn {
    background: none;
    border: 1px solid #555;
    color: #eee;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .logout-btn {
    background: none;
    border: 1px solid #ff5555;
    color: #ff5555;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .logout-btn:hover {
    background: rgba(255, 85, 85, 0.15);
  }
</style>
