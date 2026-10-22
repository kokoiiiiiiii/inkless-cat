import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';
import { describe, expect, it } from 'vitest';

import {
  applyResumePolishSuggestion,
  buildResumePolishFields,
  buildResumePolishRequest,
  createResumePolishSuggestions,
  parseResumePolishResponse,
} from './resumeGenerationPolish';

const makeResume = (): ResumeData => {
  const empty = createEmptyResume();
  return {
    ...empty,
    personal: {
      ...empty.personal,
      fullName: 'Lin Chen',
      email: 'lin@example.com',
      summary: 'Built reliable services using TypeScript.',
    },
    experience: [
      {
        id: 'work-1',
        company: 'BrightWorks',
        role: 'Engineer',
        location: 'Taipei',
        startDate: '2022',
        endDate: '2024',
        highlights: [
          'Personally owned: I built the import tool with TypeScript.',
          'Shared with the team: We launched 2 migration steps.',
        ],
      },
    ],
    projects: [
      {
        id: 'project-1',
        name: 'Billing project',
        role: 'Engineer',
        summary: 'Built a billing workflow.',
        link: 'https://example.com',
        highlights: [],
      },
    ],
    education: [
      {
        id: 'education-1',
        school: 'Example University',
        degree: 'Computer Science',
        startDate: '2018',
        endDate: '2022',
        details: 'Completed coursework in distributed systems.',
      },
    ],
  };
};

const serializeSuggestions = (
  fields: ReturnType<typeof buildResumePolishFields>,
  map: (text: string) => string,
) =>
  JSON.stringify({
    suggestions: fields.map(({ id, requestText }) => ({ id, text: map(requestText) })),
  });

