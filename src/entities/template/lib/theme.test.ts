import { describe, expect, it } from 'vitest';

import { DEFAULT_TEMPLATE_THEME, resolveCustomTemplateTheme } from './theme';

describe('resolveCustomTemplateTheme', () => {
  it('fills missing values while preserving valid custom colors', () => {
    expect(resolveCustomTemplateTheme({ accent: '#aabbcc', heading: '#123456' })).toEqual({
      ...DEFAULT_TEMPLATE_THEME,
      accent: '#aabbcc',
      heading: '#123456',
    });
  });

  it('uses the complete safe palette when a saved theme contains an invalid color', () => {
    expect(
      resolveCustomTemplateTheme({ accent: '#aabbcc', heading: 'url(javascript:alert(1))' }),
    ).toEqual(DEFAULT_TEMPLATE_THEME);
  });

  it('uses defaults when the theme is missing or has the wrong shape', () => {
    expect(resolveCustomTemplateTheme(null)).toEqual(DEFAULT_TEMPLATE_THEME);
    expect(resolveCustomTemplateTheme('custom')).toEqual(DEFAULT_TEMPLATE_THEME);
  });
});
