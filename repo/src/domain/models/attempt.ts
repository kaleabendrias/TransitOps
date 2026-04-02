export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface Attempt {
  readonly id: string;
  readonly questionId: string;
  readonly userId: string;
  readonly answer: string;
  readonly status: AttemptStatus;
  readonly submittedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createAttempt(params: {
  questionId: string;
  userId: string;
}): Attempt {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    questionId: params.questionId,
    userId: params.userId,
    answer: '',
    status: 'in_progress',
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function submitAttempt(attempt: Attempt, answer: string): Attempt {
  return { ...attempt, answer, status: 'submitted', submittedAt: Date.now(), updatedAt: Date.now() };
}
