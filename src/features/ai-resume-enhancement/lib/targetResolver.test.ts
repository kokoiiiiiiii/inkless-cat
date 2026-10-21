import { createEmptyResume } from '@entities/resume';
import { describe, expect, it } from 'vitest';

import {
  areEnhancementValuesEqual,
  readEnhancementTarget,
  writeEnhancementTarget,
} from './targetResolver';

const createResume = () => {
  const resume = createEmptyResume();
  resume.personal.summary = 'Summary';
  resume.experience = [
    { id: 'exp-a', company: 'A', role: 'Engineer', highlights: ['one', 'two'] },
    { id: 'exp-b', company: 'B', role: 'Lead', highlights: ['other'] },
  ];
  resume.projects = [
    { id: 'project-a', name: 'Alpha', summary: 'Alpha summary', highlights: [] },
    { id: 'project-b', name: 'Beta', summary: 'Beta summary', highlights: [] },
  ];
  return resume;
};

describe('readEnhancementTarget and writeEnhancementTarget', () => {
  it('reads and writes only the personal summary', () => {
    const resume = createResume();
    const target = { kind: 'personal-summary' } as const;

    expect(readEnhancementTarget(resume, target)).toEqual({ status: 'found', value: 'Summary' });
    expect(writeEnhancementTarget(resume, target, 'Edited summary')).toBe(true);
    expect(resume.personal.summary).toBe('Edited summary');
    expect(resume.experience[0]?.highlights).toEqual(['one', 'two']);
    expect(writeEnhancementTarget(resume, target, ['wrong type'])).toBe(false);
  });

  it('locates an experience by its ID after array order changes', () => {
    const resume = createResume();
    const target = { kind: 'experience-highlights', itemId: 'exp-a' } as const;
    resume.experience.reverse();

    expect(readEnhancementTarget(resume, target)).toEqual({
      status: 'found',
      value: ['one', 'two'],
    });
    expect(writeEnhancementTarget(resume, target, ['first', 'second'])).toBe(true);
    expect(resume.experience.find((item) => item.id === 'exp-a')?.highlights).toEqual([
      'first',
      'second',
    ]);
    expect(resume.experience.find((item) => item.id === 'exp-b')?.highlights).toEqual(['other']);
  });

  it('locates a project by ID and refuses missing or duplicate identities', () => {
    const resume = createResume();
    const target = { kind: 'project-summary', itemId: 'project-b' } as const;

    expect(readEnhancementTarget(resume, target)).toEqual({
      status: 'found',
      value: 'Beta summary',
    });
    expect(writeEnhancementTarget(resume, target, 'Improved beta')).toBe(true);
    expect(resume.projects[0]?.summary).toBe('Alpha summary');
    resume.projects = resume.projects.filter((item) => item.id !== 'project-b');
    expect(readEnhancementTarget(resume, target)).toEqual({ status: 'missing' });
    expect(writeEnhancementTarget(resume, target, 'must not write')).toBe(false);

    resume.projects.push({ ...resume.projects[0]!, id: 'project-a' });
    expect(readEnhancementTarget(resume, { kind: 'project-summary', itemId: 'project-a' })).toEqual(
      {
        status: 'missing',
      },
    );
  });

  it('compares array snapshots including item count and order', () => {
    expect(areEnhancementValuesEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(areEnhancementValuesEqual(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(areEnhancementValuesEqual(['a'], ['a', 'b'])).toBe(false);
  });
});
