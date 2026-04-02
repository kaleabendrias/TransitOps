import type { Grade } from '@domain/models/grade';
import { createGrade, updateGradeScore, addSecondReview, flagForSecondReview } from '@domain/models/grade';
import type { Attempt } from '@domain/models/attempt';
import { submitAttempt } from '@domain/models/attempt';
import type { Question } from '@domain/models/question';
import type { GradeRepository } from '@domain/ports/grade-repository';
import type { AttemptRepository } from '@domain/ports/attempt-repository';
import type { QuestionRepository } from '@domain/ports/question-repository';
import type { PreferencesRepository } from '@domain/ports/preferences-repository';
import { DEFAULT_GRADING_CONFIG } from '@domain/ports/preferences-repository';
import {
  isAutoScorable, autoScore, clampGradeScore, getTypeWeight,
  computeWeightedScore, requiresSecondReview, validateGradeScore,
} from '@domain/policies/grading-policy';
import type { CryptoStorageService } from './crypto-storage-service';

const SCRUBBED = '[encrypted]';

export class GradingService {
  constructor(
    private readonly gradeRepo: GradeRepository,
    private readonly attemptRepo: AttemptRepository,
    private readonly questionRepo: QuestionRepository,
    private readonly cryptoStore?: CryptoStorageService,
    private readonly prefsRepo?: PreferencesRepository
  ) {}

  private get gradingConfig() {
    if (!this.prefsRepo) return DEFAULT_GRADING_CONFIG;
    return this.prefsRepo.get().gradingConfig ?? DEFAULT_GRADING_CONFIG;
  }

  private get increment() { return this.gradingConfig.roundingIncrement; }

  async submitAndAutoScore(attemptId: string, answer: string): Promise<{ attempt: Attempt; grade: Grade | null }> {
    const attempt = await this.attemptRepo.getById(attemptId);
    if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

    const question = await this.questionRepo.getById(attempt.questionId);
    if (!question) throw new Error(`Question ${attempt.questionId} not found`);

    const submitted = submitAttempt(attempt, answer);
    await this.attemptRepo.save(submitted);

    if (isAutoScorable(question.type)) {
      const score = autoScore(question, answer);
      const grade = createGrade({
        attemptId,
        questionId: question.id,
        reviewerId: 'system',
        score,
        maxScore: question.points,
        feedback: score === question.points ? 'Correct' : `Incorrect. Expected: ${question.correctAnswer}`,
        isAutoScored: true,
        questionType: question.type,
        weight: getTypeWeight(question.type, this.gradingConfig),
      });
      await this.saveGradeWithEncryption(grade);
      await this.attemptRepo.save({ ...submitted, status: 'graded', updatedAt: Date.now() });
      return { attempt: submitted, grade };
    }

    return { attempt: submitted, grade: null };
  }

  async manualGrade(params: {
    attemptId: string;
    reviewerId: string;
    score: number;
    maxScore: number;
    feedback: string;
    comments?: string;
  }): Promise<Grade> {
    const inc = this.increment;
    const clamped = clampGradeScore(params.score, params.maxScore, inc);
    const error = validateGradeScore(clamped, params.maxScore, inc);
    if (error) throw new Error(error);

    const question = await this.getQuestionForAttempt(params.attemptId);

    const existing = await this.gradeRepo.getByAttempt(params.attemptId);
    if (existing) {
      const updated = updateGradeScore(existing, clamped, params.feedback);
      if (requiresSecondReview(existing.score, clamped)) {
        const flagged = flagForSecondReview(updated);
        await this.saveGradeWithEncryption(flagged);
        return flagged;
      }
      await this.saveGradeWithEncryption(updated);
      return updated;
    }

    const grade = createGrade({
      attemptId: params.attemptId,
      questionId: question.id,
      reviewerId: params.reviewerId,
      score: clamped,
      maxScore: params.maxScore,
      feedback: params.feedback,
      comments: params.comments,
      questionType: question.type,
      weight: getTypeWeight(question.type, this.gradingConfig),
    });
    await this.saveGradeWithEncryption(grade);

    await this.attemptRepo.save({
      ...(await this.attemptRepo.getById(params.attemptId))!,
      status: 'graded',
      updatedAt: Date.now(),
    });

    return grade;
  }

  async submitSecondReview(gradeId: string, reviewerId: string, score: number, feedback: string): Promise<Grade> {
    const grade = await this.gradeRepo.getById(gradeId);
    if (!grade) throw new Error(`Grade ${gradeId} not found`);
    if (!grade.requiresSecondReview) throw new Error('Grade does not require second review');

    const clamped = clampGradeScore(score, grade.maxScore, this.increment);
    const updated = addSecondReview(grade, reviewerId, clamped, feedback);
    await this.saveGradeWithEncryption(updated);
    return updated;
  }

  async getGradesRequiringSecondReview(): Promise<Grade[]> {
    return this.gradeRepo.getAllRequiringSecondReview();
  }

  async computeOverallScore(attemptIds: string[]): Promise<number> {
    const grades: Grade[] = [];
    for (const id of attemptIds) {
      const g = await this.gradeRepo.getByAttempt(id);
      if (g) grades.push(g);
    }
    return computeWeightedScore(grades, this.increment);
  }

  private async saveGradeWithEncryption(grade: Grade): Promise<void> {
    if (this.cryptoStore && (grade.feedback || grade.comments)) {
      await this.cryptoStore.encrypt(`grade:${grade.id}`, JSON.stringify({
        feedback: grade.feedback,
        comments: grade.comments,
        secondReviewFeedback: grade.secondReviewFeedback,
      }));
      const scrubbed = {
        ...grade,
        feedback: SCRUBBED,
        comments: SCRUBBED,
        secondReviewFeedback: grade.secondReviewFeedback ? SCRUBBED : null,
      };
      await this.gradeRepo.save(scrubbed);
    } else {
      await this.gradeRepo.save(grade);
    }
  }

  private async getQuestionForAttempt(attemptId: string): Promise<Question> {
    const attempt = await this.attemptRepo.getById(attemptId);
    if (!attempt) throw new Error(`Attempt ${attemptId} not found`);
    const question = await this.questionRepo.getById(attempt.questionId);
    if (!question) throw new Error(`Question ${attempt.questionId} not found`);
    return question;
  }
}
