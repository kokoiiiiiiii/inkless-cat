import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import en from './locales/en/index';
import zhCN from './locales/zh-CN/index';

export type Locale = 'zh-CN' | 'en';

const LOCALE_KEY = 'inkless-cat-locale';
const DEV = import.meta?.env?.DEV ?? false;

const DIR_MAP: Record<Locale, 'ltr' | 'rtl'> = { 'zh-CN': 'ltr', en: 'ltr' };

const baseDict = { 'zh-CN': zhCN, en } as const;

type Dict = Record<string, unknown>;
type DictMap = Record<Locale, Dict>;

type Interpolations = Record<string, string | number | boolean>;

const interpolate = (tpl: string, vars?: Interpolations) =>
  typeof vars === 'object'
    ? tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`))
    : tpl;

const getByPath = (obj: unknown, path: string) =>
  path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    obj,
  );

const deepMerge = (target: Dict, source: Dict): Dict => {
  const out: Dict = Array.isArray(target) ? [...(target as unknown[])] : { ...target };
  for (const [k, v] of Object.entries(source)) {
    const tv = (out as Record<string, unknown>)[k];
    (out as Record<string, unknown>)[k] =
      tv && typeof tv === 'object' && v && typeof v === 'object' ? deepMerge(tv as Dict, v as Dict) : v;
  }
  return out;
};

type Join<K, P> = K extends string | number ? (P extends string | number ? `${K}.${P}` : never) : never;
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export type Paths<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends object ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : `${K}`;
      }[keyof T & (string | number)]
    : never;

export type TranslationKey = Paths<typeof zhCN> | Paths<typeof en>;

const dynamicLoaders: Record<Locale, (() => Promise<{ default: Dict }>) | undefined> = {
  'zh-CN': undefined,
  en: undefined,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey | string, vars?: Interpolations) => string;
  register: (ns: string, resources: Partial<Record<Locale, Dict>>) => void;
  format: {
    date: (value: Date | number | string, opts?: Intl.DateTimeFormatOptions) => string;
    number: (value: number, opts?: Intl.NumberFormatOptions) => string;
    currency: (value: number, currency?: string, opts?: Intl.NumberFormatOptions) => string;
    plural: (count: number, forms: { one: string; other: string }) => string;
  };
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = (globalThis?.localStorage?.getItem(LOCALE_KEY) as Locale | null) || 'zh-CN';
    return saved === 'en' ? 'en' : 'zh-CN';
  });

  const dictRef = useRef<DictMap>({ 'zh-CN': baseDict['zh-CN'], en: baseDict.en });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
      document.documentElement.dir = DIR_MAP[locale] || 'ltr';
    }
  }, [locale]);

  useEffect(() => {
    const loader = dynamicLoaders[locale];
    if (!loader) return;
    let mounted = true;
    loader()
      .then((mod) => {
        if (!mounted) return;
        dictRef.current[locale] = deepMerge(dictRef.current[locale], mod.default || {});
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      globalThis?.localStorage?.setItem(LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Interpolations) => {
      const raw = getByPath(dictRef.current[locale], key);
      if (raw === undefined && DEV) {
        console.warn(`[i18n] Missing key: ${key} in ${locale}`);
      }
      const str = typeof raw === 'string' ? raw : key;
      return interpolate(str, vars);
    },
    [locale],
  );

  const register = useCallback((ns: string, resources: Partial<Record<Locale, Dict>>) => {
    for (const [loc, table] of Object.entries(resources)) {
      const localeKey = loc as Locale;
      if (!table) continue;
      const current = dictRef.current[localeKey] || {};
      dictRef.current[localeKey] = deepMerge(current, { [ns]: table });
    }
  }, []);

  const format = useMemo(
    () => ({
      date: (value: Date | number | string, opts?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit', ...opts }).format(
          value instanceof Date ? value : new Date(value),
        ),
      number: (value: number, opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, opts).format(value),
      currency: (value: number, currency = locale === 'zh-CN' ? 'CNY' : 'USD', opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency, ...opts }).format(value),
      plural: (count: number, forms: { one: string; other: string }) => (count === 1 ? forms.one : forms.other),
    }),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, register, format }),
    [locale, setLocale, t, register, format],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
};
