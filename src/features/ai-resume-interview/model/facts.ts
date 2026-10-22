import { z } from 'zod';

import type { InterviewAnswer, InterviewSession } from './types';

export const MAX_FACTS_PER_EXTRACTION = 60;
export const MAX_FACT_VALUE_LENGTH = 600;
export const MAX_FACT_INPUT_ANSWERS = 12;
export const MAX_FACT_INPUT_CODE_UNITS = 6000;
export const FACT_EXTRACTION_TIMEOUT_MS = 30_000;

const factTextSchema = z.string().trim().min(1).max(MAX_FACT_VALUE_LENGTH);
const stringListSchema = z.array(factTextSchema).max(12).optional();

const candidateValueSchemas = {
  targetRole: factTextSchema,
  personal: z
    .object({
      fullName: factTextSchema.optional(),
      email: factTextSchema.optional(),
      phone: factTextSchema.optional(),
      location: factTextSchema.optional(),
      summary: factTextSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0),
  experience: z
    .object({
      company: factTextSchema.optional(),
      role: factTextSchema.optional(),
      location: factTextSchema.optional(),
      startDate: factTextSchema.optional(),
      endDate: factTextSchema.optional(),
      responsibilities: stringListSchema,
      individualResponsibilities: stringListSchema,
      teamResponsibilities: stringListSchema,
      achievements: stringListSchema,
    })
    .strict()
    .refine((value) =>
      Object.values(value).some((item) => (Array.isArray(item) ? item.length > 0 : Boolean(item))),
    ),
  project: z
    .object({
      name: factTextSchema.optional(),
      role: factTextSchema.optional(),
      summary: factTextSchema.optional(),
      link: factTextSchema.optional(),
      responsibilities: stringListSchema,
      individualResponsibilities: stringListSchema,
      teamResponsibilities: stringListSchema,
      achievements: stringListSchema,
    })
    .strict()
    .refine((value) =>
      Object.values(value).some((item) => (Array.isArray(item) ? item.length > 0 : Boolean(item))),
    ),
  education: z
    .object({
      school: factTextSchema.optional(),
      degree: factTextSchema.optional(),
      startDate: factTextSchema.optional(),
      endDate: factTextSchema.optional(),
      details: factTextSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0),
  skill: factTextSchema,
} as const;

export const factKindSchema = z.enum([
  'targetRole',
  'personal',
  'experience',
  'project',
  'education',
  'skill',
]);

const candidateSchemaFor = <K extends keyof typeof candidateValueSchemas>(kind: K) =>
  z
    .object({
      kind: z.literal(kind),
      sourceQuestionId: z.string().min(1).max(160),
      sourceAnswerId: z.string().min(1).max(200),
      value: candidateValueSchemas[kind],
    })
    .strict();

export const factCandidateSchema = z.discriminatedUnion('kind', [
  candidateSchemaFor('targetRole'),
  candidateSchemaFor('personal'),
  candidateSchemaFor('experience'),
  candidateSchemaFor('project'),
  candidateSchemaFor('education'),
  candidateSchemaFor('skill'),
]);

export const factExtractionResponseSchema = z
  .object({ facts: z.array(factCandidateSchema).max(MAX_FACTS_PER_EXTRACTION) })
  .strict();

export const factStatusSchema = z.enum(['pending', 'confirmed', 'rejected', 'conflict', 'stale']);

export type FactKind = z.infer<typeof factKindSchema>;
export type FactCandidate = z.infer<typeof factCandidateSchema>;
export type FactValueByKind = {
  [K in FactKind]: Extract<FactCandidate, { kind: K }>['value'];
};

export type ResumeFact = {
  id: string;
  kind: FactKind;
  value: FactValueByKind[FactKind];
  sourceQuestionId: string;
  sourceAnswerId: string;
  sessionId: string;
  status: z.infer<typeof factStatusSchema>;
  extractedAt: number;
  updatedAt: number;
  sourceAnswerVersion: number;
  sourceFingerprint: string;
  conflictKey?: string;
  conflictKeys?: string[];
  origin: 'ai' | 'manual';
};

export type FactSource = {
  answer: InterviewAnswer;
  question: InterviewSession['questions'][number];
};

export const getAnswerId = (answer: InterviewAnswer): string =>
  answer.id ?? `${answer.questionId}:answer`;

export type FactExtractionErrorCode =
  | 'invalid_json'
  | 'invalid_schema'
  | 'unknown_source'
  | 'ungrounded_value'
  | 'no_answers'
  | 'too_many_answers'
  | 'input_too_long'
  | 'provider_not_configured'
  | 'provider_error'
  | 'provider_changed'
  | 'cancelled'
  | 'timeout';

export class FactExtractionError extends Error {
  readonly code: FactExtractionErrorCode;

  constructor(code: FactExtractionErrorCode) {
    super(code);
    this.name = 'FactExtractionError';
    this.code = code;
  }
}

export const getAnswerFingerprint = (answer: InterviewAnswer): string => {
  const input = `${getAnswerId(answer)}\u0000${answer.questionId}\u0000${answer.updatedAt}\u0000${answer.skipped ? '1' : '0'}\u0000${answer.text}`;
  let hash = 0xcb_f2_9c_e4_84_22_23_25n;
  for (const codePoint of input) {
    hash ^= BigInt(codePoint.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x1_00_00_00_01_b3n);
  }
  return `fnv1a64-${hash.toString(16).padStart(16, '0')}`;
};

const normalizeForMatch = (value: string): string =>
  value.normalize('NFKC').replaceAll(/\s+/gu, ' ').trim();

const eachTextValue = (kind: FactKind, value: unknown): string[] => {
  if (kind === 'targetRole' || kind === 'skill') return typeof value === 'string' ? [value] : [];
  if (!value || typeof value !== 'object') return [];
  const values: string[] = [];
  for (const item of Object.values(value)) {
    if (typeof item === 'string') values.push(item);
    else if (Array.isArray(item)) {
      for (const entry of item) if (typeof entry === 'string') values.push(entry);
    }
  }
  return values;
};

export const getFactSource = (
  session: InterviewSession,
  fact: Pick<ResumeFact, 'sourceAnswerId' | 'sourceQuestionId'>,
): FactSource | null => {
  const answer = session.answers.find(
    (item) =>
      getAnswerId(item) === fact.sourceAnswerId && item.questionId === fact.sourceQuestionId,
  );
  const question = session.questions.find((item) => item.id === fact.sourceQuestionId);
  if (!answer || answer.skipped || !answer.text.trim() || !question) return null;
  return { answer, question };
};

export const isFactCurrent = (session: InterviewSession, fact: ResumeFact): boolean => {
  if (fact.sessionId !== session.id) return false;
  const source = getFactSource(session, fact);
  return Boolean(
    source &&
      source.answer.updatedAt === fact.sourceAnswerVersion &&
      getAnswerFingerprint(source.answer) === fact.sourceFingerprint,
  );
};

type FactConflictValue = { key: string; value: string };

const normalizedIdentity = (values: Array<string | undefined>): string =>
  values
    .map((value) => normalizeForMatch(value ?? ''))
    .filter(Boolean)
    .join('|');

const getFactConflictValues = (fact: ResumeFact): FactConflictValue[] => {
  if (fact.kind === 'targetRole' && typeof fact.value === 'string') {
    return [{ key: 'targetRole', value: normalizeForMatch(fact.value) }];
  }
  if (!fact.value || typeof fact.value !== 'object') return [];

  const value = fact.value as Record<string, unknown>;
  if (fact.kind === 'personal') {
    return (['fullName', 'email', 'phone', 'location'] as const).flatMap((key) => {
      const fieldValue = value[key];
      return typeof fieldValue === 'string' && fieldValue.trim()
        ? [{ key: `personal.${key}`, value: normalizeForMatch(fieldValue) }]
        : [];
    });
  }

  const addStringFields = (prefix: string, identity: string, fields: string[]) =>
    fields.flatMap((field) => {
      const fieldValue = value[field];
      return identity && typeof fieldValue === 'string' && fieldValue.trim()
        ? [
            {
              key: `${prefix}:${identity}:${field}`,
              value: normalizeForMatch(fieldValue),
            },
          ]
        : [];
    });

  if (fact.kind === 'experience') {
    const identity = normalizedIdentity([
      typeof value.company === 'string' ? value.company : undefined,
      typeof value.role === 'string' ? value.role : undefined,
    ]);
    return addStringFields('experience', identity, ['location', 'startDate', 'endDate']);
  }
  if (fact.kind === 'project') {
    const identity = normalizedIdentity([typeof value.name === 'string' ? value.name : undefined]);
    return addStringFields('project', identity, ['role', 'summary', 'link']);
  }
  if (fact.kind === 'education') {
    const identity = normalizedIdentity([
      typeof value.school === 'string' ? value.school : undefined,
      typeof value.degree === 'string' ? value.degree : undefined,
    ]);
    return addStringFields('education', identity, ['startDate', 'endDate']);
  }
  return [];
};

export const markConflicts = (facts: ResumeFact[]): ResumeFact[] => {
  const next = facts.map((fact) => ({
    ...fact,
    ...(fact.status === 'conflict' ? { status: 'pending' as const } : {}),
    conflictKey: undefined,
    conflictKeys: undefined,
  }));
  const groups = new Map<string, Map<string, { fact: ResumeFact; value: string }>>();
  for (const fact of next) {
    if (fact.status === 'rejected' || fact.status === 'stale') continue;
    for (const { key, value } of getFactConflictValues(fact)) {
      const group = groups.get(key) ?? new Map();
      group.set(fact.id, { fact, value });
      groups.set(key, group);
    }
  }
  for (const [key, group] of groups) {
    const distinct = new Set([...group.values()].map(({ value }) => value));
    if (distinct.size < 2) continue;
    for (const { fact } of group.values()) {
      fact.status = 'conflict';
      fact.conflictKey ??= key;
      fact.conflictKeys = [...(fact.conflictKeys ?? []), key];
    }
  }
  return next;
};

export const invalidateStaleFacts = (
  session: InterviewSession,
  facts: ResumeFact[],
): ResumeFact[] => {
  let changed = false;
  const next = facts.map((fact) => {
    if (fact.status === 'stale' || isFactCurrent(session, fact)) return fact;
    changed = true;
    return {
      ...fact,
      status: 'stale' as const,
      updatedAt: Date.now(),
      conflictKey: undefined,
      conflictKeys: undefined,
    };
  });
  return changed ? markConflicts(next) : facts;
};

export const createResumeFact = (
  candidate: FactCandidate,
  session: InterviewSession,
  origin: ResumeFact['origin'],
  now = Date.now(),
): ResumeFact => {
  const source = getFactSource(session, candidate);
  if (!source) throw new FactExtractionError('unknown_source');
  if (eachTextValue(candidate.kind, candidate.value).some((value) => !value.trim())) {
    throw new FactExtractionError('ungrounded_value');
  }
  if (
    origin === 'ai' &&
    eachTextValue(candidate.kind, candidate.value).some(
      (value) => !normalizeForMatch(source.answer.text).includes(normalizeForMatch(value)),
    )
  ) {
    throw new FactExtractionError('ungrounded_value');
  }
  return {
    id: `fact-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    kind: candidate.kind,
    value: candidate.value,
    sourceQuestionId: source.question.id,
    sourceAnswerId: getAnswerId(source.answer),
    sessionId: session.id,
    status: 'pending',
    extractedAt: now,
    updatedAt: now,
    sourceAnswerVersion: source.answer.updatedAt,
    sourceFingerprint: getAnswerFingerprint(source.answer),
    origin,
  };
};

export const parseFactExtractionResponse = (
  content: string,
  session: InterviewSession,
  answers: InterviewAnswer[],
  now = Date.now(),
): ResumeFact[] => {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new FactExtractionError('invalid_json');
  }
  const parsed = factExtractionResponseSchema.safeParse(raw);
  if (!parsed.success) throw new FactExtractionError('invalid_schema');
  const sourceIds = new Set(answers.map((answer) => getAnswerId(answer)));
  if (parsed.data.facts.some((candidate) => !sourceIds.has(candidate.sourceAnswerId))) {
    throw new FactExtractionError('unknown_source');
  }
  const facts = parsed.data.facts.map((candidate) =>
    createResumeFact(candidate, session, 'ai', now),
  );
  return markConflicts(facts);
};

export type FactExtractionInput = {
  answers: InterviewAnswer[];
  includedAnswers: InterviewAnswer[];
  omittedAnswerCount: number;
  totalCodeUnits: number;
};

export const selectFactExtractionInput = (session: InterviewSession): FactExtractionInput => {
  const answers = session.answers.filter((answer) => !answer.skipped && answer.text.trim());
  if (answers.length === 0) throw new FactExtractionError('no_answers');
  const newestFirst = [...answers].reverse();
  if (newestFirst.length > MAX_FACT_INPUT_ANSWERS) {
    const selected = newestFirst.slice(0, MAX_FACT_INPUT_ANSWERS);
    const total = selected.reduce((sum, answer) => sum + answer.text.length, 0);
    if (total > MAX_FACT_INPUT_CODE_UNITS) throw new FactExtractionError('input_too_long');
    return {
      answers,
      includedAnswers: selected.reverse(),
      omittedAnswerCount: answers.length - selected.length,
      totalCodeUnits: total,
    };
  }
  const totalCodeUnits = newestFirst.reduce((sum, answer) => sum + answer.text.length, 0);
  if (totalCodeUnits > MAX_FACT_INPUT_CODE_UNITS) throw new FactExtractionError('input_too_long');
  return { answers, includedAnswers: [...answers], omittedAnswerCount: 0, totalCodeUnits };
};

export const buildFactExtractionMessages = (
  session: InterviewSession,
  answers: InterviewAnswer[],
  language: 'zh-CN' | 'en',
) => {
  const questionById = new Map(session.questions.map((question) => [question.id, question]));
  const source = answers.map((answer) => ({
    questionId: answer.questionId,
    answerId: getAnswerId(answer),
    question: questionById.get(answer.questionId)?.content ?? '',
    answer: answer.text,
  }));
  const system = [
    'Extract only resume facts that are explicitly stated in the supplied interview answers.',
    'Never infer, complete, normalize, combine, or invent a company, role, date, degree, skill, achievement, number, or metric.',
    'Every value must be copied as an exact substring from one supplied answer. Do not paraphrase.',
    'Use only the supplied answerId and questionId values. Do not create source identifiers.',
    'Return one JSON object with a facts array and no additional keys or markdown.',
    'The fact kinds are targetRole, personal, experience, project, education, and skill.',
    'Use exact field names from the schema: personal(fullName,email,phone,location,summary); experience(company,role,location,startDate,endDate,responsibilities,individualResponsibilities,teamResponsibilities,achievements); project(name,role,summary,link,responsibilities,individualResponsibilities,teamResponsibilities,achievements); education(school,degree,startDate,endDate,details).',
    'Responsibilities and achievements must be arrays of exact phrases copied from a single answer. Put a responsibility in individualResponsibilities or teamResponsibilities only when the answer explicitly states that boundary; otherwise use responsibilities.',
    'If a field is not explicitly present, omit it. Do not return empty facts.',
    `Write JSON strings in ${language === 'zh-CN' ? 'the language used in each source answer' : 'the source answer language'}.`,
  ].join('\n');
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: JSON.stringify({ answers: source }) },
  ];
};

export const getFactConflictLabel = (fact: ResumeFact): string | undefined => fact.conflictKey;