describe('optional resume wording suggestions', () => {
  it('sends only existing narrative text and keeps ownership prefixes outside the model payload', () => {
    const resume = makeResume();
    const fields = buildResumePolishFields(resume);
    const request = buildResumePolishRequest(fields, 'en');

    expect(request.ok).toBe(true);
    if (!request.ok) return;
    const payload = JSON.parse(request.messages[1]?.content ?? '{}') as {
      items: { id: string; text: string }[];
    };
    expect(payload.items.map(({ id }) => id)).toEqual(fields.map(({ id }) => id));
    expect(payload.items[1]?.text).toBe('I built the import tool with TypeScript.');
    expect(JSON.stringify(payload)).not.toContain('lin@example.com');
    expect(JSON.stringify(payload)).not.toContain('BrightWorks');
    expect(JSON.stringify(payload)).not.toContain('2022');
    expect(JSON.stringify(payload)).not.toContain('Personally owned');
    expect(request.messages[0]?.content).toContain('not a fact generator');
  });

  it('rejects extra claims and keeps ownership boundaries when the user adopts a suggestion', () => {
    const resume = makeResume();
    const fields = buildResumePolishFields(resume);
    const validBody = serializeSuggestions(fields, (text) => text.replace('I built', 'I created'));
    const parsed = parseResumePolishResponse(validBody, fields);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const suggestions = createResumePolishSuggestions(fields, parsed);
    const updated = applyResumePolishSuggestion(resume, suggestions[1]!);
    expect(updated.experience[0]?.highlights).toEqual([
      'Personally owned: I created the import tool with TypeScript.',
      'Shared with the team: We launched 2 migration steps.',
    ]);
    expect(updated.experience[0]?.company).toBe('BrightWorks');
    expect(resume.experience[0]?.highlights[0]).toBe(
      'Personally owned: I built the import tool with TypeScript.',
    );
    expect(resumeSchema.safeParse(updated).success).toBe(true);

    const inventedMetric = parseResumePolishResponse(
      serializeSuggestions(fields, (text) => `${text} improved output by 40%`),
      fields,
    );
    expect(inventedMetric).toEqual({ ok: false, error: 'protected_content_changed' });
  });

  it('rejects new company, education, date, and achievement claims', () => {
    const resume = makeResume();
    resume.personal.summary = 'Built reliable services using TypeScript.';
    const fields = buildResumePolishFields(resume);
    const result = parseResumePolishResponse(
      serializeSuggestions(fields, (text) =>
        text === 'Built reliable services using TypeScript.'
          ? 'Built reliable services at Acme University in 2024 and won an Innovation Award using TypeScript.'
          : text,
      ),
      fields,
    );

    expect(result).toEqual({ ok: false, error: 'protected_content_changed' });
  });

  it.each([
    ['参与系统后端开发', '独立负责整个系统架构设计'],
    ['协助完成接口优化', '主导完成接口优化'],
    ['团队共同交付订单服务', '个人独立交付整个订单服务'],
    ['负责部分模块开发', '负责整个系统'],
  ])('rejects Chinese responsibility or scope escalation: %s → %s', (original, suggested) => {
    const resume = makeResume();
    resume.personal.summary = original;
    const fields = buildResumePolishFields(resume);
    const parsed = parseResumePolishResponse(
      serializeSuggestions(fields, (text) => (text === original ? suggested : text)),
      fields,
    );

    expect(parsed).toEqual({ ok: false, error: 'responsibility_scope_changed' });
  });

  it('rejects newly quantified performance claims in Chinese and mixed-language text', () => {
    const resume = makeResume();
    resume.personal.summary = '优化 API 接口';
    const fields = buildResumePolishFields(resume);
    const parsed = parseResumePolishResponse(
      serializeSuggestions(fields, (text) =>
        text === '优化 API 接口' ? '性能提升 80%：optimized API' : text,
      ),
      fields,
    );

    expect(parsed).toEqual({ ok: false, error: 'protected_content_changed' });
  });

  it('protects Chinese-number metrics and rejects new project-scale or award claims', () => {
    const metricResume = makeResume();
    metricResume.personal.summary = '性能提升百分之八十';
    const metricFields = buildResumePolishFields(metricResume);
    const metric = parseResumePolishResponse(
      serializeSuggestions(metricFields, (text) =>
        text === metricResume.personal.summary ? '性能提升百分之九十' : text,
      ),
      metricFields,
    );
    expect(metric).toEqual({ ok: false, error: 'protected_content_changed' });

    for (const [suggestion, error] of [
      ['负责大型项目并获得一等奖', 'unsupported_claim_added'],
      ['负责千万级项目', 'protected_content_changed'],
    ] as const) {
      const resume = makeResume();
      resume.personal.summary = '负责服务开发';
      const fields = buildResumePolishFields(resume);
      const parsed = parseResumePolishResponse(
        serializeSuggestions(fields, (text) => (text === '负责服务开发' ? suggestion : text)),
        fields,
      );
      expect(parsed).toEqual({ ok: false, error });
    }
  });

  it('labels punctuation-only edits as formatting and accepts reordered wording only for human review', () => {
    const punctuationResume = makeResume();
    punctuationResume.personal.summary = '参与后端开发，交付 API。';
    const punctuationFields = buildResumePolishFields(punctuationResume);
    const punctuation = parseResumePolishResponse(
      serializeSuggestions(punctuationFields, (text) =>
        text === punctuationResume.personal.summary ? '参与后端开发；交付 API！' : text,
      ),
      punctuationFields,
    );
    expect(punctuation.ok).toBe(true);
    if (punctuation.ok) expect(punctuation.suggestions[0]?.risk).toBe('safe_formatting');

    const reorderedResume = makeResume();
    reorderedResume.personal.summary = 'Developed services using TypeScript.';
    const reorderedFields = buildResumePolishFields(reorderedResume);
    const reordered = parseResumePolishResponse(
      serializeSuggestions(reorderedFields, (text) =>
        text === reorderedResume.personal.summary ? 'TypeScript services were developed.' : text,
      ),
      reorderedFields,
    );
    expect(reordered.ok, JSON.stringify(reordered)).toBe(true);
    if (reordered.ok) expect(reordered.suggestions[0]?.risk).toBe('needs_review');

    const mixedResume = makeResume();
    mixedResume.personal.summary = '参与 TypeScript 服务开发。';
    const mixedFields = buildResumePolishFields(mixedResume);
    const mixed = parseResumePolishResponse(
      serializeSuggestions(mixedFields, (text) =>
        text === mixedResume.personal.summary ? '参与 TypeScript 服务交付。' : text,
      ),
      mixedFields,
    );
    expect(mixed.ok).toBe(true);
    if (mixed.ok) expect(mixed.suggestions[0]?.risk).toBe('needs_review');

    const chineseResume = makeResume();
    chineseResume.personal.summary = '参与后端开发';
    const chineseFields = buildResumePolishFields(chineseResume);
    const chinese = parseResumePolishResponse(
      serializeSuggestions(chineseFields, (text) =>
        text === chineseResume.personal.summary ? '协助建设后端服务' : text,
      ),
      chineseFields,
    );
    expect(chinese.ok).toBe(true);
    if (chinese.ok) expect(chinese.suggestions[0]?.risk).toBe('needs_review');
  });

  it('keeps the original Chinese personal-ownership prefix outside model-controlled text', () => {
    const resume = makeResume();
    resume.experience[0]!.highlights = ['个人负责：设计设备采集服务'];
    const fields = buildResumePolishFields(resume);
    const request = buildResumePolishRequest(fields, 'zh-CN');
    const ownershipField = fields.find((field) => field.id.includes('experience:'));
    expect(request.ok).toBe(true);
    expect(ownershipField?.fixedPrefix).toBe('个人负责：');
    expect(ownershipField?.requestText).toBe('设计设备采集服务');
    if (!request.ok) return;

    const parsed = parseResumePolishResponse(
      serializeSuggestions(fields, (text) =>
        text === ownershipField?.requestText ? text.replace('设计', '开发') : text,
      ),
      fields,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const suggestion = createResumePolishSuggestions(fields, parsed).find((item) =>
      item.id.includes('experience:'),
    )!;
    const updated = applyResumePolishSuggestion(resume, suggestion);
    expect(updated.experience[0]?.highlights).toEqual(['个人负责：开发设备采集服务']);
  });

  it('rejects changed technical terms, item order, omitted items, and non-strict response shapes', () => {
    const fields = buildResumePolishFields(makeResume());
    const wrongTechnicalTerm = parseResumePolishResponse(
      serializeSuggestions(fields, (text) => text.replace('TypeScript', 'Python')),
      fields,
    );
    expect(wrongTechnicalTerm).toEqual({ ok: false, error: 'protected_content_changed' });

    const parsed = JSON.parse(serializeSuggestions(fields, (text) => text)) as {
      suggestions: { id: string; text: string }[];
    };
    parsed.suggestions.reverse();
    expect(parseResumePolishResponse(JSON.stringify(parsed), fields)).toEqual({
      ok: false,
      error: 'item_mismatch',
    });
    expect(
      parseResumePolishResponse(JSON.stringify({ suggestions: [], extra: true }), fields),
    ).toEqual({ ok: false, error: 'invalid_schema' });

    const valid = JSON.parse(serializeSuggestions(fields, (text) => text)) as {
      suggestions: { id: string; text: string }[];
    };
    valid.suggestions[1]!.id = valid.suggestions[0]!.id;
    expect(parseResumePolishResponse(JSON.stringify(valid), fields)).toEqual({
      ok: false,
      error: 'item_mismatch',
    });
    expect(
      parseResumePolishResponse(
        JSON.stringify({ suggestions: valid.suggestions.slice(0, -1) }),
        fields,
      ),
    ).toEqual({ ok: false, error: 'item_mismatch' });
    expect(
      parseResumePolishResponse(
        serializeSuggestions(fields, (text) => text + 'x'.repeat(30_001)),
        fields,
      ),
    ).toEqual({ ok: false, error: 'invalid_schema' });
  });

  it('refuses line breaks in single-line resume highlights', () => {
    const fields = buildResumePolishFields(makeResume());
    const body = serializeSuggestions(fields, (text) => text);
    const parsed = JSON.parse(body) as { suggestions: { id: string; text: string }[] };
    parsed.suggestions[1]!.text = 'I built the import tool with TypeScript.\nAnd more.';
    expect(parseResumePolishResponse(JSON.stringify(parsed), fields)).toEqual({
      ok: false,
      error: 'invalid_text',
    });
  });

  it('keeps non-narrative fields out and reports empty or oversized request sets', () => {
    const resume = createEmptyResume();
    expect(buildResumePolishFields(resume)).toEqual([]);
    expect(buildResumePolishRequest([], 'zh-CN')).toEqual({ ok: false, error: 'no_text' });

    const fields = buildResumePolishFields({
      ...resume,
      personal: { ...resume.personal, summary: 'x'.repeat(12_001) },
    });
    expect(buildResumePolishRequest(fields, 'zh-CN')).toEqual({
      ok: false,
      error: 'input_too_long',
    });
  });
});
