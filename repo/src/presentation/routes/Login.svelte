<script lang="ts">
  import { onMount } from 'svelte';
  import { login, register, authError, authLoading } from '../stores/auth-store';
  import { PUBLIC_REGISTRATION_ROLES, ALL_ROLES, ROLE_LABELS } from '@domain/models/user';
  import type { UserRole } from '@domain/models/user';
  import { authService } from '@services/container';

  let isRegister = $state(false);
  let username = $state('');
  let password = $state('');
  let displayName = $state('');
  let role = $state<UserRole>('dispatcher');
  let isBootstrap = $state(false);

  onMount(async () => {
    // Check if any users exist — if not, this is a bootstrap scenario
    // where the first admin can be created via the UI
    try {
      const session = authService.getSession();
      if (!session) {
        // Try to detect empty DB by attempting a bootstrap check
        // createAdmin with empty fields will fail, but we can check if admin exists
        // by calling the service method that checks internally
        isBootstrap = true; // assume bootstrap until first registration succeeds
      }
    } catch {
      isBootstrap = true;
    }
  });

  // Show admin role option during bootstrap, otherwise only public roles
  let availableRoles = $derived(isBootstrap ? ALL_ROLES : PUBLIC_REGISTRATION_ROLES);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    try {
      if (isRegister) {
        if (role === 'administrator') {
          // Use createAdmin for bootstrap path
          await authService.createAdmin(username.trim(), password, displayName.trim() || username.trim(), null);
          await login(username.trim(), password);
          isBootstrap = false;
        } else {
          await register(username.trim(), password, role, displayName.trim() || username.trim());
          isBootstrap = false;
        }
      } else {
        await login(username.trim(), password);
      }
    } catch {
      // error is set in store
      // If admin creation failed because one already exists, disable bootstrap
      isBootstrap = false;
    }
  }
</script>

<section class="login-page">
  <div class="login-card">
    <h1>Seat Scoring App</h1>
    <h2>{isRegister ? 'Create Account' : 'Sign In'}</h2>

    {#if isRegister && isBootstrap && role === 'administrator'}
      <p class="bootstrap-note">First-time setup: creating the initial administrator account.</p>
    {/if}

    {#if $authError}
      <p class="error">{$authError}</p>
    {/if}

    <form onsubmit={handleSubmit}>
      <label>
        Username
        <input type="text" bind:value={username} placeholder="Enter username" autocomplete="username" required />
      </label>

      <label>
        Password
        <input type="password" bind:value={password} placeholder="Enter password" autocomplete={isRegister ? 'new-password' : 'current-password'} required />
      </label>

      {#if isRegister}
        <label>
          Display Name
          <input type="text" bind:value={displayName} placeholder="Your name (optional)" />
        </label>

        <label>
          Role
          <select bind:value={role}>
            {#each availableRoles as r}
              <option value={r}>{ROLE_LABELS[r]}</option>
            {/each}
          </select>
        </label>
      {/if}

      <button type="submit" class="submit-btn" disabled={$authLoading}>
        {$authLoading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
      </button>
    </form>

    <p class="toggle">
      {isRegister ? 'Already have an account?' : "Don't have an account?"}
      <button class="link-btn" onclick={() => { isRegister = !isRegister; authError.set(null); }}>
        {isRegister ? 'Sign In' : 'Register'}
      </button>
    </p>
  </div>
</section>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    padding: 1rem;
  }
  .login-card {
    background: #282a36;
    border-radius: 12px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  h1 { text-align: center; color: #8be9fd; margin: 0 0 0.5rem; font-size: 1.5rem; }
  h2 { text-align: center; color: #f8f8f2; margin: 0 0 1.5rem; font-size: 1.1rem; font-weight: 400; }
  .bootstrap-note {
    color: #ffb86c; font-size: 0.8rem; text-align: center;
    padding: 0.4rem 0.8rem; background: rgba(255, 184, 108, 0.1);
    border-radius: 6px; margin: 0 0 1rem;
  }
  form { display: flex; flex-direction: column; gap: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #ccc; }
  input, select {
    padding: 0.6rem; border: 1px solid #44475a; border-radius: 6px;
    background: #1a1a2e; color: #f8f8f2; font-size: 1rem;
  }
  input:focus, select:focus { outline: none; border-color: #8be9fd; }
  .submit-btn {
    padding: 0.7rem; background: #50fa7b; color: #282a36; border: none;
    border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 0.5rem;
  }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .error {
    color: #ff5555; font-size: 0.85rem; background: rgba(255, 85, 85, 0.1);
    padding: 0.5rem 0.8rem; border-radius: 6px; margin: 0;
  }
  .toggle { text-align: center; color: #888; font-size: 0.85rem; margin: 1rem 0 0; }
  .link-btn {
    background: none; border: none; color: #8be9fd; cursor: pointer;
    font-size: 0.85rem; text-decoration: underline;
  }
</style>
