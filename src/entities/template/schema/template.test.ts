import { createEmptyResume } from '@entities/resume';
import { describe, expect, it } from 'vitest';

import { resumeTemplateInputSchema } from './template';

const createTemplate = (theme: unknown) => ({
  id: 'custom',
  name: 'Custom',
  accentColor: '#2563eb',
  theme,
  sample: createEmptyResume(),
});

describe('custom template input validation', () => {
  it('accepts picker-compatible hexadecimal colors', () => {
    expect(
      resumeTemplateInputSchema.safeParse(createTemplate({ accent: '#2563eb', background: '#fff' }))
        .success,
    ).toBe(true);
  });

  it('rejects CSS values that can load external resources', () => {
    expect(
      resumeTemplateInputSchema.safeParse(
        createTemplate({ background: 'url(https://example.com/image.png)' }),
      ).success,
    ).toBe(false);
  });
});
