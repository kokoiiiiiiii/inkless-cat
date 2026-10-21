import { createEmptyResume } from '@entities/resume';
import { LOCALE_KEY } from '@shared/i18n/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resumeTemplateInputSchema } from '../schema/template';
import { migrateTemplate } from './template';

const createLegacyTemplate = (name: string) => {
  const sample = createEmptyResume();
  sample.personal.fullName = 'Synthetic saved sample';
  return {
    id: 'custom-legacy-name',
    name,
    description: 'Keep this template intact.',
    accentColor: '#6d28d9',
    previewStyle: 'custom',
    theme: { accent: '#6d28d9', background: '#fffaf0', heading: '#312e81' },
    sample,
  };
};

describe('migrateTemplate', () => {
  beforeEach(() => localStorage.removeItem(LOCALE_KEY));
  afterEach(() => localStorage.removeItem(LOCALE_KEY));

  it.each(['', '   '])(
    'restores legacy blank names without discarding template data (%j)',
    (name) => {
      const input = createLegacyTemplate(name);

      expect(resumeTemplateInputSchema.safeParse(input).success).toBe(name === '   ');

      const result = migrateTemplate(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toMatchObject({
        id: input.id,
        name: '未命名模板',
        description: input.description,
        accentColor: input.accentColor,
        previewStyle: input.previewStyle,
        theme: input.theme,
        sample: input.sample,
      });
    },
  );

  it('uses a localized fallback name for recovered English data', () => {
    localStorage.setItem(LOCALE_KEY, 'en');

    const result = migrateTemplate(createLegacyTemplate(''));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Unnamed template');
  });

  it('keeps valid template names unchanged', () => {
    const result = migrateTemplate(createLegacyTemplate('Keep My Name'));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Keep My Name');
  });
});
