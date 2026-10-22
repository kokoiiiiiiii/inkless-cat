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
