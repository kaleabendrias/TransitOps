export interface Grade {
  readonly id: string;
  readonly attemptId: string;
  readonly questionId: string;
  readonly reviewerId: string;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly comments: string;
  readonly isAutoScored: boolean;
  readonly questionType: string;
  readonly weight: number;
  readonly requiresSecondReview: boolean;
  readonly secondReviewerId: string | null;
  readonly secondReviewScore: number | null;
  readonly secondReviewFeedback: string | null;
  readonly finalScore: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createGrade(params: {
  attemptId: string;
  questionId: string;
  reviewerId: string;
  score: number;
  maxScore: number;
  feedback?: string;
  comments?: string;
  isAutoScored?: boolean;
  questionType?: string;
  weight?: number;
}): Grade {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    attemptId: params.attemptId,
    questionId: params.questionId,
    reviewerId: params.reviewerId,
    score: params.score,
    maxScore: params.maxScore,
    feedback: params.feedback ?? '',
    comments: params.comments ?? '',
    isAutoScored: params.isAutoScored ?? false,
    questionType: params.questionType ?? 'multiple_choice',
    weight: params.weight ?? 1.0,
    requiresSecondReview: false,
    secondReviewerId: null,
    secondReviewScore: null,
    secondReviewFeedback: null,
    finalScore: params.score,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateGradeScore(grade: Grade, newScore: number, feedback: string): Grade {
  return {
    ...grade,
    score: newScore,
    feedback,
    finalScore: grade.secondReviewScore !== null
      ? (newScore + grade.secondReviewScore) / 2
      : newScore,
    updatedAt: Date.now(),
  };
}

export function addSecondReview(grade: Grade, reviewerId: string, score: number, feedback: string): Grade {
  const finalScore = (grade.score + score) / 2;
  return {
    ...grade,
    secondReviewerId: reviewerId,
    secondReviewScore: score,
    secondReviewFeedback: feedback,
    finalScore,
    requiresSecondReview: false,
    updatedAt: Date.now(),
  };
}

export function flagForSecondReview(grade: Grade): Grade {
  return { ...grade, requiresSecondReview: true, updatedAt: Date.now() };
}
