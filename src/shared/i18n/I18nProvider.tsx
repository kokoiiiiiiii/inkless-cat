import { getLocalStorage } from '@shared/lib/storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DEFAULT_LOCALE, type Locale, LOCALE_KEY, resolveStoredLocale } from './config';
import { aiEnhancement as enAIEnhancement } from './locales/en/aiEnhancement';
import { aiInterview as enAIInterview } from './locales/en/aiInterview';
import { aiProvider as enAIProvider } from './locales/en/aiProvider';
import en from './locales/en/index';
import { aiEnhancement as zhCNAIEnhancement } from './locales/zh-CN/aiEnhancement';
import { aiInterview as zhCNInterview } from './locales/zh-CN/aiInterview';
import { aiProvider as zhCNAIProvider } from './locales/zh-CN/aiProvider';
import zhCN from './locales/zh-CN/index';

const DEV = import.meta?.env?.DEV ?? false;

const DIR_MAP: Record<Locale, 'ltr' | 'rtl'> = { 'zh-CN': 'ltr', en: 'ltr' };

const baseDict = { 'zh-CN': zhCN, en } as const;

type Dict = Record<string, unknown> | unknown[];
type DictMap = Record<Locale, Dict>;

type Interpolations = Record<string, string | number | boolean>;

const createInitialDictionary = (): DictMap => {
  if (import.meta.env.MODE === 'test') {
    return {
      'zh-CN': {
        ...baseDict['zh-CN'],
        aiInterview: zhCNInterview,
        aiEnhancement: zhCNAIEnhancement,
        aiProvider: zhCNAIProvider,
      },
      en: {
        ...baseDict.en,
        aiInterview: enAIInterview,
        aiEnhancement: enAIEnhancement,
        aiProvider: enAIProvider,
      },
    };
  }
  return { 'zh-CN': baseDict['zh-CN'], en: baseDict.en };
};

const interpolate = (tpl: string, vars?: Interpolations) =>
  typeof vars === 'object'
    ? tpl.replaceAll(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`))
    : tpl;

const getByPath = (obj: unknown, path: string) => {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object') {
      return;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const deepMerge = (target: Dict, source: Dict): Dict => {
  const out: Dict = Array.isArray(target) ? [...target] : { ...target };
  for (const [k, v] of Object.entries(source)) {
    const tv = (out as Record<string, unknown>)[k];
    (out as Record<string, unknown>)[k] =
      tv && typeof tv === 'object' && v && typeof v === 'object'
        ? deepMerge(tv as Dict, v as Dict)
        : v;
  }
  return out;
};

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export type Paths<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends object
          ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
          : `${K}`;
      }[keyof T & (string | number)]
    : never;

export type TranslationKey = Paths<
  typeof zhCN & {
    aiInterview: typeof import('./locales/zh-CN/aiInterview').aiInterview;
    aiEnhancement: typeof import('./locales/zh-CN/aiEnhancement').aiEnhancement;
    aiProvider: typeof import('./locales/zh-CN/aiProvider').aiProvider;
  }
>;

type LazyNamespace = 'aiInterview' | 'aiEnhancement' | 'aiProvider';

type I18nContextValue = {
  locale: Locale;
  dictionaryRevision: number;
  setLocale: (next: Locale) => void;
  t: <K extends string>(key: TranslationKey | K, vars?: Interpolations) => string;
  register: (ns: string, resources: Partial<Record<Locale, Dict>>) => void;
  loadAIInterviewTranslations: () => Promise<void>;
  loadAIEnhancementTranslations: () => Promise<void>;
  loadAIProviderTranslations: () => Promise<void>;
  format: {
    date: (value: Date | number | string, opts?: Intl.DateTimeFormatOptions) => string;
    number: (value: number, opts?: Intl.NumberFormatOptions) => string;
    currency: (value: number, currency?: string, opts?: Intl.NumberFormatOptions) => string;
    plural: (count: number, forms: { one: string; other: string }) => string;
  };
};

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
  persistLocale?: boolean;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({
  children,
  initialLocale,
  persistLocale = true,
}: I18nProviderProps) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    try {
      const saved = getLocalStorage()?.getItem(LOCALE_KEY);
      return resolveStoredLocale(saved ?? DEFAULT_LOCALE);
    } catch {
      return DEFAULT_LOCALE;
    }
  });

  const dictRef = useRef<DictMap>(createInitialDictionary());
  const namespaceLoadsRef = useRef(new Map<string, Promise<void>>());
  const [dictionaryRevision, setDictionaryRevision] = useState(0);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
      document.documentElement.dir = DIR_MAP[locale] || 'ltr';
    }
  }, [locale]);

  const loadNamespace = useCallback(
    (namespace: LazyNamespace) => {
      const key = `${locale}:${namespace}`;
      const existing = namespaceLoadsRef.current.get(key);
      if (existing) return existing;
      const promise = (async () => {
        let namespaceDict: Dict;
        if (namespace === 'aiInterview') {
          const module =
            locale === 'en'
              ? await import('./locales/en/aiInterview')
              : await import('./locales/zh-CN/aiInterview');
          namespaceDict = module.aiInterview;
        } else if (namespace === 'aiEnhancement') {
          const module =
            locale === 'en'
              ? await import('./locales/en/aiEnhancement')
              : await import('./locales/zh-CN/aiEnhancement');
          namespaceDict = module.aiEnhancement;
        } else {
          const module =
            locale === 'en'
              ? await import('./locales/en/aiProvider')
              : await import('./locales/zh-CN/aiProvider');
          namespaceDict = module.aiProvider;
        }
        dictRef.current[locale] = deepMerge(dictRef.current[locale], {
          [namespace]: namespaceDict,
        });
        setDictionaryRevision((revision) => revision + 1);
      })().catch((error: unknown) => {
        namespaceLoadsRef.current.delete(key);
        throw error;
      });
      namespaceLoadsRef.current.set(key, promise);
      return promise;
    },
    [locale],
  );
  const loadAIInterviewTranslations = useCallback(
    () => loadNamespace('aiInterview'),
    [loadNamespace],
  );
  const loadAIEnhancementTranslations = useCallback(
    () => loadNamespace('aiEnhancement'),
    [loadNamespace],
  );
  const loadAIProviderTranslations = useCallback(
    () => loadNamespace('aiProvider'),
    [loadNamespace],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (!persistLocale) return;
      try {
        getLocalStorage()?.setItem(LOCALE_KEY, next);
      } catch {
        // UI language still switches for this session if browser storage is unavailable.
      }
    },
    [persistLocale],
  );

  const t = useCallback(
    <K extends string>(key: TranslationKey | K, vars?: Interpolations) => {
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
        new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          ...opts,
        }).format(value instanceof Date ? value : new Date(value)),
      number: (value: number, opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, opts).format(value),
      currency: (
        value: number,
        currency = locale === 'zh-CN' ? 'CNY' : 'USD',
        opts?: Intl.NumberFormatOptions,
      ) => new Intl.NumberFormat(locale, { style: 'currency', currency, ...opts }).format(value),
      plural: (count: number, forms: { one: string; other: string }) =>
        count === 1 ? forms.one : forms.other,
    }),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dictionaryRevision,
      setLocale,
      t,
      register,
      loadAIInterviewTranslations,
      loadAIEnhancementTranslations,
      loadAIProviderTranslations,
      format,
    }),
    [
      locale,
      dictionaryRevision,
      setLocale,
      t,
      register,
      loadAIInterviewTranslations,
      loadAIEnhancementTranslations,
      loadAIProviderTranslations,
      format,
    ],
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
