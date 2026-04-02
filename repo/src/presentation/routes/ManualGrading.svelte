<script lang="ts">
  import { onMount } from 'svelte';
  import type { Attempt } from '@domain/models/attempt';
  import type { Question } from '@domain/models/question';
  import type { Grade } from '@domain/models/grade';
  import { QUESTION_TYPE_LABELS } from '@domain/models/question';
  import { gradingService, questionService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';
  import { push } from 'svelte-spa-router';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'reviewer') as UserRole }; }

  interface Props {
    params: { id: string };
  }
  let { params }: Props = $props();

  let attempt = $state<Attempt | null>(null);
  let question = $state<Question | null>(null);
  let existingGrade = $state<Grade | null>(null);
  let loading = $state(true);
  let error = $state('');
  let submitting = $state(false);
  let graded = $state(false);

  let score = $state(0);
  let feedback = $state('');
  let comments = $state('');

  onMount(async () => {
    try {
      attempt = await gradingService.getAttempt(params.id);
      if (!attempt) { error = 'Attempt not found'; return; }
      question = await questionService.get(attempt.questionId);
      if (!question) { error = 'Question not found'; return; }
      existingGrade = await gradingService.getDecryptedGradeByAttempt(attempt.id);
      if (existingGrade) {
        score = existingGrade.score;
        feedback = existingGrade.feedback;
        comments = existingGrade.comments;
      }
    } catch (e) { error = e instanceof Error ? e.message : 'Failed to load'; }
    finally { loading = false; }
  });

  async function handleGrade() {
    if (!attempt || !question || !$currentUserId) return;
    submitting = true;
    error = '';
    try {
      await gradingService.manualGrade({
        attemptId: attempt.id,
        reviewerId: $currentUserId,
        score,
        maxScore: question.points,
        feedback,
        comments: comments || undefined,
      }, getActor());
      graded = true;
    } catch (e) { error = e instanceof Error ? e.message : 'Grading failed'; }
    finally { submitting = false; }
  }
</script>

<section class="manual-grade">
  <a href="#/grading" class="back">&larr; Back to Grading</a>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if graded}
    <div class="result-card">
      <h2>Grade Submitted</h2>
      <p>Score: <strong>{score}/{question?.points}</strong></p>
      <button class="back-btn" onclick={() => push('/grading')}>Back to Grading</button>
    </div>
  {:else if attempt && question}
    <div class="grade-card">
      <div class="attempt-info">
        <h2>Manual Grading</h2>
        <div class="q-meta">
          <span class="q-type">{QUESTION_TYPE_LABELS[question.type]}</span>
          <span class="q-points">{question.points} pts</span>
        </div>
        <h3>Question</h3>
        <p class="q-text">{question.text}</p>
        {#if question.correctAnswer}
          <p class="correct-answer">Expected Answer: {question.correctAnswer}</p>
        {/if}
        <h3>Student Answer</h3>
        <div class="student-answer">{attempt.answer || '(no answer provided)'}</div>
      </div>

      <div class="grading-form">
        <label>
          Score (0 – {question.points})
          <input type="number" bind:value={score} min="0" max={question.points} step="0.5" />
        </label>
        <label>
          Feedback
          <textarea bind:value={feedback} rows="3" placeholder="Provide feedback to the student..."></textarea>
        </label>
        <label>
          Comments (internal)
          <textarea bind:value={comments} rows="2" placeholder="Internal grader notes (optional)..."></textarea>
        </label>
        <button class="submit-btn" onclick={handleGrade} disabled={submitting}>
          {submitting ? 'Submitting...' : existingGrade ? 'Update Grade' : 'Submit Grade'}
        </button>
      </div>
    </div>
  {/if}
</section>

<style>
  .manual-grade { padding: 1.5rem; max-width: 700px; margin: 0 auto; }
  .back { color: #8be9fd; text-decoration: none; font-size: 0.9rem; }
  .back:hover { text-decoration: underline; }
  .loading { color: #888; text-align: center; padding: 2rem; }
  .error { color: #ff5555; }
  .grade-card, .result-card { background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 1.5rem; margin-top: 1rem; }
  h2 { margin: 0 0 0.8rem; }
  h3 { color: #8be9fd; margin: 1rem 0 0.3rem; font-size: 0.95rem; }
  .q-meta { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .q-type { font-size: 0.7rem; font-weight: 600; background: #6272a4; padding: 0.1rem 0.4rem; border-radius: 8px; color: #f8f8f2; text-transform: uppercase; }
  .q-points { font-size: 0.75rem; color: #8be9fd; }
  .q-text { color: #f8f8f2; font-size: 0.95rem; margin: 0 0 0.5rem; }
  .correct-answer { color: #50fa7b; font-size: 0.85rem; font-style: italic; margin: 0 0 0.5rem; }
  .student-answer { background: #1a1a2e; border: 1px solid #44475a; border-radius: 6px; padding: 0.8rem; color: #f8f8f2; font-size: 0.9rem; white-space: pre-wrap; margin-bottom: 1rem; }
  .grading-form { border-top: 1px solid #44475a; padding-top: 1rem; }
  .grading-form label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: #ccc; margin-bottom: 0.8rem; }
  .grading-form input, .grading-form textarea { padding: 0.5rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 6px; color: #f8f8f2; font-family: inherit; font-size: 0.9rem; }
  .submit-btn { width: 100%; padding: 0.6rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .back-btn { padding: 0.5rem 1rem; background: #44475a; color: #f8f8f2; border: none; border-radius: 6px; cursor: pointer; margin-top: 0.5rem; }
</style>
