export const MAX_INTERVIEW_QUESTION_CODE_UNITS = 280;

export type InterviewQuestionValidationError =
  | 'empty'
  | 'too_long'
  | 'multiple_questions'
  | 'unsafe_format';

export const validateInterviewQuestion = (
  raw: string,
): { ok: true; question: string } | { ok: false; error: InterviewQuestionValidationError } => {
  const question = raw.trim();
  if (!question) return { ok: false, error: 'empty' };
  if (question.length > MAX_INTERVIEW_QUESTION_CODE_UNITS) {
    return { ok: false, error: 'too_long' };
  }
  if (
    /```|<\/?[a-z][^>]*>|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/iu.test(question) ||
    /^\s*(?:[-*#]|\d+[.)])\s/mu.test(question) ||
    /\r|\n/u.test(question) ||
    /^(?:system|assistant|tool)\s*:/iu.test(question) ||
    /\b(?:ignore (?:all )?(?:previous|prior) instructions|(?:set|change|mark|advance|skip|complete|cancel) (?:the )?(?:app|application|session|interview|phase|status|state))\b/iu.test(
      question,
    ) ||
    /(?:忽略(?:之前|先前)?指令|(?:设置|修改|更改|跳转|切换|标记|结束|取消).{0,8}(?:应用状态|会话状态|访谈状态|阶段状态|当前阶段|下一阶段|会话|访谈))/u.test(
      question,
    )
  ) {
    return { ok: false, error: 'unsafe_format' };
  }
  const questionMarks = question.match(/[?？]/gu)?.length ?? 0;
  if (questionMarks !== 1 || !/[?？]$/u.test(question)) {
    return { ok: false, error: 'multiple_questions' };
  }
  return { ok: true, question };
};
