import { describe, expect, it } from 'vitest';

import type { InterviewAnswer, InterviewQuestion } from '../model/types';
import {
  buildInterviewPrompt,
  InterviewAnswerBudgetError,
  MAX_INTERVIEW_ANSWER_CODE_UNITS,
  MAX_INTERVIEW_CONTEXT_CODE_UNITS,
} from './buildInterviewPrompt';

const makeQuestion = (
  id: string,
  content: string,
  phase: InterviewQuestion['phase'] = 'work',
): InterviewQuestion => ({
  id,
  content,
  phase,
  source: 'template',
  followUpIndex: 0,
  createdAt: 1,
});

describe('buildInterviewPrompt', () => {
  it('uses a bounded subset of interview answers and excludes skipped answers', () => {
    const questions = [
      makeQuestion('role', 'Target role?', 'targetRole'),
      makeQuestion('answer-a', 'Which part was yours?'),
      makeQuestion('answer-b', 'What did the team build?'),
    ];
    const answers: InterviewAnswer[] = [
      { questionId: 'role', text: 'Backend engineer', skipped: false, createdAt: 1, updatedAt: 1 },
      {
        questionId: 'answer-a',
        text: 'I independently owned the IoT backend.',
        skipped: false,
        createdAt: 2,
        updatedAt: 2,
      },
      {
        questionId: 'answer-b',
        text: 'Skipped answer must not be sent',
        skipped: true,
        createdAt: 3,
        updatedAt: 3,
      },
    ];
    const messages = buildInterviewPrompt({
      phase: 'work',
      locale: 'en',
      targetRole: 'Backend engineer',
      currentQuestion: makeQuestion('current', 'Which responsibilities were yours?'),
      questions,
      answers,
    });
    const context = JSON.parse(messages[1]?.content ?? '{}') as {
      recentAnswers: { answer: string }[];
      targetRole: string;
    };

    expect(messages[0]?.content).toContain('Preserve the user’s stated ownership boundaries');
    expect(messages[0]?.content).toContain('Never invent or imply');
    expect(context.targetRole).toBe('Backend engineer');
    expect(context.recentAnswers.map(({ answer }) => answer)).toEqual([
      'Backend engineer',
      'I independently owned the IoT backend.',
    ]);
    expect(messages.map(({ content }) => content).join(' ')).not.toContain(
      'Skipped answer must not be sent',
    );
  });

  it('preserves short answers exactly', () => {
    const answer = 'I independently owned the API reliability work.';
    const messages = buildInterviewPrompt({
      phase: 'work',
      locale: 'en',
      targetRole: 'Backend engineer',
      currentQuestion: makeQuestion('current', 'Which responsibilities were yours?'),
      questions: [makeQuestion('answer', 'What did you own?')],
      answers: [{ questionId: 'answer', text: answer, skipped: false, createdAt: 1, updatedAt: 1 }],
    });

    const context = JSON.parse(messages[1]?.content ?? '{}') as {
      recentAnswers: { answer: string }[];
    };
    expect(context.recentAnswers[0]?.answer).toBe(answer);
  });

  it('rejects over-budget answers instead of clipping them', () => {
    const longAnswer = 'x'.repeat(MAX_INTERVIEW_ANSWER_CODE_UNITS + 1);
    expect(() =>
      buildInterviewPrompt({
        phase: 'work',
        locale: 'en',
        targetRole: 'Backend engineer',
        currentQuestion: makeQuestion('current', 'Which responsibilities were yours?'),
        questions: [makeQuestion('current', 'Which responsibilities were yours?')],
        answers: [
          { questionId: 'current', text: longAnswer, skipped: false, createdAt: 1, updatedAt: 1 },
        ],
      }),
    ).toThrow(InterviewAnswerBudgetError);
  });

  it('keeps the serialized context valid and within its size limit', () => {
    const questions = Array.from({ length: 10 }, (_, index) =>
      makeQuestion(`q-${index}`, `Question ${index}: ${'q'.repeat(240)}?`),
    );
    const answers: InterviewAnswer[] = questions.map((question, index) => ({
      questionId: question.id,
      text: `${index}${'x'.repeat(MAX_INTERVIEW_ANSWER_CODE_UNITS - 1)}`,
      skipped: false,
      createdAt: index,
      updatedAt: index,
    }));
    const messages = buildInterviewPrompt({
      phase: 'work',
      locale: 'zh-CN',
      targetRole: 'Backend engineer',
      currentQuestion: questions.at(-1)!,
      questions,
      answers,
    });
    const contextText = messages[1]?.content ?? '';
    const context = JSON.parse(contextText) as { recentAnswers: { answer: string }[] };
    const sentAnswers = context.recentAnswers.map(({ answer }) => answer);

    expect(contextText.length).toBeLessThanOrEqual(MAX_INTERVIEW_CONTEXT_CODE_UNITS);
    expect(() => JSON.parse(contextText)).not.toThrow();
    expect(context.recentAnswers.length).toBeLessThanOrEqual(8);
    expect(sentAnswers).toContain(answers.at(-1)?.text);
    for (const sentAnswer of sentAnswers) {
      expect(answers.some(({ text }) => text === sentAnswer)).toBe(true);
    }
    expect(messages[0]?.content).toContain('Simplified Chinese');
  });
});
