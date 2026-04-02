<script lang="ts">
  import { onMount } from 'svelte';
  import type { Question, QuestionType } from '@domain/models/question';
  import { QUESTION_TYPE_LABELS } from '@domain/models/question';
  import { questionService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  let questions = $state<Question[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showDeleted = $state(false);
  let filterType = $state<QuestionType | ''>('');
  let editingQuestion = $state<Question | null>(null);
  let showForm = $state(false);

  // Form state
  let formText = $state('');
  let formType = $state<QuestionType>('multiple_choice');
  let formOptions = $state('');
  let formCorrect = $state('');
  let formExplanation = $state('');
  let formPoints = $state(1);
  let formDifficulty = $state(3);
  let formScore = $state(0);
  let formTags = $state('');
  let formKnowledgePoints = $state('');
  let formDepartmentIds = $state('');
  let formCatalogId = $state('general');

  async function load() {
    loading = true;
    try {
      const all = await questionService.list();
      questions = showDeleted ? all : all.filter(q => q.status !== 'deleted');
    } catch (e) { error = e instanceof Error ? e.message : 'Failed to load'; }
    finally { loading = false; }
  }

  onMount(load);

  let filtered = $derived(
    filterType ? questions.filter(q => q.type === filterType) : questions
  );

  function openNew() {
    editingQuestion = null;
    formText = ''; formType = 'multiple_choice'; formOptions = ''; formCorrect = '';
    formExplanation = ''; formPoints = 1; formDifficulty = 3; formScore = 0;
    formTags = ''; formKnowledgePoints = ''; formDepartmentIds = ''; formCatalogId = 'general';
    showForm = true;
  }

  function openEdit(q: Question) {
    editingQuestion = q;
    formText = q.text; formType = q.type; formOptions = q.options.join('\n'); formCorrect = q.correctAnswer;
    formExplanation = q.explanation; formPoints = q.points; formDifficulty = q.difficulty; formScore = q.score;
    formTags = q.tags.join(', '); formKnowledgePoints = q.knowledgePoints.join(', ');
    formDepartmentIds = q.departmentIds.join(', '); formCatalogId = q.catalogId;
    showForm = true;
  }

  async function handleSubmit() {
    error = '';
    const opts = formOptions.split('\n').map(s => s.trim()).filter(Boolean);
    const tags = formTags.split(',').map(s => s.trim()).filter(Boolean);
    const kps = formKnowledgePoints.split(',').map(s => s.trim()).filter(Boolean);
    const dids = formDepartmentIds.split(',').map(s => s.trim()).filter(Boolean);
    try {
      if (editingQuestion) {
        await questionService.edit(editingQuestion.id, {
          text: formText, type: formType, options: opts, correctAnswer: formCorrect,
          explanation: formExplanation, points: formPoints, difficulty: formDifficulty,
          score: formScore, tags, knowledgePoints: kps, departmentIds: dids, catalogId: formCatalogId,
        }, getActor());
      } else {
        await questionService.create({
          catalogId: formCatalogId, text: formText, type: formType, options: opts,
          correctAnswer: formCorrect, explanation: formExplanation, points: formPoints,
          difficulty: formDifficulty, score: formScore, tags, knowledgePoints: kps,
          departmentIds: dids, createdBy: $currentUserId ?? '',
        }, getActor());
      }
      showForm = false;
      await load();
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
  }

  async function handleCopy(q: Question) { await questionService.copy(q.id, $currentUserId ?? '', getActor()); await load(); }
  async function handleDeactivate(q: Question) { await questionService.deactivate(q.id, getActor()); await load(); }
  async function handleReactivate(q: Question) { await questionService.reactivate(q.id, getActor()); await load(); }
  async function handleDelete(q: Question) { await questionService.softDelete(q.id, getActor()); await load(); }
  async function handleRestore(q: Question) { await questionService.restore(q.id, getActor()); await load(); }
</script>

<section class="qm">
  <div class="qm-header">
    <h2>Question Management</h2>
    <button class="new-btn" onclick={openNew}>+ New Question</button>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="filters">
    <select bind:value={filterType}><option value="">All Types</option>{#each Object.entries(QUESTION_TYPE_LABELS) as [val, label]}<option value={val}>{label}</option>{/each}</select>
    <label><input type="checkbox" bind:checked={showDeleted} onchange={load} /> Show deleted</label>
  </div>

  {#if showForm}
    <div class="form-card">
      <h3>{editingQuestion ? 'Edit' : 'New'} Question</h3>
      <div class="form-grid">
        <label>Text <textarea bind:value={formText} rows="3"></textarea></label>
        <label>Type <select bind:value={formType}>{#each Object.entries(QUESTION_TYPE_LABELS) as [val, label]}<option value={val}>{label}</option>{/each}</select></label>
        {#if formType === 'multiple_choice'}<label>Options (one per line) <textarea bind:value={formOptions} rows="4"></textarea></label>{/if}
        <label>Correct Answer <input bind:value={formCorrect} /></label>
        <label>Explanation <textarea bind:value={formExplanation} rows="2"></textarea></label>
        <div class="form-row">
          <label>Points <input type="number" bind:value={formPoints} min="1" max="100" /></label>
          <label>Difficulty (1-5) <input type="number" bind:value={formDifficulty} min="1" max="5" /></label>
          <label>Score (0-100) <input type="number" bind:value={formScore} min="0" max="100" /></label>
        </div>
        <label>Tags <input bind:value={formTags} placeholder="tag1, tag2" /></label>
        <label>Knowledge Points <input bind:value={formKnowledgePoints} placeholder="kp1, kp2" /></label>
        <label>Department IDs <input bind:value={formDepartmentIds} placeholder="dept1, dept2" /></label>
      </div>
      <div class="form-actions">
        <button class="cancel-btn" onclick={() => showForm = false}>Cancel</button>
        <button class="save-btn" onclick={handleSubmit}>{editingQuestion ? 'Save' : 'Create'}</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else}
    <div class="q-list">
      {#each filtered as q (q.id)}
        <div class="q-card" class:inactive={q.status === 'inactive'} class:deleted={q.status === 'deleted'}>
          <div class="q-top">
            <span class="q-type">{QUESTION_TYPE_LABELS[q.type]}</span>
            <span class="q-difficulty">D{q.difficulty}</span>
            <span class="q-points">{q.points}pts</span>
            <span class="q-status {q.status}">{q.status}</span>
          </div>
          <p class="q-text">{q.text}</p>
          {#if q.explanation}<p class="q-explain">Explanation: {q.explanation}</p>{/if}
          {#if q.tags.length > 0}<div class="q-tags">{#each q.tags as t}<span class="tag">{t}</span>{/each}</div>{/if}
          <div class="q-actions">
            {#if q.status === 'active'}
              <a href="#/assess/{q.id}" class="assess-link">Assess</a>
            {/if}
            <button onclick={() => openEdit(q)}>Edit</button>
            <button onclick={() => handleCopy(q)}>Copy</button>
            {#if q.status === 'active'}<button onclick={() => handleDeactivate(q)}>Deactivate</button>{/if}
            {#if q.status === 'inactive'}<button onclick={() => handleReactivate(q)}>Reactivate</button>{/if}
            {#if q.status !== 'deleted'}<button class="del-btn" onclick={() => handleDelete(q)}>Delete</button>{/if}
            {#if q.status === 'deleted'}<button onclick={() => handleRestore(q)}>Restore</button>{/if}
          </div>
        </div>
      {:else}
        <p class="empty">No questions found.</p>
      {/each}
    </div>
  {/if}
</section>

<style>
  .qm { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }
  .qm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  h2 { margin: 0; }
  .new-btn { padding: 0.5rem 1rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  .filters { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
  .filters select { padding: 0.3rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 4px; color: #f8f8f2; }
  .filters label { font-size: 0.85rem; color: #ccc; display: flex; align-items: center; gap: 0.3rem; }
  .error { color: #ff5555; }
  .loading, .empty { color: #888; text-align: center; padding: 2rem; }
  .form-card { background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .form-card h3 { margin: 0 0 1rem; color: #8be9fd; }
  .form-grid { display: flex; flex-direction: column; gap: 0.8rem; }
  .form-grid label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: #ccc; }
  .form-grid input, .form-grid select, .form-grid textarea { padding: 0.4rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 4px; color: #f8f8f2; font-size: 0.9rem; font-family: inherit; }
  .form-row { display: flex; gap: 0.8rem; }
  .form-row label { flex: 1; }
  .form-row input { width: 100%; }
  .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
  .save-btn { padding: 0.4rem 1rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  .cancel-btn { padding: 0.4rem 1rem; background: #44475a; color: #f8f8f2; border: none; border-radius: 6px; cursor: pointer; }
  .q-list { display: flex; flex-direction: column; gap: 0.8rem; }
  .q-card { background: #282a36; border: 1px solid #44475a; border-radius: 8px; padding: 1rem; }
  .q-card.inactive { opacity: 0.6; }
  .q-card.deleted { opacity: 0.4; border-color: #ff5555; }
  .q-top { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .q-type { font-size: 0.7rem; font-weight: 600; background: #6272a4; padding: 0.1rem 0.4rem; border-radius: 8px; color: #f8f8f2; text-transform: uppercase; }
  .q-difficulty { font-size: 0.7rem; font-weight: 600; background: #ffb86c; padding: 0.1rem 0.4rem; border-radius: 8px; color: #282a36; }
  .q-points { font-size: 0.7rem; color: #888; }
  .q-status { font-size: 0.65rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 8px; text-transform: uppercase; }
  .q-status.active { background: #50fa7b; color: #282a36; }
  .q-status.inactive { background: #44475a; color: #ccc; }
  .q-status.deleted { background: #ff5555; color: #fff; }
  .q-text { margin: 0 0 0.3rem; font-size: 0.9rem; color: #f8f8f2; }
  .q-explain { margin: 0 0 0.3rem; font-size: 0.8rem; color: #888; font-style: italic; }
  .q-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
  .tag { font-size: 0.65rem; background: #44475a; padding: 0.1rem 0.4rem; border-radius: 8px; color: #ccc; }
  .q-actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .q-actions button { padding: 0.2rem 0.5rem; background: none; border: 1px solid #44475a; color: #ccc; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  .q-actions button:hover { border-color: #8be9fd; color: #8be9fd; }
  .del-btn { border-color: #ff5555 !important; color: #ff5555 !important; }
  .assess-link { padding: 0.2rem 0.5rem; background: none; border: 1px solid #50fa7b; color: #50fa7b; border-radius: 4px; cursor: pointer; font-size: 0.75rem; text-decoration: none; }
  .assess-link:hover { background: rgba(80, 250, 123, 0.1); }
</style>
