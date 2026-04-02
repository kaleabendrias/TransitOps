<script lang="ts">
  import { onMount } from 'svelte';
  import type { Grade } from '@domain/models/grade';
  import { roundToHalf, SECOND_REVIEW_THRESHOLD } from '@domain/policies/grading-policy';
  import { gradingService } from '@services/container';
  import { currentUserId } from '../stores/auth-store';
  import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';

  const gradeRepo = new GradeRepositoryIDB();

  let recentGrades = $state<Grade[]>([]);
  let secondReviewGrades = $state<Grade[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Second review form
  let reviewingGrade = $state<Grade | null>(null);
  let reviewScore = $state(0);
  let reviewFeedback = $state('');

  async function loadData() {
    loading = true;
    try {
      const myGrades = await gradeRepo.getByReviewer($currentUserId ?? '');
      recentGrades = myGrades.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
      // Fetch ALL grades requiring second review (not just this reviewer's)
      secondReviewGrades = await gradingService.getGradesRequiringSecondReview();
    } catch (e) { error = e instanceof Error ? e.message : 'Failed to load'; }
    finally { loading = false; }
  }

  onMount(loadData);

  function startSecondReview(grade: Grade) {
    reviewingGrade = grade;
    reviewScore = 0; reviewFeedback = '';
  }

  async function submitSecondReview() {
    if (!reviewingGrade || !$currentUserId) return;
    error = '';
    try {
      await gradingService.submitSecondReview(reviewingGrade.id, $currentUserId, roundToHalf(reviewScore), reviewFeedback);
      reviewingGrade = null;
      await loadData();
    } catch (e) { error = e instanceof Error ? e.message : 'Second review failed'; }
  }
</script>

<section class="grading">
  <h2>Grading Workflow</h2>
  {#if error}<p class="error">{error}</p>{/if}

  {#if secondReviewGrades.length > 0}
    <div class="section">
      <h3>Requires Second Review (score change &gt; {SECOND_REVIEW_THRESHOLD} pts)</h3>
      {#each secondReviewGrades as grade (grade.id)}
        <div class="grade-card warning">
          <p>Attempt: {grade.attemptId.slice(0,8)}... | Original: {grade.score}/{grade.maxScore} | Type: {grade.questionType}</p>
          <p>Feedback: {grade.feedback}</p>
          <button onclick={() => startSecondReview(grade)}>Submit Second Review</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if reviewingGrade}
    <div class="form-card">
      <h3>Second Review</h3>
      <p>Original score: {reviewingGrade.score}/{reviewingGrade.maxScore}</p>
      <label>Score (0.5 increments) <input type="number" bind:value={reviewScore} min="0" max={reviewingGrade.maxScore} step="0.5" /></label>
      <label>Feedback <textarea bind:value={reviewFeedback} rows="2"></textarea></label>
      <div class="form-actions">
        <button class="cancel" onclick={() => reviewingGrade = null}>Cancel</button>
        <button class="submit" onclick={submitSecondReview}>Submit Second Review</button>
      </div>
    </div>
  {/if}

  <div class="section">
    <h3>Recent Grades</h3>
    {#if loading}
      <p class="loading">Loading...</p>
    {:else if recentGrades.length === 0}
      <p class="empty">No grades yet.</p>
    {:else}
      <table>
        <thead><tr><th>Attempt</th><th>Score</th><th>Final</th><th>Type</th><th>Weight</th><th>Auto</th><th>2nd Review</th><th>Date</th></tr></thead>
        <tbody>
          {#each recentGrades as g (g.id)}
            <tr class:needs-review={g.requiresSecondReview}>
              <td>{g.attemptId.slice(0,8)}...</td>
              <td>{g.score}/{g.maxScore}</td>
              <td>{g.finalScore}</td>
              <td>{g.questionType}</td>
              <td>{g.weight}x</td>
              <td>{g.isAutoScored ? 'Yes' : 'No'}</td>
              <td>{g.requiresSecondReview ? 'PENDING' : g.secondReviewScore !== null ? `${g.secondReviewScore}` : '—'}</td>
              <td>{new Date(g.createdAt).toLocaleDateString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
  .grading { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }
  h2 { margin: 0 0 1.5rem; }
  h3 { margin: 0 0 0.8rem; color: #8be9fd; font-size: 1rem; }
  .section { margin-bottom: 2rem; }
  .error { color: #ff5555; }
  .loading, .empty { color: #888; text-align: center; padding: 1rem; }
  .grade-card { background: #282a36; border: 1px solid #44475a; border-radius: 8px; padding: 0.8rem; margin-bottom: 0.5rem; }
  .grade-card.warning { border-color: #ffb86c; }
  .grade-card p { margin: 0.2rem 0; font-size: 0.85rem; color: #ccc; }
  .grade-card button { margin-top: 0.5rem; padding: 0.3rem 0.6rem; background: #ffb86c; color: #282a36; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
  .form-card { background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .form-card label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: #ccc; margin-bottom: 0.5rem; }
  .form-card input, .form-card textarea { padding: 0.4rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 4px; color: #f8f8f2; font-family: inherit; }
  .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.8rem; }
  .cancel { padding: 0.4rem 0.8rem; background: #44475a; color: #f8f8f2; border: none; border-radius: 6px; cursor: pointer; }
  .submit { padding: 0.4rem 0.8rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { text-align: left; padding: 0.4rem; border-bottom: 2px solid #44475a; color: #8be9fd; }
  td { padding: 0.3rem 0.4rem; border-bottom: 1px solid #333; color: #ccc; }
  tr.needs-review { background: rgba(255, 184, 108, 0.1); }
</style>
