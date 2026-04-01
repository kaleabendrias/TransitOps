export type QuestionType = 'multiple_choice' | 'single_choice' | 'true_false' | 'fill_in_the_blank' | 'short_answer' | 'essay';
export type QuestionStatus = 'active' | 'inactive' | 'deleted';

export interface Question {
  readonly id: string;
  readonly catalogId: string;
  readonly text: string;
  readonly type: QuestionType;
  readonly options: string[];
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly points: number;
  readonly difficulty: number; // 1-5
  readonly score: number;     // 0-100
  readonly tags: string[];
  readonly knowledgePoints: string[];
  readonly departmentIds: string[];
  readonly status: QuestionStatus;
  readonly copiedFromId: string | null;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly deletedAt: number | null;
}

export function createQuestion(params: {
  catalogId: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  difficulty?: number;
  score?: number;
  tags?: string[];
  knowledgePoints?: string[];
  departmentIds?: string[];
  createdBy: string;
}): Question {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    catalogId: params.catalogId,
    text: params.text,
    type: params.type,
    options: params.options ?? [],
    correctAnswer: params.correctAnswer,
    explanation: params.explanation ?? '',
    points: params.points ?? 1,
    difficulty: Math.min(5, Math.max(1, params.difficulty ?? 3)),
    score: Math.min(100, Math.max(0, params.score ?? 0)),
    tags: params.tags ?? [],
    knowledgePoints: params.knowledgePoints ?? [],
    departmentIds: params.departmentIds ?? [],
    status: 'active',
    copiedFromId: null,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function copyQuestion(original: Question, createdBy: string): Question {
  const now = Date.now();
  return {
    ...original,
    id: crypto.randomUUID(),
    copiedFromId: original.id,
    status: 'active',
    createdBy,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function deactivateQuestion(q: Question): Question {
  return { ...q, status: 'inactive', updatedAt: Date.now() };
}

export function reactivateQuestion(q: Question): Question {
  return { ...q, status: 'active', updatedAt: Date.now() };
}

export function softDeleteQuestion(q: Question): Question {
  return { ...q, status: 'deleted', deletedAt: Date.now(), updatedAt: Date.now() };
}

export function restoreQuestion(q: Question): Question {
  return { ...q, status: 'active', deletedAt: null, updatedAt: Date.now() };
}

export function updateQuestion(q: Question, updates: Partial<Pick<
  Question, 'text' | 'type' | 'options' | 'correctAnswer' | 'explanation' |
  'points' | 'difficulty' | 'score' | 'tags' | 'knowledgePoints' | 'departmentIds' | 'catalogId'
>>): Question {
  return { ...q, ...updates, updatedAt: Date.now() };
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  single_choice: 'Single Choice',
  true_false: 'True / False',
  fill_in_the_blank: 'Fill in the Blank',
  short_answer: 'Short Answer',
  essay: 'Essay',
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very Hard',
};
