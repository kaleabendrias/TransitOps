<script lang="ts">
  import { onMount } from 'svelte';
  import type { Question } from '@domain/models/question';
  import type { Attempt } from '@domain/models/attempt';
  import type { Grade } from '@domain/models/grade';
  import { QUESTION_TYPE_LABELS } from '@domain/models/question';
  import { questionService, gradingService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';
  import { push } from 'svelte-spa-router';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  interface Props {
    params: { id: string };
  }
  let { params }: Props = $props();

  let question = $state<Question | null>(null);
  let attempt = $state<Attempt | null>(null);
  let answer = $state('');
  let selectedOptions = $state<Set<string>>(new Set());
  let result = $state<{ attempt: Attempt; grade: Grade | null } | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state('');

  let effectiveAnswer = $derived(
    question?.type === 'multiple_choice'
      ? [...selectedOptions].join(',')
      : answer
  );

  function toggleOption(opt: string) {
    const next = new Set(selectedOptions);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    selectedOptions = next;
  }

  onMount(async () => {
    try {
      question = await questionService.get(params.id);
      if (!question) { error = 'Question not found'; return; }
      if (!$currentUserId) { error = 'Not authenticated'; return; }
      attempt = await gradingService.createAttempt(question.id, $currentUserId, getActor());
    } catch (e) { error = e instanceof Error ? e.message : 'Failed to load'; }
    finally { loading = false; }
  });

  async function handleSubmit() {
    if (!attempt || !effectiveAnswer.trim()) return;
    submitting = true;
    error = '';
    try {
      result = await gradingService.submitAndAutoScore(attempt.id, effectiveAnswer.trim(), getActor());
    } catch (e) { error = e instanceof Error ? e.message : 'Submission failed'; }
    finally { submitting = false; }
  }

  function goToGrading() {
    if (result && !result.grade) {
      push(`/grade/${result.attempt.id}`);
    }
  }
</script>

<section class="assess">
  <a href="#/questions" class="back">&larr; Back to Questions</a>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if result}
    <div class="result-card">
      <h2>Submission Complete</h2>
      <p>Status: <strong>{result.attempt.status}</strong></p>
      {#if result.grade}
        <div class="auto-grade">
          <h3>Auto-Graded</h3>
          <p>Score: <strong>{result.grade.score}/{result.grade.maxScore}</strong></p>
          <p>Feedback: {result.grade.feedback}</p>
          <p class:passing={result.grade.score === result.grade.maxScore} class:failing={result.grade.score < result.grade.maxScore}>
            {result.grade.score === result.grade.maxScore ? 'Correct' : 'Incorrect'}
          </p>
        </div>
      {:else}
        <p class="manual-note">This question type requires manual grading.</p>
        <button class="grade-btn" onclick={goToGrading}>Go to Manual Grading</button>
      {/if}
      <button class="back-btn" onclick={() => push('/questions')}>Back to Questions</button>
    </div>
  {:else if question}
    <div class="question-card">
      <div class="q-meta">
        <span class="q-type">{QUESTION_TYPE_LABELS[question.type]}</span>
        <span class="q-points">{question.points} pts</span>
        <span class="q-diff">Difficulty: {question.difficulty}/5</span>
      </div>
      <h2>{question.text}</h2>
      {#if question.type === 'multiple_choice' && question.options.length > 0}
        <p class="multi-hint">Select all that apply</p>
        <div class="options">
          {#each question.options as opt}
            <label class="option-label">
              <input
                type="checkbox"
                checked={selectedOptions.has(opt)}
                onchange={() => toggleOption(opt)}
              />
              <span>{opt}</span>
            </label>
          {/each}
        </div>
      {:else if question.options.length > 0}
        <div class="options">
          {#each question.options as opt}
            <label class="option-label">
              <input
                type="radio"
                name="answer"
                value={opt}
                checked={answer === opt}
                onchange={() => answer = opt}
              />
              <span>{opt}</span>
            </label>
          {/each}
        </div>
      {:else if question.type === 'true_false'}
        <div class="options">
          <label class="option-label"><input type="radio" name="answer" value="true" checked={answer === 'true'} onchange={() => answer = 'true'} /><span>True</span></label>
          <label class="option-label"><input type="radio" name="answer" value="false" checked={answer === 'false'} onchange={() => answer = 'false'} /><span>False</span></label>
        </div>
      {:else if question.type === 'essay'}
        <textarea bind:value={answer} rows="8" placeholder="Write your essay answer..."></textarea>
      {:else}
        <input type="text" bind:value={answer} placeholder="Enter your answer" />
      {/if}

      <button class="submit-btn" onclick={handleSubmit} disabled={submitting || !effectiveAnswer.trim()}>
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  {/if}
</section>

<style>
  .assess { padding: 1.5rem; max-width: 700px; margin: 0 auto; }
  .back { color: #8be9fd; text-decoration: none; font-size: 0.9rem; }
  .back:hover { text-decoration: underline; }
  .loading, .error { text-align: center; padding: 2rem; }
  .loading { color: #888; }
  .error { color: #ff5555; }
  .question-card, .result-card { background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 1.5rem; margin-top: 1rem; }
  .q-meta { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap; }
  .q-type { font-size: 0.7rem; font-weight: 600; background: #6272a4; padding: 0.1rem 0.4rem; border-radius: 8px; color: #f8f8f2; text-transform: uppercase; }
  .q-points { font-size: 0.75rem; color: #8be9fd; }
  .q-diff { font-size: 0.75rem; color: #888; }
  .multi-hint { font-size: 0.8rem; color: #ffb86c; margin: 0 0 0.5rem; font-style: italic; }
  h2 { margin: 0 0 1rem; font-size: 1.1rem; }
  .options { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .option-label { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.8rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: #f8f8f2; }
  .option-label:hover { border-color: #8be9fd; }
  textarea, input[type="text"] { width: 100%; padding: 0.5rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 6px; color: #f8f8f2; font-family: inherit; font-size: 0.9rem; margin-bottom: 1rem; }
  .submit-btn { width: 100%; padding: 0.6rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  h3 { color: #8be9fd; margin: 0.5rem 0; }
  .auto-grade { background: #1a1a2e; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
  .auto-grade p { margin: 0.3rem 0; font-size: 0.9rem; color: #ccc; }
  .passing { color: #50fa7b !important; font-weight: 600; }
  .failing { color: #ff5555 !important; font-weight: 600; }
  .manual-note { color: #ffb86c; font-size: 0.9rem; margin: 0.5rem 0; }
  .grade-btn { padding: 0.5rem 1rem; background: #ffb86c; color: #282a36; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-right: 0.5rem; }
  .back-btn { padding: 0.5rem 1rem; background: #44475a; color: #f8f8f2; border: none; border-radius: 6px; cursor: pointer; margin-top: 0.5rem; }
</style>
