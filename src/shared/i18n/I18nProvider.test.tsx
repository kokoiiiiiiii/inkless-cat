import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider, useI18n } from './I18nProvider';

const LocaleProbe = () => {
  const { locale, setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}>
      {locale}
    </button>
  );
};

describe('I18nProvider isolated locale mode', () => {
  it('honors an explicit locale without reading or writing browser storage when persistence is off', () => {
    const getItem = vi.spyOn(localStorage, 'getItem');
    const setItem = vi.spyOn(localStorage, 'setItem');

    render(
      <I18nProvider initialLocale="en" persistLocale={false}>
        <LocaleProbe />
      </I18nProvider>,
    );

    expect(screen.getByRole('button').textContent).toBe('en');
    expect(getItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('zh-CN');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('retains persisted preference behavior by default', () => {
    localStorage.setItem('inkless-cat-locale', 'en');
    const getItem = vi.spyOn(localStorage, 'getItem');
    const setItem = vi.spyOn(localStorage, 'setItem');

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('en');
    expect(getItem).toHaveBeenCalledWith('inkless-cat-locale');

    fireEvent.click(screen.getByRole('button'));
    expect(setItem).toHaveBeenLastCalledWith('inkless-cat-locale', 'zh-CN');
  });
});
