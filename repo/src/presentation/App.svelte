<script lang="ts">
  import Router, { push } from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import Header from './components/Header.svelte';
  import ModalManager from './modals/ModalManager.svelte';
  import { preferences } from './stores/preferences-store';
  import { isLoggedIn, currentRole, sessionReady, rehydrateSession } from './stores/auth-store';
  import { canAccessRoute } from '@domain/policies/auth-policy';
  import type { UserRole } from '@domain/models/user';
  import { onMount } from 'svelte';

  import Login from './routes/Login.svelte';
  import VenueList from './routes/VenueList.svelte';
  import VenueDetail from './routes/VenueDetail.svelte';
  import TripList from './routes/TripList.svelte';
  import TripSeatMap from './routes/TripSeatMap.svelte';
  import AdminConsole from './routes/AdminConsole.svelte';
  import QuestionManagement from './routes/QuestionManagement.svelte';
  import GradingWorkflow from './routes/GradingWorkflow.svelte';
  import NotificationCenter from './routes/NotificationCenter.svelte';
  import NutritionProfile from './routes/NutritionProfile.svelte';
  import Settings from './routes/Settings.svelte';
  import NotFound from './routes/NotFound.svelte';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Comp = any;

  function authGuard(): boolean {
    return _isLoggedIn;
  }

  function rbacGuard(path: string): () => boolean {
    return () => {
      if (!_isLoggedIn) return false;
      if (!_currentRole) return false;
      return canAccessRoute(_currentRole, path);
    };
  }

  let _isLoggedIn = false;
  let _currentRole: UserRole | null = null;
  isLoggedIn.subscribe((v) => { _isLoggedIn = v; });
  currentRole.subscribe((v) => { _currentRole = v; });

  const routes = {
    '/login': Login as Comp,
    '/': wrap({ component: VenueList as Comp, conditions: [authGuard] }),
    '/venue/:id': wrap({ component: VenueDetail as Comp, conditions: [authGuard] }),
    '/trips': wrap({ component: TripList as Comp, conditions: [authGuard, rbacGuard('/trips')] }),
    '/trip/:id/seats': wrap({ component: TripSeatMap as Comp, conditions: [authGuard, rbacGuard('/trip/:id/seats')] }),
    '/admin': wrap({ component: AdminConsole as Comp, conditions: [authGuard, rbacGuard('/admin')] }),
    '/questions': wrap({ component: QuestionManagement as Comp, conditions: [authGuard, rbacGuard('/questions')] }),
    '/grading': wrap({ component: GradingWorkflow as Comp, conditions: [authGuard, rbacGuard('/grading')] }),
    '/notifications': wrap({ component: NotificationCenter as Comp, conditions: [authGuard, rbacGuard('/notifications')] }),
    '/nutrition': wrap({ component: NutritionProfile as Comp, conditions: [authGuard, rbacGuard('/nutrition')] }),
    '/settings': wrap({ component: Settings as Comp, conditions: [authGuard] }),
    '*': NotFound as Comp,
  };

  function conditionsFailed() {
    if (!_isLoggedIn) {
      push('/login');
    } else {
      push('/');
    }
  }

  onMount(() => { rehydrateSession(); });

  $effect(() => {
    if ($sessionReady && !$isLoggedIn) {
      const hash = window.location.hash.replace('#', '') || '/';
      if (hash !== '/login') {
        push('/login');
      }
    }
  });
</script>

<div class="app" class:dark={$preferences.theme === 'dark'}>
  {#if !$sessionReady}
    <main class="loading-screen"><p>Loading...</p></main>
  {:else}
    {#if $isLoggedIn}
      <Header />
    {/if}
    <main>
      <Router {routes} on:conditionsFailed={conditionsFailed} />
    </main>
    {#if $isLoggedIn}
      <ModalManager />
    {/if}
  {/if}
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #1a1a2e;
    color: #f8f8f2;
  }
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .app.dark {
    background: #0f0f23;
  }
  main {
    flex: 1;
  }
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
  }
</style>
