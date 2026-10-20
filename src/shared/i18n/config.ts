import { getLocalStorage } from '@shared/lib/storage';

export type Locale = 'zh-CN' | 'en';

export const LOCALE_KEY = 'inkless-cat-locale';

export const DEFAULT_LOCALE: Locale = 'zh-CN';

export const resolveStoredLocale = (value: string | null | undefined): Locale =>
  value === 'en' ? 'en' : DEFAULT_LOCALE;

export const resolveInitialLocale = (): Locale => {
  try {
    return resolveStoredLocale(getLocalStorage()?.getItem(LOCALE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
};
