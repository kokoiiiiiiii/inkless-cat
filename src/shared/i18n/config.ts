export type Locale = 'zh-CN' | 'en';

export const LOCALE_KEY = 'inkless-cat-locale';

export const DEFAULT_LOCALE: Locale = 'zh-CN';

export const resolveStoredLocale = (value: string | null | undefined): Locale =>
  value === 'en' ? 'en' : DEFAULT_LOCALE;

export const resolveInitialLocale = (): Locale =>
  resolveStoredLocale(globalThis?.localStorage?.getItem(LOCALE_KEY));
