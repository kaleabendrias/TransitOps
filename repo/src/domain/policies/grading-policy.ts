import type { Question, QuestionType } from '../models/question';
import type { Grade } from '../models/grade';
import type { GradingConfig } from '../ports/preferences-repository';
import { DEFAULT_GRADING_CONFIG } from '../ports/preferences-repository';

// --- Auto-scoring for objective questions ---

export function isAutoScorable(questionType: QuestionType): boolean {
  return questionType === 'multiple_choice' || questionType === 'true_false'
    || questionType === 'single_choice' || questionType === 'fill_in_the_blank';
}

/** Parses a possibly comma-separated answer string into a sorted, deduplicated set. */
function parseAnswerSet(raw: string): string[] {
  return [...new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))].sort();
}

export function autoScore(question: Question, answer: string): number {
  if (!isAutoScorable(question.type)) return 0;

  if (question.type === 'multiple_choice') {
    const correctSet = parseAnswerSet(question.correctAnswer);
    const givenSet = parseAnswerSet(answer);
    if (correctSet.length !== givenSet.length) return 0;
    const match = correctSet.every((v, i) => v === givenSet[i]);
    return match ? question.points : 0;
  }

  const correct = question.correctAnswer.trim().toLowerCase();
  const given = answer.trim().toLowerCase();
  return correct === given ? question.points : 0;
}

// --- Configurable rounding ---

export function roundToIncrement(score: number, increment: number = 0.5): number {
  if (increment <= 0) return score;
  return Math.round(score / increment) * increment;
}

/** Legacy alias — rounds to 0.5 by default. */
export function roundToHalf(score: number): number {
  return roundToIncrement(score, 0.5);
}

export function clampGradeScore(score: number, maxScore: number, increment: number = 0.5): number {
  return roundToIncrement(Math.max(0, Math.min(maxScore, score)), increment);
}

// --- Configurable question type weights ---

export function getTypeWeight(questionType: QuestionType, cfg: GradingConfig = DEFAULT_GRADING_CONFIG): number {
  return cfg.typeWeights[questionType] ?? 1.0;
}

export function computeWeightedScore(grades: Grade[], increment: number = 0.5): number {
  if (grades.length === 0) return 0;
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const g of grades) {
    const pct = g.maxScore > 0 ? g.finalScore / g.maxScore : 0;
    totalWeighted += pct * g.weight;
    totalWeight += g.weight;
  }
  if (totalWeight === 0) return 0;
  return roundToIncrement((totalWeighted / totalWeight) * 100, increment);
}

// --- Second review policy ---

export const SECOND_REVIEW_THRESHOLD = 10;

export function requiresSecondReview(
  originalScore: number,
  newScore: number
): boolean {
  return Math.abs(newScore - originalScore) > SECOND_REVIEW_THRESHOLD;
}

export function validateGradeScore(score: number, maxScore: number, increment: number = 0.5): string | null {
  if (score < 0) return 'Score cannot be negative';
  if (score > maxScore) return `Score cannot exceed ${maxScore}`;
  if (roundToIncrement(score, increment) !== score) return `Score must be in ${increment}-point increments`;
  return null;
}
